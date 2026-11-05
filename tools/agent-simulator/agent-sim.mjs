#!/usr/bin/env node
/**
 * محاكي وكيل العتاد المحلي — مجمع الرحمة (للتطوير واختبار E2E فقط).
 * ينفذ عقد القسم 16 كاملاً كما سينفذه الوكيل الحقيقي، لكن بدل الطابعة يحفظ كل إيصال/تذكرة كملف HTML في ./out
 * وبدل الدرج يسجل الفتح في السجل والأحداث.
 *
 * التشغيل:  node agent-sim.mjs
 * متغيرات اختيارية:
 *   AGENT_PORT=9443                     المنفذ (http، لأن الواجهة في التطوير على http://localhost:3000)
 *   API_URL=http://localhost:8088       لجلب المفتاح العام من /api/v1/agent/drawer-public-key
 *   AGENT_KEY=...                       إن ضُبط يُشترط X-Agent-Key مطابق (بدونه يُقبل أي طلب من الأصل المسموح)
 *   AGENT_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
 *   PRINTER=offline | paper_out         لمحاكاة أعطال الطابعة
 * بدون مكتبات خارجية (Node 18+).
 */
import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(DIR, "out");
const STATE_FILE = path.join(DIR, "state.json");
const PORT = Number(process.env.AGENT_PORT ?? 9443);
const API_URL = (process.env.API_URL ?? "http://localhost:8088").replace(/\/$/, "");
const AGENT_KEY = process.env.AGENT_KEY ?? "";
const ORIGINS = (process.env.AGENT_ORIGINS ?? "http://localhost:3000,http://127.0.0.1:3000").split(",").map((s) => s.trim());
const PRINTER = process.env.PRINTER ?? "ok";
const VERSION = "sim-1.0.0";

fs.mkdirSync(OUT, { recursive: true });

// ------------------------------------------------------------------ الحالة (تبقى بعد إعادة التشغيل مثل الوكيل الحقيقي)
const state = load();
function load() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, "utf8")); }
  catch { return { block: null, last_used: null, events: [], next_event_id: 1, used_jti: [] }; }
}
function save() { fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2)); }
function addEvent(type, receipt_number = null) {
  const e = { local_event_id: state.next_event_id++, type, receipt_number, occurred_at: new Date().toISOString() };
  state.events.push(e);
  save();
  log(`حدث ${e.local_event_id}: ${type}${receipt_number ? ` (${receipt_number})` : ""}`);
}

// ------------------------------------------------------------------ المفتاح العام
let publicKey = null, publicKeyId = null;
async function refreshKey() {
  try {
    const r = await fetch(`${API_URL}/api/v1/agent/drawer-public-key`);
    const b = await r.json();
    publicKey = crypto.createPublicKey(b.public_key_pem);
    if (publicKeyId && publicKeyId !== b.key_id) log(`تغيّر مفتاح الخادم: ${publicKeyId} ← ${b.key_id}`);
    publicKeyId = b.key_id ?? null;
    state.public_key_pem = b.public_key_pem; state.public_key_id = publicKeyId; save();
  } catch (e) {
    // أوفلاين: نستخدم آخر مفتاح محفوظ
    if (!publicKey && state.public_key_pem) { publicKey = crypto.createPublicKey(state.public_key_pem); publicKeyId = state.public_key_id ?? null; }
    log(`تعذر جلب المفتاح العام من ${API_URL} (${e.message})${publicKey ? "، أستخدم المحفوظ" : ""}`);
  }
}

// ------------------------------------------------------------------ التحقق
const b64url = (s) => Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
/** توكن الدرج: JWT ES256 من الخادم، aud = alrahma-agent، عمره 60 ثانية، لا يُستخدم مرتين. */
function verifyDrawerToken(token, receiptNumber) {
  if (!publicKey) return "لا يوجد مفتاح عام بعد";
  const parts = String(token).split(".");
  if (parts.length !== 3) return "صيغة التوكن";
  const header = JSON.parse(b64url(parts[0]).toString());
  if (header.alg !== "ES256") return "الخوارزمية";
  const ok = crypto.verify("sha256", Buffer.from(`${parts[0]}.${parts[1]}`), { key: publicKey, dsaEncoding: "ieee-p1363" }, b64url(parts[2]));
  if (!ok) return "التوقيع";
  const c = JSON.parse(b64url(parts[1]).toString());
  const now = Math.floor(Date.now() / 1000);
  const aud = Array.isArray(c.aud) ? c.aud : [c.aud];
  if (!aud.includes("alrahma-agent")) return "الجمهور (aud)";
  if (c.drawer !== "open") return "drawer != open";
  if (typeof c.exp !== "number" || c.exp + 5 < now) return "انتهت صلاحيته";
  if (receiptNumber && c.receipt_number !== receiptNumber) return `رقم الإيصال ${c.receipt_number} لا يطابق ${receiptNumber}`;
  if (c.device_id && state.block?.device_id && c.device_id !== state.block.device_id) return "التوكن لجهاز آخر";
  if (c.jti && state.used_jti.includes(c.jti)) return "استُخدم من قبل";
  if (c.jti) { state.used_jti = [...state.used_jti.slice(-200), c.jti]; }
  return null;
}
function verifyBlock(b) {
  if (!publicKey) return "لا يوجد مفتاح عام بعد";
  const data = `${b.block_id}|${b.device_id}|${b.prefix}|${b.from}|${b.to}`;
  try {
    return crypto.verify("sha256", Buffer.from(data), { key: publicKey, dsaEncoding: "der" }, Buffer.from(b.signature, "base64")) ? null : "التوقيع";
  } catch { return "التوقيع"; }
}
/** رقم الإيصال من الكتلة: البادئة + رقم ضمن [from, to]. */
function blockNumber(receiptNumber) {
  const b = state.block;
  if (!b || !receiptNumber || !String(receiptNumber).startsWith(b.prefix)) return null;
  const n = Number(String(receiptNumber).slice(b.prefix.length));
  return Number.isInteger(n) && n >= b.from && n <= b.to ? n : null;
}

// ------------------------------------------------------------------ «الطباعة»
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function writeOut(kind, name, body) {
  const file = path.join(OUT, `${new Date().toISOString().replace(/[:.]/g, "-")}_${kind}_${String(name).replace(/[^\w-]/g, "_")}.html`);
  fs.writeFileSync(file, `<!doctype html><html dir="rtl" lang="ar"><meta charset="utf-8"><title>${esc(kind)} ${esc(name)}</title>
<body style="font:14px/1.7 Tahoma,sans-serif;width:72mm;margin:12px auto;border:1px dashed #999;padding:10px">${body}</body></html>`);
  return path.relative(DIR, file);
}
function receiptHtml(p) {
  const n = (v) => (typeof v === "number" ? Math.trunc(v).toLocaleString("en-US") : esc(v));
  const rows = (a, f) => (Array.isArray(a) ? a.map(f).join("") : "");
  return `<h3 style="text-align:center;margin:0">${esc(p.branch_name ?? "مجمع الرحمة الطبي")}</h3>
<div style="text-align:center">${esc(p.type_ar ?? "")}${p.is_copy ? ` · نسخة ${n(p.copy_number)}` : ""}<br><b>${esc(p.receipt_number)}</b></div><hr>
<div>${esc(p.patient_name ?? "")} ${esc(p.file_number ?? "")}</div>${p.doctor_name || p.clinic_name || p.ticket_number ? `<div>${esc([p.clinic_name, p.doctor_name].filter(Boolean).join(" · "))}${p.ticket_number ? ` · دور ${esc(p.ticket_number)}` : ""}</div>` : ""}<div>${esc(p.cashier_name ?? "")} · ${esc(p.issued_at ?? "")}</div><hr>
${rows(p.lines, (l) => `<div style="display:flex;justify-content:space-between"><span>${esc(l.text)}${!p.doctor_name && l.doctor_name ? ` · ${esc(l.doctor_name)}` : ""}</span><span>${n(l.amount)}</span></div>`)}<hr>
<div style="display:flex;justify-content:space-between;font-weight:700"><span>المجموع</span><span>${n(p.total)}</span></div>
${rows(p.tenders, (t) => `<div style="display:flex;justify-content:space-between"><span>${esc(t.method)}</span><span>${n(t.amount)}</span></div>`)}
${p.qr_code ? `<div style="font-size:10px;word-break:break-all;text-align:center">${esc(p.qr_code)}</div>` : ""}`;
}

// ------------------------------------------------------------------ الخادم
const fail = (res, status, code, title) => send(res, status, { type: "about:blank", status, code, title });
function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(body === undefined ? "" : JSON.stringify(body));
}
function readJson(req) {
  return new Promise((resolve) => {
    let s = "";
    req.on("data", (c) => { s += c; if (s.length > 2_000_000) req.destroy(); });
    req.on("end", () => { try { resolve(s ? JSON.parse(s) : {}); } catch { resolve(null); } });
  });
}
function log(m) { console.log(`[${new Date().toLocaleTimeString("en-GB")}] ${m}`); }

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  if (origin) {
    if (!ORIGINS.includes(origin)) return fail(res, 403, "ORIGIN_NOT_ALLOWED", `الأصل ${origin} غير مسموح`);
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Agent-Key");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Private-Network", "true");
  }
  if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }
  if (AGENT_KEY && req.headers["x-agent-key"] !== AGENT_KEY) return fail(res, 401, "INVALID_AGENT_KEY", "مفتاح الوكيل غير صحيح");

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const route = `${req.method} ${url.pathname}`;
  try {
    switch (route) {
      case "GET /status":
        return send(res, 200, {
          agent_version: VERSION,
          device_id: state.block?.device_code ?? "unbound",
          printer: { connected: PRINTER !== "offline", model: "Simulator (HTML files)", paper: PRINTER === "paper_out" ? "out" : "ok" },
          drawer: { connected: true, state: "closed" },
          pending_events: state.events.length,
          receipt_block: state.block ? { ...state.block, last_used: state.last_used } : null,
          public_key_id: publicKeyId,
        });

      case "POST /receipt-block": {
        const body = await readJson(req);
        if (!body) return fail(res, 400, "VALIDATION_ERROR", "JSON غير صالح");
        if (body.block === null) { state.block = null; state.last_used = null; save(); log("أُزيلت الكتلة"); return send(res, 200, { accepted: true }); }
        const b = body.block;
        if (!b?.block_id || !b.prefix || !Number.isInteger(b.from) || !Number.isInteger(b.to) || !b.signature || !b.device_id)
          return fail(res, 400, "VALIDATION_ERROR", "الكتلة ناقصة");
        if (!publicKey) await refreshKey();
        const why = verifyBlock(b);
        if (why) return fail(res, 403, "INVALID_BLOCK_SIGNATURE", `توقيع الكتلة غير صالح: ${why}`);
        if (state.block?.block_id !== b.block_id) state.last_used = null;
        state.block = { block_id: b.block_id, prefix: b.prefix, from: b.from, to: b.to, signature: b.signature, device_id: b.device_id, device_code: b.device_code ?? null };
        save();
        log(`استُلمت الكتلة ${b.prefix}${b.from}–${b.to} للجهاز ${b.device_code ?? b.device_id}`);
        return send(res, 200, { accepted: true });
      }

      case "POST /print/receipt": {
        const body = await readJson(req);
        const p = body?.print_payload;
        if (!p || !p.receipt_number) return fail(res, 400, "VALIDATION_ERROR", "print_payload.receipt_number مطلوب");
        // التحقق قبل الطباعة: لا درج بدون إذن صالح
        if (body.open_drawer) {
          if (body.drawer_token) {
            if (!publicKey) await refreshKey();
            const why = verifyDrawerToken(body.drawer_token, p.receipt_number);
            if (why) { log(`رُفض توكن الدرج: ${why}`); return fail(res, 403, "INVALID_DRAWER_TOKEN", `توكن الدرج غير صالح: ${why}`); }
          } else if (blockNumber(p.receipt_number) === null) {
            return fail(res, 403, "RECEIPT_NUMBER_NOT_IN_BLOCK", "رقم الإيصال ليس من كتلة هذا الجهاز");
          }
        }
        if (PRINTER === "offline") { addEvent("printer.error", p.receipt_number); return fail(res, 409, "PRINTER_OFFLINE", "الطابعة غير متصلة"); }
        if (PRINTER === "paper_out") { addEvent("paper.out", p.receipt_number); return fail(res, 409, "PAPER_OUT", "نفد الورق"); }
        const file = writeOut(p.is_copy ? "copy" : "receipt", p.receipt_number, receiptHtml(p));
        const n = blockNumber(p.receipt_number);
        if (n !== null && (state.last_used ?? 0) < n) state.last_used = n;
        addEvent("receipt.printed", p.receipt_number);
        if (body.open_drawer) { addEvent("drawer.opened", p.receipt_number); log(`>>> فُتح الدرج للإيصال ${p.receipt_number}`); }
        log(`طُبع ${p.receipt_number} ← ${file}`);
        return send(res, 200, { printed: true, drawer_opened: !!body.open_drawer });
      }

      case "POST /print/ticket": {
        const t = await readJson(req);
        if (!t?.ticket_number) return fail(res, 400, "VALIDATION_ERROR", "ticket_number مطلوب");
        if (PRINTER === "offline") return fail(res, 409, "PRINTER_OFFLINE", "الطابعة غير متصلة");
        const file = writeOut("ticket", t.ticket_number, `<div style="text-align:center">مجمع الرحمة الطبي<br>رقم دورك<div style="font-size:40px;font-weight:700">${esc(t.ticket_number)}</div>${esc(t.doctor_name)}${t.estimated_time ? `<br>الوقت التقريبي ${esc(t.estimated_time)}` : ""}</div>`);
        log(`طُبعت التذكرة ${t.ticket_number} ← ${file}`);
        return send(res, 200, { printed: true });
      }

      case "POST /print/label": {
        const l = await readJson(req);
        if (!l?.sample_barcode) return fail(res, 400, "VALIDATION_ERROR", "sample_barcode مطلوب");
        if (PRINTER === "offline") return fail(res, 409, "PRINTER_OFFLINE", "الطابعة غير متصلة");
        const file = writeOut("label", l.sample_barcode, `<div style="width:47mm;font-size:10px">${esc(l.patient_name)}<br>${esc(l.file_number)} · ${esc(l.test_name)}<div style="font-size:16px;font-weight:700;letter-spacing:2px">${esc(l.sample_barcode)}</div></div>`);
        log(`طُبع ملصق العينة ${l.sample_barcode} ← ${file}`);
        return send(res, 200, { printed: true });
      }

      case "GET /events": {
        const since = Number(url.searchParams.get("since") ?? 0);
        return send(res, 200, state.events.filter((e) => e.local_event_id > since));
      }

      case "POST /events/ack": {
        const body = await readJson(req);
        const upTo = Number(body?.up_to);
        if (!Number.isFinite(upTo)) return fail(res, 400, "VALIDATION_ERROR", "up_to مطلوب");
        state.events = state.events.filter((e) => e.local_event_id > upTo);
        save();
        res.writeHead(204); return res.end();
      }

      // للتجربة فقط: محاكاة فتح الدرج بالمفتاح المعدني (يجب أن يصل للمحاسب)
      case "POST /simulate/manual-open":
        addEvent("drawer.opened_without_receipt");
        return send(res, 200, { ok: true });

      default:
        return fail(res, 404, "NOT_FOUND", route);
    }
  } catch (e) {
    log(`خطأ: ${e.stack ?? e}`);
    return fail(res, 500, "AGENT_ERROR", String(e.message ?? e));
  }
});

await refreshKey();
setInterval(refreshKey, 5 * 60_000);
server.listen(PORT, "127.0.0.1", () => {
  log(`محاكي الوكيل يعمل على http://localhost:${PORT}  (API: ${API_URL}${AGENT_KEY ? "، مع X-Agent-Key" : ""})`);
  log(`الإيصالات المطبوعة تُحفظ في ${OUT}`);
});
