// الطبقة الأولى: يدخل بكل دور عبر الواجهة، ويمر على كل شاشة تظهر له بعرضي 1280 و400، ويسجل كل خطأ.
import { readFileSync } from "node:fs";
import { Report, launch, sleep } from "./lib.mjs";

const accounts = readFileSync(new URL("../../DEV_ACCOUNTS.local.txt", import.meta.url), "utf8");
const adminPw = accounts.match(/^admin\s+(\S+)/m)[1];
const PW = process.env.E2E_PASSWORD || "CHANGE_ME"; // كلمة مرور حسابات الاختبار: من DEV_ACCOUNTS.local.txt
const ROLES = [["admin", adminPw], ["test_mgr_b1", PW], ["reception_b1", PW], ["dr_saad", PW], ["lab_sara", PW], ["rad_omar", PW], ["pharma_noor", PW], ["acc_zaid", PW]];
const EXTRA = ["/staff/notifications", "/staff/change-password", "/hub"];
const OK_4XX = /(\/agent|PAYMENT_PENDING)/;

export async function login(p, user, pw) {
  await p.goto("/manifest.webmanifest", 150);
  await p.ev(`localStorage.removeItem('rahma.staff.session')`);
  await p.goto("/staff/login", 700);
  await p.fill("input:not([type=password])", user);
  await p.fill("input[type=password]", pw);
  await p.key("Enter");
  await p.until(() => p.ev(`!location.pathname.includes('/login')`), `دخول ${user}`, 15000);
  await p.idle(900);
}

const r = new Report();
const p = await launch();
await p.size(1280, 900);
for (const [user, pw] of ROLES) {
  await r.step("دخول", user, async () => { await login(p, user, pw); return await p.ev("location.pathname"); }, p);
  // القائمة مطوية في مجموعات عند بعض الأدوار، فنفتح كل المجموعات قبل جمع الروابط
  await p.ev(`[...document.querySelectorAll('aside button[aria-expanded="false"]')].forEach(b=>b.click())`).catch(() => {});
  await sleep(400);
  const nav = await p.ev(`[...new Set([...document.querySelectorAll('aside a')].map(a=>a.getAttribute('href')).filter(h=>h&&h.startsWith('/staff/')))]`).catch(() => []);
  const links = [...new Set([...nav, ...EXTRA])];
  console.log(`-- ${user}: ${links.length} شاشة`);
  for (const [w, h, mobile] of [[1280, 900, false], [400, 800, true]]) {
    await p.size(w, h, mobile);
    for (const link of links) {
      await r.step(`${user} ${w}`, link, async () => {
        p.reset();
        await p.goto(link, 700);
        const { errors, api } = p.reset();
        const bad = [];
        if (errors.length) bad.push(`JS: ${errors[0].text}`);
        const apiBad = api.filter((a) => !OK_4XX.test(a.url));
        if (apiBad.length) bad.push(`API: ${apiBad.slice(0, 3).map((a) => `${a.status} ${a.url}`).join(" ، ")}`);
        const main = (await p.text("main")).trim();
        if (await p.ev(`location.pathname.includes('no-access')`)) bad.push("no-access");
        if (!main && !link.includes("hub") && !link.includes("change-password")) bad.push("شاشة فارغة");
        if (/Application error|تعذر|حدث خطأ/.test(main)) bad.push(`رسالة خطأ: ${main.match(/.*(Application error|تعذر|حدث خطأ).*/)?.[0].slice(0, 80)}`);
        const over = await p.overflow();
        if (over) bad.push(`تمدد ${over}`);
        if (bad.length) throw new Error(bad.join(" | "));
      }, p);
    }
  }
  await p.size(1280, 900);
}
r.save("crawl");
await p.close();
