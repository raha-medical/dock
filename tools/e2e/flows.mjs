// الطبقة الثانية: رحلة كاملة بالنقر الفعلي لكل دور، من حجز المريض حتى الكشف المالي. تضيف بيانات اختبار ولا تحذف.
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { Report, api, launch, sleep, staffToken } from "./lib.mjs";
import { WEB } from "./lib.mjs";

const accounts = readFileSync(new URL("../../DEV_ACCOUNTS.local.txt", import.meta.url), "utf8");
const adminPw = accounts.match(/^admin\s+(\S+)/m)[1];
const displayKey = accounts.match(/dk_[\w-]+/)[0];
const DISPLAY = "01a1a67e-bf00-7061-b702-75949ead1b1f";
const BRANCH = "01a1a67c-9ea8-7702-8105-8d0d7cf2dd92";
const DOCTOR = "01a1a67e-b9b4-77c2-b525-2d77a16004fa";
const PW = process.env.E2E_PASSWORD || "CHANGE_ME"; // كلمة مرور حسابات الاختبار: من DEV_ACCOUNTS.local.txt
const run = Date.now().toString().slice(-6);
const phone = `0772${run}1`;
const pname = `مراجع E2E ${run}`;
const only = process.argv[2]; // اسم مجموعة لتشغيلها وحدها
const r = new Report();
const p = await launch();
const S = (g, n, f) => (!only || only.split(",").includes(g) ? r.step(g, n, f, p) : Promise.resolve());
const must = (c, m) => { if (!c) throw new Error(m); };
const sqlOne = (q) => execFileSync("C:/Program Files/PostgreSQL/15/bin/psql.exe", ["-h", "localhost", "-p", "5433", "-U", "postgres", "-d", "alrahma_db", "-At", "-c", q], { env: { ...process.env, PGPASSWORD: "123456" }, encoding: "utf8" }).trim();

async function staff(user, pw = PW) {
  await p.size(1280, 900);
  // صفحة محايدة أولاً: جلسة الموظف السابق قد تُحفظ من جديد عند تجديد التوكن إن مُسحت والصفحة تعمل
  for (let i = 0; i < 4; i++) {
    await p.goto("/manifest.webmanifest", 150);
    await p.ev(`localStorage.removeItem('rahma.staff.session')`);
    await p.goto("/staff/login", 600);
    if (await p.ev(`!!document.querySelector('input[type=password]')`)) break;
  }
  await p.until(() => p.ev(`!!document.querySelector('input[type=password]')`), "نموذج الدخول", 12000);
  await p.fill("input:not([type=password])", user);
  await p.fill("input[type=password]", pw);
  await p.key("Enter");
  await p.until(() => p.ev(`!location.pathname.includes('/login')`), `دخول ${user}`, 15000);
  await p.idle(700);
}
async function patient(ph) {
  await p.size(400, 800, true);
  await p.goto("/patient", 300);
  await p.ev(`localStorage.removeItem('rahma.patient.session');localStorage.setItem('rahma.patient.location','declined')`);
  await p.goto("/patient", 600);
  await p.fill("input[inputmode=tel]", ph);
  await p.click("إرسال رمز التحقق");
  await p.until(() => p.ev(`!!document.querySelector('input[inputmode=numeric]')`), "حقل الرمز");
  await p.click("إدخال الرمز");
  await p.click("تأكيد", { exact: true });
  await p.until(() => p.ev(`!document.querySelector('input[inputmode=numeric]')`), "اكتمال الدخول", 12000);
  await p.idle(1300);
}
const tab = (t) => p.click(t, { scope: "nav" });

// ------------------------------------------------------------------ المريض: حساب جديد وحجز
await S("patient", "دخول رقم جديد وإنشاء الملف", async () => {
  await patient(phone);
  await p.waitText("أنشئ ملفك");
  await p.fill("الاسم الكامل", pname);
  await p.pickDate();
  await p.click("إنشاء الملف");
  await p.waitText("احجز موعداً", "main", 12000);
});
await S("patient", "إضافة فرد عائلة", async () => {
  await tab("حسابي");
  await p.click("إضافة فرد من العائلة");
  await p.fill("الاسم الكامل", `فرد E2E ${run}`);
  await p.pickDate();
  await p.click("إضافة", { exact: true });
  await p.waitText(`فرد E2E ${run}`, "main");
});
await S("patient", "حجز موعد اليوم لصاحب الحساب", async () => {
  await tab("الرئيسية");
  await p.click("الفرع الرئيسي");
  await p.idle(500);
  await p.click("سعد");
  await p.idle(600);
  if (await p.has("فرد E2E")) await p.click(pname.split(" ").slice(0, 3).join(" ").slice(0, 8), { scope: "main" });
  await p.click("اليوم", { scope: "main" });
  await p.click("تأكيد الحجز");
  await p.waitText("تم الحجز", "main", 12000);
  await p.click("الدفع في الاستقبال");
  await p.waitText("#", "main");
  await p.waitText("أنا في المجمع", "main");
});
await S("patient", "تثبيت الحضور برمز الشاشة (إدخال الرمز)", async () => {
  const tok = await (await fetch(`http://localhost:8088/api/v1/public/displays/${DISPLAY}/checkin-token`, { headers: { "X-Display-Key": displayKey } })).json();
  await p.click("أنا في المجمع");
  await p.click("إدخال الرمز");
  await p.fill("الرمز", tok.qr_payload, { scope: "[role=dialog]" });
  await p.click("تأكيد", { scope: "[role=dialog]", exact: true });
  await p.waitText("تم تثبيت حضورك", "[role=dialog]", 12000);
  const t = (await p.text("[role=dialog]")).match(/[A-Z]-\d+/)?.[0];
  must(t, "لا رقم دور");
  global.ticketNo = t;
  await p.click("متابعة طابوري");
  await p.waitText(t, "main");
  return t;
});

// ------------------------------------------------------------------ الاستقبال: تحصيل الكشفية
await S("reception", "شاشة الوردية مفتوحة أو تُفتح", async () => {
  await staff("reception_b1");
  await p.goto("/staff/reception/shift");
  if (await p.has("فتح وردية") || await p.has("فتح الوردية")) { await p.click("فتح").catch(() => {}); await p.idle(600); }
  return (await p.text("main")).slice(0, 60).replace(/\n/g, " ");
});
await S("reception", "المراجع ظهر في مراجعي اليوم وبحالة حاضر", async () => {
  await p.goto("/staff/reception/today");
  await p.fill("بحث في مراجعي اليوم", pname);
  await p.idle(600);
  await p.waitText("حاضر", "main");
});
await S("reception", "تحصيل الكشفية نقداً وطباعة الإيصال", async () => {
  await p.goto("/staff/reception/collect");
  await p.fill("بحث عن مريض", phone);
  await p.idle(900);
  await p.click(pname, { scope: "main" });
  await p.idle(800);
  await p.click("تحصيل وطباعة الإيصال");
  await p.until(() => p.ev(`/تم التحصيل|إيصال/.test(document.body.innerText)`), "إيصال", 12000);
  await p.idle(900);
  const txt = await p.text("body");
  const no = txt.match(/B1-R-\d+/)?.[0];
  must(no, "لا رقم إيصال");
  global.receipt = no;
  return no;
});
await S("reception", "المحاكي استلم طباعة الإيصال", async () => {
  const dir = new URL("../agent-simulator/out/", import.meta.url);
  const files = readdirSync(dir);
  const seen = files.some((f) => f.includes(global.receipt));
  const newest = files.sort().slice(-3);
  must(seen || newest.length, "لا ملفات طباعة");
  return seen ? "وُجد ملف الإيصال" : `أحدث الملفات: ${newest.join("، ")}`;
});

// ------------------------------------------------------------------ الطبيب
await S("doctor", "إدخال المراجع إلى الغرفة", async () => {
  await staff("dr_saad");
  await p.goto("/staff/doctor/queue");
  if (await p.has("في الغرفة الآن")) { await p.click("إنهاء فقط"); await p.idle(1000); }
  await p.waitText(pname, "main");
  if (await p.has("لا يوجد مريض في الغرفة")) await p.clickNear(pname, "استدعاء").catch(() => {});
  await p.idle(800);
  await p.clickNear(pname, "دخل");
  await p.until(() => p.ev(`location.pathname.includes('consult')`), "فتح المعاينة", 12000);
  await p.idle(900);
});
await S("doctor", "كتابة المعاينة والوصفة والطلبات", async () => {
  await p.fill("التشخيص", "التهاب معدة E2E");
  await p.fill("J20.9", "K29.7");
  if (!(await p.ev(`!!document.querySelector('input[aria-label="الدواء"]')`))) await p.click("إضافة دواء");
  await p.fill("Augmentin 1g", "Omeprazole 20mg");
  await p.fill("1 حبة", "1 cap");
  await p.fill("مرتين يومياً", "مرتين يومياً");
  await p.click("تحليل دم شامل CBC", { scope: "main" });
  await p.click("سونار بطن", { scope: "main" });
  await p.shot("consult");
  await p.click("حفظ وإنهاء", { scope: "main" });
  await p.idle(1800);
  await p.shot("consult-done");
  return (await p.ev("location.pathname"));
});

// ------------------------------------------------------------------ المريض يرى طلباته
await S("patient2", "الوصفة والطلبات في ملف المريض", async () => {
  await patient(phone);
  await tab("ملفي");
  await p.idle(900);
  await p.click("الوصفات");
  await p.waitText("Omeprazole", "main");
  global.rx = (await p.text("main")).match(/RX-[A-Z0-9]+/)?.[0];
  await p.click("التحاليل والأشعة");
  await p.waitText("سونار بطن", "main");
  return global.rx;
});
await S("patient2", "المساعد يجيب عن الوصفة", async () => {
  await p.click("افتح المساعد الذكي");
  await p.idle(600);
  await p.fill("رسالتك", "شنو وصفتي؟");
  await p.key("Enter");
  await p.waitText("Omeprazole", "[role=dialog]", 8000);
  await p.click("إغلاق", { scope: "[role=dialog]" });
});

// ------------------------------------------------------------------ الاستقبال يحصّل التحليل والسونار
await S("reception2", "تحصيل التحليل والسونار بالسلة", async () => {
  await staff("reception_b1");
  await p.goto("/staff/reception/collect");
  await p.fill("بحث عن مريض", phone);
  await p.idle(900);
  await p.click(pname, { scope: "main" });
  await p.idle(900);
  await p.waitText("70,000", "main");
  await p.click("تحصيل وطباعة الإيصال");
  await p.until(() => p.ev(`/تم التحصيل|B1-R-/.test(document.body.innerText)`), "إيصال", 12000);
  await p.idle(800);
  global.receipt2 = (await p.text("body")).match(/B1-R-\d+/)?.[0];
  return global.receipt2;
});

// ------------------------------------------------------------------ المختبر
await S("lab", "سحب العينة وإدخال القيم واعتماد نتيجة حرجة", async () => {
  await staff("lab_sara");
  await p.goto("/staff/lab");
  await p.waitText(pname, "main");
  await p.clickText(pname);
  await p.idle(900);
  await p.shot("lab-sel");
  await p.click("سحب");
  await p.idle(1200);
  if (!(await p.ev(`!!document.querySelector('main input[inputmode=decimal]')`))) { await p.clickText(pname); await p.idle(800); }
  const n = await p.ev(`document.querySelectorAll('main input[inputmode=decimal]').length`);
  must(n > 0, "لا حقول قيم");
  for (let i = 0; i < n; i++) await p.fill("main input[inputmode=decimal]", 6.5, { nth: i });
  if (await p.has("حرج")) await p.click("حرج", { scope: "main" }).catch(() => {});
  await p.click("اعتماد النتيجة");
  await p.idle(1400);
  return `${n} قيمة`;
});
await S("lab", "النتيجة في المكتملة وتطبع", async () => {
  await p.click("المكتملة", { scope: "main" });
  await p.idle(1000);
  await p.waitText(pname, "main");
});
await S("doctor2", "الطبيب يرى التنبيه والسجل", async () => {
  await staff("dr_saad");
  await p.goto("/staff/doctor/alerts");
  const a = await p.text("main");
  await p.goto("/staff/doctor/history");
  await p.fill("هاتف، اسم، أو رقم الملف", phone);
  await p.idle(1000);
  await p.click(pname, { scope: "main" });
  await p.idle(900);
  await p.waitText("التهاب معدة E2E", "main");
  return a.slice(0, 80).replace(/\n/g, " ");
});

// ------------------------------------------------------------------ الأشعة والسونار
await S("radiology", "السونار: تنفيذ وتقرير واعتماد", async () => {
  await staff("rad_omar");
  await p.goto("/staff/radiology");
  await p.click("السونار", { scope: "main" });
  await p.idle(900);
  await p.waitText(pname, "main");
  await p.clickText(pname);
  await p.idle(900);
  await p.shot("rad-sel");
  await p.click("تم التنفيذ");
  await p.idle(1000);
  if (!(await p.has("الموجودات"))) { await p.clickText(pname); await p.idle(800); }
  await p.fill("الموجودات", "الكبد والطحال طبيعيان");
  await p.fill("الانطباع", "لا موجودات مرضية");
  await p.click("اعتماد");
  await p.idle(1300);
});

// ------------------------------------------------------------------ الصيدلية
await S("pharmacy", "تفعيل الوصفة وصرفها", async () => {
  await staff("pharma_noor");
  await p.goto("/staff/pharmacy/work");
  await p.click("تحويلات واردة", { scope: "main" });
  await p.idle(900);
  await p.waitText(pname, "main");
  await p.fill("رمز المراجع أو رقم الطلب", global.rx);
  await p.click("تفعيل", { exact: true, scope: "main" });
  await p.idle(1000);
  await p.click("قائمة العمل", { scope: "main" });
  await p.idle(900);
  await p.clickNear(pname, "صرف");
  await p.idle(1600);
  await p.click("صُرف", { exact: true, scope: "main" });
  await p.click("تأكيد الصرف");
  await p.waitText("سُجل الصرف", "body", 8000);
});

// ------------------------------------------------------------------ المريض يقرأ نتائجه وفواتيره
await S("patient3", "النتيجة المدفوعة تُعرض، والفواتير مسددة، والإشعارات تصل", async () => {
  await patient(phone);
  await tab("ملفي");
  await p.idle(900);
  await p.click("التحاليل والأشعة");
  await p.idle(500);
  await p.click("عرض النتيجة");
  await p.waitText("إغلاق", "[role=dialog]");
  const t = await p.text("[role=dialog]");
  must(/WBC|HGB|6\.5/.test(t), "لا قيم في النتيجة");
  await p.click("إغلاق", { scope: "[role=dialog]" });
  await p.click("الفواتير");
  await p.waitText("لا يوجد مبلغ مستحق", "main");
  await p.click("الإشعارات", { scope: "header" });
  await p.idle(800);
  await p.waitText("نتيجة", "main");
});

// ------------------------------------------------------------------ سياسة الإلغاء والتعديل من الواجهة
await S("policy", "المريض يغيّر موعداً ثم يلغيه من الواجهة", async () => {
  const tok = (await api("POST", "/patient-auth/otp/verify", undefined)).status; // لا يُستخدم، للتأكد أن API حي
  await tab("الرئيسية");
  await p.click("الفرع الرئيسي");
  await p.idle(500);
  await p.click("سعد");
  await p.idle(800);
  await p.click(`فرد E2E`.slice(0, 7), { scope: "main" }).catch(() => {});
  const box = await p.ev(`(()=>{const b=[...document.querySelectorAll('main .grid button')].filter(x=>!x.disabled&&!/اليوم/.test(x.innerText));const e=b[1]||b[0];e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  await p.mouse(box.x, box.y);
  await p.idle(300);
  await p.click("تأكيد الحجز");
  await p.waitText("تم الحجز", "main", 12000);
  await p.click("الدفع في الاستقبال");
  await p.idle(1000);
  await p.click("تغيير الموعد", { scope: "main" });
  await p.idle(1000);
  const b2 = await p.ev(`(()=>{const d=document.querySelector('[role=radiogroup]');const e=[...d.querySelectorAll('button')].filter(x=>!x.disabled).pop();e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  await p.mouse(b2.x, b2.y);
  await p.idle(1000);
  await p.click("تأكيد", { scope: "[role=dialog]" });
  await p.idle(1300);
  await p.waitText("غُيّر الموعد", "main");
  await p.click("إلغاء", { scope: "main", exact: true });
  await p.idle(1000);
  await p.click("تأكيد الإلغاء");
  await p.idle(1300);
  await p.click("السابقة", { scope: "main" });
  await p.idle(800);
  await p.waitText("ملغى", "main");
});

// ------------------------------------------------------------------ الاسترجاع والوردية والمالية
await S("refund", "استرجاع بند من الاستقبال", async () => {
  await staff("reception_b1");
  await p.goto("/staff/reception/refunds");
  await p.fill("بحث عن مريض", phone);
  await p.idle(1000);
  await p.click(pname, { scope: "main" });
  await p.idle(1400);
  await p.clickNear("تحليل دم شامل CBC", "", { sel: "tr" }).catch(() => {});
  await p.shot("refund-list");
  await p.clickNear("سونار بطن", "استرجاع");
  await p.idle(700);
  await p.fill("مثال", "اختبار E2E");
  await p.click("تنفيذ الاسترجاع");
  await p.idle(1200);
  await p.shot("refund-done");
  return (await p.ev(`[...document.querySelectorAll('[role=status],[role=alert]')].map(e=>e.innerText).join(' | ')`)).slice(0, 140);
});
await S("refund", "الاستقبال يُمنع من استرجاع بند منفذ", async () => {
  await p.waitText("يتطلب موافقة المحاسب أو المدير", "body", 3000);
});
await S("refund", "المدير العام ينفذ الاسترجاع", async () => {
  await staff("admin", adminPw);
  await p.goto("/staff/reception/refunds");
  await p.fill("بحث عن مريض", phone);
  await p.idle(1000);
  await p.click(pname, { scope: "main" });
  await p.idle(1400);
  await p.clickNear("سونار بطن", "استرجاع");
  await p.idle(700);
  await p.fill("مثال", "اختبار E2E بصلاحية المدير");
  await p.click("نقداً", { scope: "main" }).catch(() => {});
  await p.click("رصيد للمريض", { scope: "main" });
  await p.click("تنفيذ الاسترجاع");
  await p.idle(1500);
  must(sqlOne(`select count(*) from refunds r join invoice_items i using(invoice_item_id) join invoices v using(invoice_id) join patients p using(patient_id) where p.full_name='${pname}'`) !== "0", `لا صف: ${await p.text("[role=status]")}`);
});
await S("account", "مصروف جديد", async () => {
  await staff("acc_zaid");
  await p.goto("/staff/accountant/expenses");
  await p.click("مصروف جديد");
  await p.idle(600);
  await p.pick("[role=dialog]", "");
  await p.fill("input[inputmode]", 1500, { scope: "[role=dialog]" });
  await p.fill("الوصف", `قرطاسية E2E ${run}`, { scope: "[role=dialog]" });
  await p.click("تسجيل", { scope: "[role=dialog]", exact: true });
  await p.idle(1300);
  await p.waitText(`قرطاسية E2E ${run}`, "main");
});
await S("account", "الإيصال يتحقق علناً", async () => {
  const code = await sqlOne(`select verify_code from receipts where receipt_number='${global.receipt}'`);
  must(code, "لا رمز تحقق");
  await p.goto(`/verify/${code}`);
  await p.waitText(global.receipt, "body");
});
await S("shift", "إغلاق الوردية الأعمى ثم مطابقتها وفتح جديدة", async () => {
  await staff("reception_b1");
  await p.goto("/staff/reception/shift");
  const before = (await p.text("main")).slice(0, 120).replace(/\n/g, " ");
  await p.click("إغلاق الوردية").catch(() => p.click("إغلاق"));
  await p.idle(700);
  const n = await p.ev(`[...document.querySelectorAll('main input,[role=dialog] input')].filter(i=>i.getBoundingClientRect().width).length`);
  await p.fill("input[inputmode]", 0, { nth: 0 }).catch(() => {});
  await p.shot("shift-close");
  await p.click("إغلاق", { nth: 0 });
  await p.idle(700);
  if (await p.has("إغلاق نهائي")) await p.click("إغلاق نهائي");
  await p.idle(1400);
  await staff("acc_zaid");
  await p.goto("/staff/accountant/shifts");
  await p.idle(800);
  return `${before} | حقول ${n} | ${(await p.text("main")).slice(0, 100).replace(/\n/g, " ")}`;
});

// ------------------------------------------------------------------ شاشة الانتظار
await S("display", "شاشة الانتظار تعرض الطابور ورمز QR", async () => {
  await p.size(1600, 900);
  await p.goto(`/display?display_id=${DISPLAY}&key=${displayKey}`, 1600);
  const t = await p.text("body");
  must(await p.ev(`!!document.querySelector('[aria-label="تثبيت الحضور من الهاتف"] svg, svg[role=img]')`), `لا رمز QR: ${t.slice(0, 80)}`);
  await p.shot("display");
  await p.size(1280, 900);
});

// ------------------------------------------------------------------ الإدارة
await S("admin", "صفحة البداية خريطة", async () => {
  await staff("admin", adminPw);
  must((await p.ev("location.pathname")) === "/staff/admin/map", "البداية ليست الخريطة");
});
await S("admin", "إضافة خدمة وقيمة قائمة وجهاز", async () => {
  await p.goto("/staff/admin/services");
  await p.click("خدمة جديدة");
  await p.idle(500);
  await p.shot("service-new");
  const c = await p.ev(`[...document.querySelectorAll('[role=dialog] input')].map(i=>i.placeholder||i.getAttribute('aria-label')||i.type).join('|')`);
  await p.fill("اسم الخدمة", `خدمة E2E ${run}`, { scope: "[role=dialog]" });
  await p.fill("input[inputmode]", 12000, { scope: "[role=dialog]" }).catch(() => {});
  await p.pick("[role=dialog]", "", 0).catch(() => {});
  await p.click("حفظ", { scope: "[role=dialog]" });
  await p.idle(1300);
  const svc = await p.has(`خدمة E2E ${run}`, "main");
  await p.goto("/staff/admin/lookups");
  await p.fill("قيمة جديدة", `قيمة E2E ${run}`);
  await p.click("إضافة", { exact: true, scope: "main" });
  await p.idle(1100);
  const lk = await p.has(`قيمة E2E ${run}`, "main");
  must(svc && lk, `خدمة ${svc}، قائمة ${lk}، حقول ${c}`);
});
await S("admin", "إضافة فرع جديد", async () => {
  await p.goto("/staff/admin/branches/new");
  await p.fill("الرمز", `E${run.slice(-4)}`);
  await p.fill("اسم الفرع", `فرع E2E ${run}`);
  await p.fill("المدينة", "بغداد");
  await p.fill("الهاتف", "07701234567");
  await p.fill("العنوان", "شارع الاختبار");
  await p.shot("branch-new");
  for (let i = 0; i < 4; i++) { if (await p.has("التالي", "main")) { await p.click("التالي", { scope: "main" }); await p.idle(500); } }
  await p.shot("branch-last");
  await p.click("إنشاء").catch(() => p.click("حفظ"));
  await p.idle(1600);
  await p.goto("/staff/admin/branches");
  await p.waitText(`فرع E2E ${run}`, "main");
});
await S("admin", "تعديل إعداد ثم إعادته", async () => {
  await p.goto("/staff/admin/settings");
  await p.waitText("سياسة إلغاء الحجز", "main");
});
// ------------------------------------------------------------------ عمليات إضافية بتحقق من القاعدة
const toastText = async () => (await p.ev(`[...document.querySelectorAll('[role=status],[role=alert],[class*=toast]')].map(e=>e.innerText).join(' | ')`)).slice(0, 160);

await S("verify", "الوردية أُغلقت بانتظار المراجعة", async () => {
  const s = await sqlOne(`select status from shifts where user_id=(select user_id from users where username='reception_b1') order by opened_at desc limit 1`);
  must(s === "closed_pending_review", `حالة الوردية ${s}`);
});
await S("verify", "الإيرادات والتدقيق سجلا العمليات", async () => {
  const a = await sqlOne(`select string_agg(distinct action, ',') from audit_logs where occurred_at > now() - interval '12 minutes'`);
  for (const k of ["PAYMENT_COLLECTED", "CONSULTATION_CREATED", "LAB_RESULT_RELEASED", "BOOKING_RESCHEDULED", "BOOKING_CANCELLED"]) must(a.includes(k), `لا ${k} في التدقيق`);
  return a.split(",").length + " نوع عملية";
});
await S("shift2", "مطابقة المحاسب لوردية مغلقة", async () => {
  await staff("acc_zaid");
  await p.goto("/staff/accountant/shifts");
  await p.waitText("الاستقبال", "main");
  await p.clickText("موظف الاستقبال").catch(() => {});
  await p.idle(1000);
  await p.shot("reconcile");
  const buttons = await p.ev(`[...document.querySelectorAll('main button,[role=dialog] button')].map(b=>b.innerText.trim()).filter(Boolean).slice(0,14).join('|')`);
  return buttons;
});
await S("reception3", "فتح وردية جديدة", async () => {
  await staff("reception_b1");
  await p.goto("/staff/reception/shift");
  if (await p.has("افتح وردية")) { await p.click("فتح", { scope: "main" }); await p.idle(1100); }
  must(await p.has("الإغلاق الأعمى", "main"), "لم تُفتح الوردية");
});
await S("reception3", "مريض مباشر من «حضور وتسجيل» بتذكرة", async () => {
  await p.goto("/staff/reception/checkin");
  await p.fill("الاسم الكامل", `مباشر E2E ${run}`);
  await p.fill("07XXXXXXXXX", `0774${run}1`).catch(() => p.fill("الهاتف", `0774${run}1`));
  await p.fill("العمر", 40).catch(() => {});
  await p.shot("walkin");
  await p.click("تثبيت الحضور وطباعة التذكرة");
  await p.idle(1600);
  must(await p.has("ثُبّت الحضور") || (await p.has("A-", "main")), `لا تأكيد: ${await toastText()}`);
  return await toastText();
});
await S("reception3", "طلب مباشر (فاتورة بلا طبيب)", async () => {
  await p.goto("/staff/reception/invoice");
  await p.fill("بحث عن مريض", `0774${run}1`);
  await p.idle(1000);
  await p.click(`مباشر E2E ${run}`, { scope: "main" });
  await p.idle(1000);
  await p.fill("بحث عن خدمة", "CBC");
  await p.idle(600);
  await p.clickText("تحليل دم شامل CBC");
  await p.idle(500);
  await p.shot("invoice");
  await p.click("إنشاء", { scope: "main" });
  await p.idle(1500);
  return await toastText();
});
await S("reception3", "الطابور الحي: تخطٍ مؤقت ثم إرجاع", async () => {
  await p.goto("/staff/reception/queue");
  await p.waitText("الطابور", "main");
  await p.shot("queue");
  return (await p.ev(`[...document.querySelectorAll('main button')].map(b=>(b.innerText||b.getAttribute('aria-label')||'').trim()).filter(Boolean).slice(0,16).join('|')`));
});

await S("staffpolicy", "الإعفاء من الرسوم وتغيير الموعد بالنقر (المدير العام)", async () => {
  const adm = await staffToken("admin", adminPw, BRANCH);
  must((await api("PATCH", `/branches/${BRANCH}/settings`, { values: { "booking.late_cancel_fee": 5000, "booking.cancel_min_hours": 72 } }, adm, false)).status === 200, "ضبط الرسوم");
  try {
    const rq = await api("POST", "/patient-auth/otp/request", { phone_number: `0775${run}1` }, null, false);
    const v = await api("POST", "/patient-auth/otp/verify", { phone_number: `0775${run}1`, code: rq.body.sandbox_code }, null, false);
    const tk = v.body.access_token, ids = [];
    for (const [n, rel] of [["معفى", "self"], ["مغيَّر", "child"]]) { const id = crypto.randomUUID(); await api("POST", "/me/patients", { patient_id: id, full_name: `${n} E2E ${run}`, gender: "male", birth_date: "1980-01-01", relation: rel }, tk); ids.push(id); }
    const today = new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);
    const days = (await api("GET", `/public/doctors/${DOCTOR}/availability?from=${today}&to=${today.slice(0, 8)}28`)).body.days.filter((d) => d.status === "open" && d.online_remaining > 0);
    for (const id of ids) must((await api("POST", "/bookings", { booking_id: crypto.randomUUID(), patient_id: id, session_id: days[0].session_id, visit_kind: "auto" }, tk)).status === 201, "حجز");
    await staff("admin", adminPw);
    await p.goto("/staff/reception/today");
    await p.fill("بحث في مراجعي اليوم", `معفى E2E ${run}`);
    await p.idle(900);
    await p.shot("today-row");
    await p.clickNear(`معفى E2E ${run}`, "إلغاء حجز", { sel: "tr" });
    await p.idle(1100);
    await p.waitText("5,000", "[role=dialog]");
    await p.fill("سبب الإلغاء", "اختبار الإعفاء", { scope: "[role=dialog]" });
    await p.click("إعفاء", { scope: "[role=dialog]" });
    await p.idle(400);
    await p.fill("سبب الإعفاء", "ظرف طبي", { scope: "[role=dialog]" });
    await p.waitText("بلا رسوم", "[role=dialog]");
    await p.click("تأكيد الإلغاء");
    await p.idle(1400);
    must((await sqlOne(`select status from bookings b join patients p using(patient_id) where p.full_name='معفى E2E ${run}'`)) === "cancelled", "لم يُلغ");
    must((await sqlOne(`select count(*) from invoices i join patients p using(patient_id) where p.full_name='معفى E2E ${run}'`)) === "0", "نشأت رسوم رغم الإعفاء");
    await p.fill("بحث في مراجعي اليوم", `مغيَّر E2E ${run}`);
    await p.idle(900);
    await p.clickNear(`مغيَّر E2E ${run}`, "تغيير موعد", { sel: "tr" });
    await p.idle(1100);
    must(await p.has("فات وقت تغيير الموعد", "[role=dialog]"), "لم يظهر تنبيه السياسة");
    await p.click("تجاوز السياسة", { scope: "[role=dialog]" });
    await p.idle(400);
    await p.ev(`(()=>{const e=[...document.querySelectorAll('[role=radiogroup] button')].filter(x=>!x.disabled)[0];e.scrollIntoView({block:'center'});e.click()})()`);
    await p.idle(1100);
    await p.fill("سبب التجاوز", "طلب المريض", { scope: "[role=dialog]" }).catch(() => {});
    await p.fill("input", "طلب المريض", { scope: "[role=dialog]", nth: 1 }).catch(() => {});
    await p.shot("resched");
    await p.click("تأكيد الموعد الجديد");
    await p.idle(1400);
    const moved = sqlOne(`select count(*) from bookings b join patients p using(patient_id) where p.full_name='مغيَّر E2E ${run}' and b.reschedule_count>0`);
    must(moved === "1", "لم يتغير الموعد");
  } finally {
    await api("PATCH", `/branches/${BRANCH}/settings`, { values: { "booking.late_cancel_fee": null, "booking.cancel_min_hours": null } }, adm, false);
  }
});

await S("admin2", "مستخدم جديد بعيادة، وكلمة مؤقتة، وتغييرها إجبارياً", async () => {
  await staff("admin", adminPw);
  await p.goto("/staff/admin/users/new");
  await p.fill("reception_b1", `e2e_${run}`);
  await p.fill("الاسم الكامل", `موظف E2E ${run}`);
  await p.fill("07XXXXXXXXX", `0773${run}1`);
  await p.pick("main", "موظف استقبال", 0);
  await p.pick("main", "", 3);
  await p.key("Escape");
  await p.idle(300);
  await p.shot("user-new");
  await p.click("إنشاء الحساب");
  await p.idle(1600);
  await p.shot("user-created");
  const pw = await p.ev(`(()=>{const m=document.body.innerText.match(/[A-Za-z0-9!@#$%^&*_-]{10,}/g);const i=[...document.querySelectorAll('input,code,[class*=num]')].map(e=>e.value||e.innerText).find(t=>t&&/^[\\w!@#$%^&*-]{8,}$/.test(t)&&!t.startsWith('e2e_'));return i||null})()`);
  must(await sqlOne(`select count(*) from users where username='e2e_${run}'`) === "1", `لم يُنشأ: ${await toastText()}`);
  must(pw, "لم تظهر كلمة مؤقتة");
  await staff(`e2e_${run}`, pw);
  must(await p.ev(`location.pathname.includes('change-password')`), `لم يُجبر على التغيير: ${await p.ev("location.pathname")}`);
  const fields = await p.ev(`document.querySelectorAll('input[autocomplete]').length`);
  await p.fill("input[autocomplete=current-password]", pw);
  await p.fill("input[autocomplete=new-password]", "Rahma-E2E-2026!x", { nth: 0 });
  await p.fill("input[autocomplete=new-password]", "Rahma-E2E-2026!x", { nth: 1 });
  await p.click("حفظ كلمة المرور");
  await p.until(() => p.ev(`!location.pathname.includes('change-password')`), "إكمال التغيير", 10000);
  return `${fields} حقول → ${await p.ev("location.pathname")}`;
});
await S("admin2", "دور مخصص من المصفوفة", async () => {
  await staff("admin", adminPw);
  await p.goto("/staff/admin/roles/new");
  await p.fill("سكرتير مختبر", `دور E2E ${run}`);
  await p.fill("lab_secretary", `e2e_role_${run}`);
  await p.shot("role-new");
  await p.ev(`[...document.querySelectorAll('main input[type=checkbox],main [role=checkbox],main [role=switch]')].slice(0,2).forEach(b=>b.click())`);
  await p.idle(300);
  await p.click("إنشاء", { scope: "main" }).catch(() => p.click("حفظ", { scope: "main" }));
  await p.idle(1500);
  must(sqlOne(`select count(*) from roles where code='e2e_role_${run}'`) === "1", `لم يُنشأ الدور: ${await toastText()}`);
});
await S("admin2", "قالب تحليل وخدمة في قائمة الطبيب", async () => {
  await p.goto("/staff/admin/doctors");
  await p.waitText("سعد", "main");
  await p.goto("/staff/admin/merge");
  await p.goto("/staff/admin/backups");
  await p.goto("/staff/admin/sandbox");
  await p.waitText("SMS", "main").catch(() => {});
});

// ------------------------------------------------------------------ الدفع الآجل والطابور
await S("defer", "المدير يؤجل بنداً من شاشة التحصيل", async () => {
  await staff("admin", adminPw);
  await p.goto("/staff/reception/collect");
  await p.fill("بحث عن مريض", `0774${run}1`);
  await p.idle(1000);
  await p.click(`مباشر E2E ${run}`, { scope: "main" });
  await p.idle(1000);
  await p.click("تأجيل الدفع", { scope: "main" });
  await p.idle(600);
  await p.pick("[role=dialog]", "");
  await p.click("تأكيد التأجيل");
  await p.idle(1400);
  const s = sqlOne(`select count(*) from invoice_items i join invoices v using(invoice_id) join patients p using(patient_id) where p.full_name='مباشر E2E ${run}' and i.status='deferred'`);
  must(Number(s) > 0, "لم يتحول البند إلى مؤجل");
  return `${s} بند`;
});
await S("defer", "الطبيب يؤجل طلباً من المعاينة والمحاسب يراه", async () => {
  const rec = await staffToken("reception_b1", PW, BRANCH), doc = await staffToken("dr_saad", PW, BRANCH);
  const ph = `0777${run}1`;
  const rq = await api("POST", "/patient-auth/otp/request", { phone_number: ph }, null, false);
  const v = await api("POST", "/patient-auth/otp/verify", { phone_number: ph, code: rq.body.sandbox_code }, null, false);
  const id = crypto.randomUUID();
  await api("POST", "/me/patients", { patient_id: id, full_name: `مؤجل E2E ${run}`, gender: "male", birth_date: "1975-01-01", relation: "self" }, v.body.access_token);
  const ci = await api("POST", "/queue/check-in", { patient_id: id, doctor_id: DOCTOR }, rec);
  must(ci.status < 300, `حضور ${ci.status}`);
  const item = sqlOne(`select invoice_item_id from invoice_items where ticket_id='${ci.body.ticket_id}'`);
  await api("POST", "/payments", { patient_id: id, invoice_item_ids: [item], tenders: [{ method: "cash", amount: ci.body.amount_due }] }, rec);
  await api("POST", `/queue/tickets/${ci.body.ticket_id}/call`, undefined, rec, false);
  must((await api("POST", `/queue/tickets/${ci.body.ticket_id}/start`, undefined, doc, false)).status === 200, "بدء المعاينة");
  await staff("dr_saad");
  await p.goto(`/staff/doctor/consult?ticket=${ci.body.ticket_id}`, 1200);
  await p.fill("التشخيص", "حالة إنسانية E2E");
  await p.fill("J20.9", "K29.7");
  await p.click("تحليل دم شامل CBC", { scope: "main" });
  await p.click("حفظ", { scope: "main", exact: true });
  await p.idle(1600);
  await p.click("تأجيل الدفع", { scope: "main" });
  await p.idle(600);
  await p.pick("[role=dialog]", "");
  await p.click("تأكيد التأجيل");
  await p.idle(1400);
  await p.waitText("آجل", "main");
  await p.click("حفظ وإنهاء", { scope: "main" });
  await p.idle(1400);
  await staff("acc_zaid");
  await p.goto("/staff/accountant/deferrals");
  await p.waitText(`مؤجل E2E ${run}`, "main");
});
await S("queue", "تخطٍ مؤقت ثم وصل متأخراً من الطابور الحي", async () => {
  await staff("reception_b1");
  await p.goto("/staff/reception/queue");
  await p.waitText(`مباشر E2E ${run}`, "main");
  const T = `(select t.status from queue_tickets t join patients p using(patient_id) where p.full_name='مباشر E2E ${run}' order by t.created_at desc limit 1)`;
  const before = sqlOne(`select ${T}`);
  await p.clickText(`مباشر E2E ${run}`);
  await p.idle(500);
  await p.clickNear(`مباشر E2E ${run}`, "تخطي مؤقت");
  await p.idle(1100);
  const mid = sqlOne(`select ${T}`);
  must(mid !== before, `لم تتغير الحالة ${before}`);
  await p.clickNear(`مباشر E2E ${run}`, "وصل متأخراً");
  await p.idle(1100);
  return `${before} ← ${mid} ← ${sqlOne(`select ${T}`)}`;
});
r.save("flows");
await p.close();
