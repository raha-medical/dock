// مشغّل E2E بلا مكتبات: Chrome بلا واجهة عبر بروتوكول DevTools. يعمل على alrahma_db المحلية فقط ويضيف بيانات اختبار ولا يحذف.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const WEB = process.env.E2E_WEB ?? "http://localhost:3000";
export const API = process.env.E2E_API ?? "http://localhost:8088/api/v1";
export const OUT = new URL("./out/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
mkdirSync(OUT, { recursive: true });
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CHROME = [process.env.CHROME, "C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].find((p) => p && existsSync(p));

export async function launch() {
  const dir = mkdtempSync(join(tmpdir(), "rahma-e2e-"));
  const port = 9300 + Math.floor(Math.random() * 400);
  const proc = spawn(CHROME, [`--remote-debugging-port=${port}`, `--user-data-dir=${dir}`, "--headless=new", "--no-first-run", "--disable-gpu", "--window-size=1280,900", "about:blank"], { stdio: "ignore" });
  let target;
  for (let i = 0; i < 100 && !target; i++) {
    await sleep(150);
    try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === "page"); } catch { /* لم يبدأ بعد */ }
  }
  if (!target) throw new Error("Chrome لم يبدأ");
  const page = await new Page(target.webSocketDebuggerUrl).open();
  page.close = async () => { proc.kill(); await sleep(400); try { rmSync(dir, { recursive: true, force: true }); } catch { /* ملفات مقفلة */ } };
  return page;
}

export class Page {
  constructor(url) { this.url = url; this.id = 0; this.wait = new Map(); this.errors = []; this.api = []; }
  open() {
    return new Promise((ok, no) => {
      this.ws = new WebSocket(this.url);
      this.ws.onerror = no;
      this.ws.onmessage = (e) => this.onMessage(JSON.parse(e.data));
      this.ws.onopen = async () => {
        for (const d of ["Page", "Runtime", "Network", "Log"]) await this.cmd(`${d}.enable`);
        ok(this);
      };
    });
  }
  cmd(method, params = {}) {
    const id = ++this.id;
    return new Promise((ok, no) => { this.wait.set(id, { ok, no, method }); this.ws.send(JSON.stringify({ id, method, params })); });
  }
  onMessage(m) {
    if (m.id) { const w = this.wait.get(m.id); this.wait.delete(m.id); if (!w) return; return m.error ? w.no(new Error(`${w.method}: ${m.error.message}`)) : w.ok(m.result); }
    if (m.method === "Runtime.exceptionThrown") this.errors.push({ kind: "js", text: m.params.exceptionDetails.exception?.description?.slice(0, 200) ?? m.params.exceptionDetails.text });
    if (m.method === "Network.responseReceived") {
      const { url, status } = m.params.response;
      if (url.includes("/api/v1/") && status >= 400) this.api.push({ status, url: url.replace(/^.*\/api\/v1/, "") });
    }
  }
  reset() { const r = { errors: this.errors, api: this.api }; this.errors = []; this.api = []; return r; }
  async ev(expr) {
    const r = await this.cmd("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true, userGesture: true });
    if (r.exceptionDetails) throw new Error(`eval: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`.slice(0, 300));
    return r.result.value;
  }
  async size(w, h, mobile = false) { await this.cmd("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile }); }
  async goto(path, settle = 900) {
    await this.cmd("Page.navigate", { url: path.startsWith("http") ? path : WEB + path });
    await this.idle(settle);
  }
  async idle(settle = 700, max = 12000) {
    const t = Date.now();
    await sleep(250);
    while (Date.now() - t < max) {
      if (await this.ev(`document.readyState==='complete' && !/جارٍ التحميل/.test(document.querySelector('main')?.innerText ?? '')`).catch(() => false)) break;
      await sleep(150);
    }
    await sleep(settle);
  }
  text(sel = "body") { return this.ev(`(document.querySelector(${JSON.stringify(sel)})?.innerText ?? '')`); }
  has(t, sel = "body") { return this.ev(`(document.querySelector(${JSON.stringify(sel)})?.innerText ?? '').includes(${JSON.stringify(t)})`); }
  async until(fn, label, max = 10000) {
    const t = Date.now();
    while (Date.now() - t < max) { if (await fn().catch(() => false)) return true; await sleep(150); }
    throw new Error(`انتهت المهلة: ${label}`);
  }
  waitText(t, sel = "body", max = 10000) { return this.until(() => this.has(t, sel), t, max); }

  /** يضغط أول عنصر ظاهر قابل للنقر نصه يطابق، بنقرة فأرة حقيقية. scope لتضييق البحث. */
  async click(label, { scope = "body", exact = false, nth = 0 } = {}) {
    const box = await this.ev(`(()=>{const L=${JSON.stringify(label)},X=${exact},N=${nth};const root=document.querySelector(${JSON.stringify(scope)});if(!root)return null;
      const norm=s=>(s||'').replace(/[\\u2066-\\u2069]/g,'').replace(/\\s+/g,' ').trim();
      const c=[...root.querySelectorAll('button,a,[role=tab],[role=option],[role=button],label')].filter(e=>{const r=e.getBoundingClientRect();if(!r.width||!r.height)return false;const t=norm(e.innerText||e.getAttribute('aria-label')||e.title);const a=norm(e.getAttribute('aria-label'));return X?(t===L||a===L):(t.includes(L)||a.includes(L))});
      const e=c[N];if(!e)return null;e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    if (!box) throw new Error(`لا يوجد عنصر: ${label}`);
    await this.mouse(box.x, box.y);
    await sleep(250);
  }
  async mouse(x, y) {
    await this.cmd("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
    await this.cmd("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
    await this.cmd("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
  }
  /** يكتب في حقل بمحدد CSS أو بنص label، بضغطات حقيقية. */
  async fill(selOrLabel, value, { scope = "body", nth = 0 } = {}) {
    const ok = await this.ev(`(()=>{const k=${JSON.stringify(selOrLabel)};const root=document.querySelector(${JSON.stringify(scope)});if(!root)return false;let e=null;
      try{e=[...root.querySelectorAll(k)].filter(x=>x.getBoundingClientRect().width)[${nth}]}catch{}
      if(!e){const inputs=[...root.querySelectorAll('input,textarea')].filter(x=>x.getBoundingClientRect().width);e=inputs.filter(i=>(i.getAttribute('aria-label')||'').includes(k)||(i.placeholder||'').includes(k)||(i.closest('label')?.innerText||'').includes(k)||(i.parentElement?.parentElement?.innerText||'').split('\\n')[0].includes(k))[${nth}]}
      if(!e)return false;e.scrollIntoView({block:'center'});e.focus();e.select?.();return true})()`);
    if (!ok) throw new Error(`لا يوجد حقل: ${selOrLabel}`);
    await this.cmd("Input.insertText", { text: String(value) });
    await sleep(150);
  }
  async key(k, code = k) {
    const vk = { Enter: 13, Escape: 27, ArrowDown: 40, Tab: 9 }[k];
    await this.cmd("Input.dispatchKeyEvent", { type: "keyDown", key: k, code, windowsVirtualKeyCode: vk, text: k === "Enter" ? "\r" : undefined });
    await this.cmd("Input.dispatchKeyEvent", { type: "keyUp", key: k, code, windowsVirtualKeyCode: vk });
    await sleep(150);
  }
  /** يختار من ISelect: يضغط المفتاح بالفهرس، يكتب للبحث، ثم Enter. */
  async pick(scope, text, nth = 0) {
    const box = await this.ev(`(()=>{const e=[...document.querySelector(${JSON.stringify(scope)}).querySelectorAll('[role=combobox]')].filter(x=>x.getBoundingClientRect().width)[${nth}];if(!e)return null;e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    if (!box) throw new Error(`لا يوجد ISelect في ${scope}`);
    await this.mouse(box.x, box.y);
    await sleep(350);
    if (text) { await this.cmd("Input.insertText", { text }); await sleep(350); } else await this.key("ArrowDown");
    await this.key("Enter");
    await sleep(250);
  }
  /** يضغط زراً داخل أقرب صف أو بطاقة تحوي النص. */
  async clickNear(text, label, { sel = "tr,li,[class*=rounded]" } = {}) {
    const box = await this.ev(`(()=>{const T=${JSON.stringify(text)},L=${JSON.stringify(label)};const norm=s=>(s||'').replace(/\\s+/g,' ').trim();
      const rows=[...document.querySelectorAll(${JSON.stringify(sel)})].filter(e=>e.innerText?.includes(T)&&e.getBoundingClientRect().width).sort((a,b)=>a.innerText.length-b.innerText.length);
      for(const row of rows){const b=[...row.querySelectorAll('button,a,[role=tab]')].find(x=>norm(x.innerText||x.getAttribute('aria-label')).includes(L)&&x.getBoundingClientRect().width);if(b){b.scrollIntoView({block:'center'});const r=b.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}}}return null})()`);
    if (!box) throw new Error(`لا يوجد «${label}» قرب «${text}»`);
    await this.mouse(box.x, box.y);
    await sleep(250);
  }
  /** يضغط أصغر عنصر ظاهر يحوي النص، لصفوف الجداول والبطاقات غير الأزرار. */
  async clickText(text, scope = "main") {
    const box = await this.ev(`(()=>{const T=${JSON.stringify(text)};const e=[...document.querySelector(${JSON.stringify(scope)}).querySelectorAll('*')].filter(x=>x.innerText?.includes(T)&&x.getBoundingClientRect().width).sort((a,b)=>a.innerText.length-b.innerText.length)[0];if(!e)return null;e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    if (!box) throw new Error(`لا يوجد نص: ${text}`);
    await this.mouse(box.x, box.y);
    await sleep(250);
  }
  /** يختار أي تاريخ من تقويم DateField المفتوح: سنة ثم شهر ثم يوم. */
  async pickDate(trigger = "اختر التاريخ") {
    await this.click(trigger);
    await sleep(300);
    for (let i = 0; i < 5; i++) {
      const box = await this.ev(`(()=>{const d=document.querySelector('[aria-label="اختيار التاريخ"]');if(!d)return null;const b=[...d.querySelectorAll('button:not([aria-label]):not([disabled]),[role=gridcell]:not([disabled])')].filter(x=>x.getBoundingClientRect().width&&/\\d|[ء-ي]/.test(x.innerText));const e=b[Math.floor(b.length/2)];if(!e)return null;const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
      if (!box) return;
      await this.mouse(box.x, box.y);
      await sleep(250);
    }
  }
  async shot(name) {
    const r = await this.cmd("Page.captureScreenshot", { format: "jpeg", quality: 70 });
    writeFileSync(join(OUT, `${name}.jpg`), Buffer.from(r.data, "base64"));
  }
  /** تمدد أفقي حقيقي، بلا العناصر داخل حاويات التمرير. */
  overflow() {
    return this.ev(`(()=>{const w=innerWidth,sw=document.documentElement.scrollWidth;if(sw<=w+1)return null;const b=[...document.querySelectorAll('main *')].find(e=>{const r=e.getBoundingClientRect();if(r.right<=w+1||!r.width)return false;for(let p=e.parentElement;p;p=p.parentElement){const o=getComputedStyle(p).overflowX;if(o==='auto'||o==='scroll'||o==='hidden')return false}return true});return sw+':'+(b?b.tagName+'.'+String(b.className).slice(0,40):'')})()`);
  }
}

export async function api(method, path, body, token, idem = method === "POST") {
  const h = { "Content-Type": "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  if (idem) h["Idempotency-Key"] = crypto.randomUUID();
  const r = await fetch(API + path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text();
  let j = null; try { j = t ? JSON.parse(t) : null; } catch { j = t; }
  return { status: r.status, body: j };
}
export const staffToken = async (username, password, branch_id) => { const r = await api("POST", "/auth/login", { username, password, branch_id }, null, false); if (r.status !== 200) throw new Error(`دخول ${username}: ${r.status} ${JSON.stringify(r.body).slice(0, 160)}`); return r.body.access_token; };

/** سجل النتائج: كل بند ينجح أو يفشل بسبب، ولا يوقف ما بعده. */
export class Report {
  constructor() { this.rows = []; }
  async step(group, name, fn, page) {
    const t = Date.now();
    try { const note = await fn(); this.rows.push({ group, name, ok: true, note: note ?? "", ms: Date.now() - t }); console.log(`PASS [${group}] ${name}${note ? ` :: ${note}` : ""}`); }
    catch (e) {
      this.rows.push({ group, name, ok: false, note: String(e.message ?? e).slice(0, 300), ms: Date.now() - t });
      console.log(`FAIL [${group}] ${name} :: ${String(e.message ?? e).slice(0, 300)}`);
      if (page) await page.shot(`fail-${this.rows.length}`).catch(() => {});
    }
  }
  save(name) { writeFileSync(join(OUT, `${name}.json`), JSON.stringify(this.rows, null, 1)); const f = this.rows.filter((r) => !r.ok).length; console.log(`\n== ${name}: ${this.rows.length - f} نجح، ${f} فشل`); }
}
