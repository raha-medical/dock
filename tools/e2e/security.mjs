// الطبقة الثالثة: كل مسارات API من Swagger بلا تسجيل دخول، ثم مسارات القراءة بأدوار لا تملكها. لا يرسل كتابة بحساب مسجل.
import { readFileSync } from "node:fs";
import { API, Report, api, staffToken } from "./lib.mjs";

const accounts = readFileSync(new URL("../../DEV_ACCOUNTS.local.txt", import.meta.url), "utf8");
const BRANCH = "01a1a67c-9ea8-7702-8105-8d0d7cf2dd92";
const PW = process.env.E2E_PASSWORD || "CHANGE_ME"; // كلمة مرور حسابات الاختبار: من DEV_ACCOUNTS.local.txt
const spec = await (await fetch(API.replace("/api/v1", "/swagger/v1/swagger.json"))).json();
const ID = "00000000-0000-0000-0000-000000000001";
const fill = (p) => p.replace(/\{[^}]+\}/g, ID).replace("/api/v1", "");
const routes = Object.entries(spec.paths).flatMap(([p, ms]) => Object.keys(ms).map((m) => [m.toUpperCase(), p]));
const PUBLIC = /^\/api\/v1\/(public|patient-auth|sandbox|auth\/(login|refresh)|verify|health|receipts\/verify|online-payments\/.*callback|payments\/webhook|webhooks)/;
const r = new Report();

const leaks = [];
let checked = 0;
for (const [m, p] of routes) {
  if (PUBLIC.test(p) || p.endsWith("/agent/drawer-public-key")) continue; // مفتاح عام يقرؤه وكيل الدرج
  checked++;
  const res = await api(m, fill(p), ["POST", "PUT", "PATCH"].includes(m) ? {} : undefined, null, false);
  if (res.status !== 401 && res.status !== 403) leaks.push(`${m} ${p} → ${res.status}`);
}
await r.step("بلا دخول", `${checked} مسار محمي من ${routes.length}`, async () => { if (leaks.length) throw new Error(leaks.slice(0, 12).join(" ، ")); });

const tokens = {
  reception: await staffToken("reception_b1", PW, BRANCH), doctor: await staffToken("dr_saad", PW, BRANCH), lab: await staffToken("lab_sara", PW, BRANCH),
  pharmacy: await staffToken("pharma_noor", PW, BRANCH), accountant: await staffToken("acc_zaid", PW, BRANCH),
};
const DENY = {
  reception: ["/reports/dashboard", "/reports/entitlements", "/reports/payments", "/reports/branches-overview", "/users", "/roles", "/reports/audit-logs", "/admin/backups"],
  doctor: ["/reports/dashboard", "/reports/payments", "/users", "/roles", "/expenses", "/admin/backups"],
  lab: ["/reports/dashboard", "/users", "/expenses", "/pharmacy/dispensed", "/referrals?service=pharmacy"],
  pharmacy: ["/reports/dashboard", "/users", "/lab/worklist", "/radiology/worklist", "/referrals?service=lab"],
  accountant: ["/reports/branches-overview", "/users", "/lab/worklist", "/radiology/worklist", "/admin/backups"],
};
for (const [role, list] of Object.entries(DENY)) {
  await r.step("صلاحيات", `${role}: ${list.length} مسار ممنوع`, async () => {
    const bad = [];
    for (const u of list) { const s = (await api("GET", u, undefined, tokens[role], false)).status; if (s !== 403) bad.push(`${u} → ${s}`); }
    if (bad.length) throw new Error(bad.join(" ، "));
  });
}
await r.step("صلاحيات", "حساب مريض لا يصل لمسارات الموظفين", async () => {
  const phone = `0776${Date.now().toString().slice(-7)}`;
  const rq = await api("POST", "/patient-auth/otp/request", { phone_number: phone }, null, false);
  const v = await api("POST", "/patient-auth/otp/verify", { phone_number: phone, code: rq.body.sandbox_code }, null, false);
  const bad = [];
  for (const u of ["/users", "/reports/dashboard", "/lab/worklist", "/patients/search?q=07"]) { const s = (await api("GET", u, undefined, v.body.access_token, false)).status; if (s !== 403 && s !== 401) bad.push(`${u} → ${s}`); }
  if (bad.length) throw new Error(bad.join(" ، "));
});
r.save("security");
