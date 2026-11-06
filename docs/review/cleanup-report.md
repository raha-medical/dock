# تقرير فحص وتنظيف مشروع مجمع الرحمة (المرحلة 1: فحص فقط)

**التاريخ:** 2026-11-05  
**المسار:** `D:\Progect\alrahma_midical`  
**ملاحظة:** لم يُحذف ولم يُعدَّل أي ملف. الملف الوحيد الذي أُنشئ هو هذا التقرير.

---

## الخلاصة

| البند | القيمة |
|---|---|
| الحجم الحالي | **≈ 1.34 GB** (حوالي 1.4 GB على القرص، 18,631 ملفاً) وليس 600 MB |
| السبب الحقيقي للحجم | **ذاكرة البناء المؤقتة لـ Next.js** (`alrahma-frontend/.next/cache` ≈ 696 MB) ثم `node_modules` (≈ 391–421 MB). ملفات الاختبارات المولَّدة صغيرة (≈ 1.7 MB فقط) |
| ما يمكن حذفه بأمان (أ) | **≈ 1,170 MB** |
| الحجم المتوقع بعد حذف (أ) فقط | **≈ 175 MB** |
| بعد (أ) + نقل `weed.exe` خارج المشروع (ب) | **≈ 30 MB** |
| مستودع git | **لا يوجد `.git` إطلاقاً** في المجلد الرئيسي أو أي مجلد فرعي |

> تنبيه مهم: خطوة التحقق في المرحلة 2 (تثبيت الحزم ثم البناء) ستعيد `node_modules` (~400 MB) ومجلد `.next` (بحجم أصغر، بضع عشرات من الميغابايت بدون ذاكرة التطوير). لذلك الحجم الفعلي بعد التحقق سيكون تقريباً **≈ 600 MB**، وهذا طبيعي لأن هذه الملفات مستبعدة من git ولا تُنقل مع المشروع.

---

## 1. هيكل المشروع والتقنيات

| المجلد | الوصف | التقنية |
|---|---|---|
| `alrahma-frontend/` | الواجهات كلها في تطبيق واحد: العامة `(public)`، الموظفين `staff`، **تطبيق المراجعين `patient`**، شاشة الانتظار `display`، `hub` | Next.js 15 + React 19 + Tailwind 3 + TypeScript، مع TanStack Query و Zustand و Dexie (عمل بدون إنترنت) و SignalR و Leaflet |
| `alrahma-backend-final/` | الخادم الخلفي (Clean Architecture: Api / Application / Domain / Infrastructure) + اختبارات تكامل `tests/AlRahma.Api.Tests` + ترحيلات `database/migrations` | .NET 8 (ASP.NET Core)، PostgreSQL 16، تخزين S3 (MinIO / SeaweedFS)، Docker Compose |
| `alrahma-database-and-api/` | نسخة **قديمة** من المخطط والترحيلات والعقود (ترحيلاتها تتوقف قبل 007) | SQL / Markdown |
| `DB/` | بيانات PostgreSQL الحية (tablespace) + نسخ احتياطية + مفتاح توقيع الدرج | PostgreSQL 16 |
| `tools/` | `s3` (خادم تخزين SeaweedFS `weed.exe` + بياناته)، `e2e` (سكربتات فحص شامل بالمتصفح ومخرجاتها)، `agent-simulator` | Node.js |
| `هوية بصرية لمجمع الرحمة/` | تصاميم الهوية والشاشات (HTML) + صور مرفوعة + مجلد tmp | HTML / PNG |
| `frontend-handoff/`, `docs-e2e/`, `*.md` | توثيق، swagger، تقارير الفحص | — |
| `_sync/` | حزم مزامنة مؤقتة (tgz) | — |
| `_removed_assets/` | رسومات SVG أُزيلت من الواجهة | — |

### طريقة التشغيل
- **`start-dev.bat`**: يشغّل الخادم عبر Docker (`docker compose up --build`، المنفذ 8088) ثم الواجهة `npx next dev -p 3000` ويفتح `http://localhost:3000/staff/login`.
- **`start-native.bat`**: تشغيل بدون Docker (PostgreSQL محلي + `weed.exe` للتخزين + `dotnet` + Next.js).
- **`run-tests.bat`**: اختبارات تكامل الخادم `dotnet test` على PostgreSQL محلي (يحتاج .NET 8).
- **`build-check.bat`**: فحص البناء.
- الواجهة: `npm install` ثم `npm run dev` / `npm run build` / `npm run typecheck`. **لا توجد اختبارات للواجهة** (لا يوجد سكربت `test` في `package.json`).

---

## 2. أكبر المجلدات (حجم على القرص)

| # | المجلد | الحجم |
|---|---|---|
| 1 | `alrahma-frontend/` | 1.2 GB |
| 2 | `alrahma-frontend/.next/` | 709 MB |
| 3 | `alrahma-frontend/.next/cache/webpack/` | 696 MB |
| 4 | `alrahma-frontend/node_modules/` | 421 MB |
| 5 | `alrahma-frontend/node_modules/next/` | 150 MB |
| 6 | `tools/s3/` | 147 MB |
| 7 | `alrahma-frontend/node_modules/@next/swc-win32-x64-msvc/` | 142 MB |
| 8 | `alrahma-backend-final/` | 70 MB |
| 9 | `alrahma-backend-final/tests/AlRahma.Api.Tests/` | 38 MB |
| 10 | `alrahma-backend-final/tests/AlRahma.Api.Tests/bin/` | 35 MB |
| 11 | `alrahma-frontend/node_modules/lucide-react/` | 34 MB |
| 12 | `alrahma-backend-final/src/` | 32 MB |
| 13 | `alrahma-frontend/node_modules/typescript/` | 23 MB |
| 14 | `alrahma-frontend/node_modules/@img/sharp-win32-x64/` | 19 MB |
| 15 | `alrahma-backend-final/src/AlRahma.Api/bin/` | 17 MB |
| 16 | `DB/` | 13 MB |
| 17 | `DB/alrahma_db/PG_16_202307071/` | 12 MB |
| 18 | `alrahma-backend-final/src/AlRahma.Application/` | 9.4 MB |
| 19 | `alrahma-frontend/.next/server/` | 8.7 MB |
| 20 | `alrahma-frontend/node_modules/react-dom/` | 7.8 MB |
| 21 | `alrahma-frontend/node_modules/@tanstack/` | 7.0 MB |
| 22 | `alrahma-frontend/node_modules/tailwindcss/` | 5.9 MB |
| 23 | `هوية بصرية لمجمع الرحمة/` | 5.7 MB |
| 24 | `alrahma-backend-final/src/AlRahma.Application/obj/` | 4.9 MB |
| 25 | `alrahma-frontend/node_modules/leaflet/` | 3.9 MB |
| 26 | `alrahma-backend-final/src/AlRahma.Infrastructure/bin/` | 3.7 MB |
| 27 | `alrahma-backend-final/src/AlRahma.Application/bin/` | 3.6 MB |
| 28 | `alrahma-frontend/public/` | 3.2 MB |
| 29 | `alrahma-frontend/.next/static/` | 3.2 MB |
| 30 | `هوية بصرية لمجمع الرحمة/uploads/` | 2.9 MB |

## 3. أكبر الملفات

| # | الملف | الحجم |
|---|---|---|
| 1 | `tools/s3/weed.exe` | 146.0 MB |
| 2 | `node_modules/@next/swc-win32-x64-msvc/next-swc.win32-x64-msvc.node` | 141.5 MB |
| 3 | `.next/cache/webpack/server-production/0.pack` | 127.0 MB |
| 4 | `.next/cache/webpack/client-development/30.pack.gz` | 100.5 MB |
| 5 | `.next/cache/webpack/client-production/0.pack` | 88.0 MB |
| 6 | `.next/cache/webpack/server-development/12.pack.gz` | 39.4 MB |
| 7 | `.next/cache/webpack/client-development/15.pack.gz` | 33.6 MB |
| 8 | `.next/cache/webpack/server-development/52.pack.gz` | 27.8 MB |
| 9 | `node_modules/@img/sharp-win32-x64/lib/libvips-42.dll` | 18.1 MB |
| 10 | `.next/cache/webpack/server-production/index.pack` | 16.0 MB |
| 11 | `.next/cache/webpack/server-production/index.pack.old` | 16.0 MB |
| 12 | `.next/cache/webpack/server-development/23.pack.gz` | 14.6 MB |
| 13 | `.next/cache/webpack/client-development/23.pack.gz` | 11.6 MB |
| 14 | `.next/cache/webpack/client-development/42.pack.gz` | 11.1 MB |
| 15 | `.next/cache/webpack/client-development/31.pack.gz` | 10.9 MB |
| 16 | `.next/cache/webpack/client-development/35.pack.gz` | 10.6 MB |
| 17 | `.next/cache/webpack/client-production/index.pack` | 8.8 MB |
| 18 | `.next/cache/webpack/client-production/index.pack.old` | 8.8 MB |
| 19 | `.next/cache/webpack/client-development/38.pack.gz` | 8.7 MB |
| 20 | `node_modules/typescript/lib/typescript.js` | 8.7 MB |
| 21 | `.next/cache/webpack/client-development/12.pack.gz` | 7.5 MB |
| 22 | `.next/cache/webpack/client-development/43.pack.gz` | 7.4 MB |
| 23 | `.next/cache/webpack/server-development/27.pack.gz` | 6.3 MB |
| 24 | `.next/cache/webpack/server-production/4.pack` | 6.1 MB |
| 25 | `node_modules/typescript/lib/_tsc.js` | 5.9 MB |
| 26 | `.next/cache/webpack/server-development/10.pack.gz` | 5.8 MB |
| 27 | `node_modules/tailwindcss/peers/index.js` | 4.3 MB |
| 28 | `node_modules/lucide-react/dist/umd/lucide-react.js.map` | 4.2 MB |
| 29 | `node_modules/lucide-react/dist/cjs/lucide-react.js.map` | 4.1 MB |
| 30 | `node_modules/next/dist/server/capsize-font-metrics.json` | 4.1 MB |

(المسارات المختصرة أعلاه كلها تحت `alrahma-frontend/`.)

أكبر ملفات خارج `node_modules` و `.next` و `bin/obj`: صور `هوية بصرية…/uploads/pasted-*.png` (حتى 821 KB)، نسخ `DB/backups/*` (220–400 KB لكل منها)، حزم `_sync/*.tgz` (حتى 188 KB)، صور `public/photos/**` (حتى 177 KB).

---

## 4. التصنيف

### (أ) آمن للحذف، يُعاد توليده تلقائياً — المجموع ≈ 1,170 MB

| العنصر | الحجم | كيف يعود |
|---|---|---|
| `alrahma-frontend/.next/` (منها `cache/` ≈ 696 MB) | 709 MB | `npm run build` / `npm run dev` |
| `alrahma-frontend/node_modules/` | 421 MB | `npm install` (يوجد `package-lock.json`) |
| `alrahma-backend-final/**/bin/` و `**/obj/` (10 مجلدات) | 68 MB | `dotnet build` / `dotnet restore` |
| `tools/e2e/out/` (20 لقطة jpg + 53 html + 3 json من فحوص المتصفح) | 1.6 MB | إعادة تشغيل `tools/e2e/*.mjs` |
| `tools/agent-simulator/out/` | 145 KB | إعادة تشغيل `agent-sim.mjs` |
| `alrahma-frontend/tsconfig.tsbuildinfo` | 168 KB | `tsc` / البناء |
| `tests.log`, `build.log` (في الجذر) | 12 KB | `run-tests.bat` / `build-check.bat` |
| `DB/move-db.log` | 4 KB | سجل |

لم أجد: `dist`, `build`, `.nuxt`, `coverage`, `test-results`, `playwright-report`, `cypress/*`, `.cache`, `.turbo`, `__pycache__`, `vendor`, `TestResults`, `.vs`.

> ملاحظة: `tools/agent-simulator/state.json` (4 KB) ملف حالة، وضعته ضمن (ب) احتياطاً وليس (أ).

### (ب) يحتاج قرارك — المجموع ≈ 155 MB

| العنصر | الحجم | ملاحظتي |
|---|---|---|
| `tools/s3/weed.exe` | 146 MB | خادم التخزين SeaweedFS يستخدمه `start-native.bat`. يمكن تنزيله مجدداً، وهو مستبعد من git أصلاً. اقتراحي: نقله خارج المشروع أو إبقاؤه |
| `tools/s3/data/` | 115 KB | **ملفات مخزّنة فعلاً** (مرفقات/صور رفعها النظام). لا أنصح بحذفه |
| `_sync/` (15 حزمة tgz + `qrx`) | 1.8 MB | حزم مزامنة مراحل سابقة (phase1a…phase2b3). على الأغلب لم تعد لازمة |
| `DB/backups/` (4 ملفات dump/backup + `main_backend_before_sync.tgz`) | 1.5 MB | نسخ احتياطية لقاعدة البيانات قبل ترحيلات 012–016. اقتراحي: إبقاء الأحدث على الأقل |
| `هوية بصرية لمجمع الرحمة/uploads/` | 2.9 MB | صور مرفوعة لتصاميم الهوية |
| `هوية بصرية لمجمع الرحمة/tmp/` | 872 KB | لقطات وملاحظات مؤقتة (`dbg.jpg`, `notes.md`, …) |
| `alrahma-database-and-api/` | 304 KB | **نسخة قديمة** من المخطط والترحيلات (تنقصها 007–011 وما بعدها) والعقود. النسخة الحالية في `alrahma-backend-final/database` |
| `api_contracts.md` (الجذر) | 192 KB | **مكرر** مطابق بايتاً بنسخة `alrahma-database-and-api/…/api_contracts.md` (وهي النسخة الأقدم). النسخة الأحدث موجودة مرتين متطابقتين في `alrahma-backend-final/docs/` و `alrahma-frontend/docs/backend/` |
| `docs-e2e/` | 132 KB | تقارير فحص سابقة (توثيق) |
| `_removed_assets/` | 38 KB | رسومات SVG أُزيلت من الواجهة |
| `tools/agent-simulator/state.json` | 4 KB | ملف حالة للمحاكي |

### (ج) لا يُلمس أبداً

| العنصر | الحجم | السبب |
|---|---|---|
| `DB/alrahma_db/` | 12 MB | **بيانات PostgreSQL الحية** (tablespace). حذفه يُتلف القاعدة |
| `DB/keys/drawer-es256.pem` | <1 KB | مفتاح توقيع خاص |
| `alrahma-backend-final/src/**` (عدا bin/obj)، `tests/**/*.cs` | ≈ 1 MB | كود مصدري واختبارات |
| `alrahma-backend-final/database/` (migrations + schema) | 191 KB | ملفات الترحيل |
| `alrahma-frontend/app, components, lib, scripts, docs` | ≈ 2 MB | كود مصدري وتوثيق |
| `alrahma-frontend/public/` (photos، الشعار، الأيقونات) | 3.2 MB | أصول مستخدمة في الواجهات |
| ملفات الإعداد: `package.json`, `package-lock.json`, `next.config.mjs`, `tailwind.config.ts`, `*.csproj`, `AlRahma.sln`, `docker-compose.yml`, `Dockerfile`, `appsettings*.json`, `*.bat` | صغيرة | إعداد وتشغيل |
| ملفات البيئة: `alrahma-frontend/.env.local`, `.env.example` (3 ملفات), `DEV_ACCOUNTS.local.txt` | صغيرة | بيئة وأسرار |
| `هوية بصرية لمجمع الرحمة/*.html`, `design_handoff_rahma/` | ≈ 2 MB | تصاميم مرجعية |
| `frontend-handoff/`, `system_architecture.md`, `README*` | صغيرة | توثيق |

---

## 5. مجلد .git

**لا يوجد مستودع git** في `D:\Progect\alrahma_midical` ولا في أي مجلد فرعي (بحثت حتى عمق 4 خارج `node_modules`). لذلك لا يوجد تاريخ يحتوي ملفات كبيرة.

نتيجة مهمة للمرحلة 2: الخطوة 1 (إنشاء فرع `chore/cleanup`) **غير ممكنة** دون إنشاء مستودع git جديد (`git init`) أولاً. هذا يحتاج قرارك (انظر آخر التقرير).

## 6. ملفات .gitignore وما ينقصها

يوجد 4 ملفات: الجذر، `alrahma-backend-final/` (قالب .NET كامل وجيد)، `alrahma-frontend/`، و `DB/`.

**الجذر (`.gitignore`)** يغطي: `local-env.bat`, `DEV_ACCOUNTS.local.txt`, `DB/`, `tools/s3/weed.exe`, `tools/s3/data/`, `tests.log`, `build.log`, `_sync/`. **ينقصه:**
- `tools/e2e/out/` و `tools/agent-simulator/out/` و `tools/agent-simulator/state.json` (مخرجات الاختبارات واللقطات، وهي النقطة الأهم لأنها تتولد مع كل تشغيل)
- `*.log` عام بدلاً من اسمين محددين
- `.env`, `.env.local`, `.env.*.local`, `*.pem`, `*.key` كقاعدة عامة على مستوى المشروع
- مخرجات اختبارات الواجهات المحتملة مستقبلاً: `test-results/`, `playwright-report/`, `coverage/`, `cypress/videos/`, `cypress/screenshots/`
- `node_modules/`, `.cache/`, `.turbo/` على مستوى الجذر (لأي أداة Node في `tools/`)
- `هوية بصرية لمجمع الرحمة/tmp/`
- ملفات النظام: `Thumbs.db`, `.DS_Store`, `desktop.ini`
- `.vs/`, `.idea/`, `.vscode/` (عدا الإعدادات المشتركة)

**`alrahma-frontend/.gitignore`** يغطي `node_modules`, `.next`, `out`, `*.tsbuildinfo`, `.env*`. **ينقصه:** `coverage/`, `test-results/`, `playwright-report/`, `*.log` (`npm-debug.log*`)، `.vercel`.

**`alrahma-backend-final/.gitignore`** جيد (يغطي `bin/`, `obj/`, `*.log`, `.env`, `TestResults`, `*.pfx`). لا نقص مهماً. ملاحظة: لا يستبعد `appsettings.Development.json`، وهو يحتوي مفتاح JWT (انظر القسم التالي).

**`DB/.gitignore`** جيد.

---

## 7. ملفات حساسة رأيتها

لم أنسخ أي قيمة سرية في هذا التقرير.

| الملف | ما فيه | الخطورة | مستبعد من git؟ |
|---|---|---|---|
| `alrahma-backend-final/docker-compose.yml` | كلمات مرور وقيم مكتوبة نصاً لـ: `POSTGRES_PASSWORD`, مفاتيح MinIO, `Jwt__SigningKey`, `Bootstrap__AdminPassword`, `Storage__AccessKey/SecretKey` | متوسطة (قيم تطوير على الأغلب، لكنها في ملف يُرفع) | **لا** |
| `alrahma-backend-final/src/AlRahma.Api/appsettings.Development.json` | `SigningKey` لـ JWT مكتوب نصاً | متوسطة | **لا** |
| `alrahma-backend-final/src/AlRahma.Api/appsettings.json` | سلسلة اتصال بكلمة مرور نائبة (`CHANGE…`)؛ بقية المفاتيح فارغة | منخفضة | لا (مقبول) |
| `DB/keys/drawer-es256.pem` | **مفتاح خاص EC** لتوقيع درج النقود | عالية | نعم (`DB/`) |
| `DEV_ACCOUNTS.local.txt` | حسابات تطوير (14 سطراً، فيها كلمات مرور) | متوسطة | نعم |
| `alrahma-frontend/.env.local` | إعدادات بيئة الواجهة (724 بايت) | منخفضة–متوسطة | نعم |
| `tools/s3/s3.json` | `accessKey` / `secretKey` لخادم التخزين المحلي | متوسطة | **لا** |
| `tests/AlRahma.Api.Tests/*.cs` | كلمات مرور اختبار ثابتة (`Temp-Password-123`…) | منخفضة جداً (بيانات اختبار) | — |

توصية (للعلم فقط، لن أعدّل شيئاً في هذه المهمة): نقل الأسرار في `docker-compose.yml` و `appsettings.Development.json` و `tools/s3/s3.json` إلى ملف `.env` مستبعد، وتغيير هذه القيم قبل أي نشر حقيقي.

---

## 8. قرارات مطلوبة منك قبل المرحلة 2

1. **git:** لا يوجد مستودع. هل أنشئ مستودعاً جديداً (`git init` + أول commit بالوضع الحالي، مع احترام `.gitignore`) ثم الفرع `chore/cleanup`؟ أم أتخطى خطوة الفرع؟
2. **عناصر (ب):** اذكر بالاسم ما توافق على حذفه، مثلاً: `_sync/`، `هوية بصرية…/tmp/`، `alrahma-database-and-api/`، `api_contracts.md` (الجذر)، `_removed_assets/`، `weed.exe`.
3. **التحقق:** اختبارات الخادم (`run-tests.bat`) تحتاج .NET 8 و PostgreSQL محلياً وكلمة مرور PostgreSQL (`PGPASSWORD`). الواجهة لا تملك اختبارات، فسأشغّل `npm run build` و `npm run typecheck` لها.
