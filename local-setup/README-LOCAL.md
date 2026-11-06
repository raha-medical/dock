# نسخة العمل (Staging) لمجمع الرحمة

**كل العمل يتم هنا فقط.** المجلد `D:\Progect\alrahma_midical` هو النسخة المستقرة v1.0 على الفرع `main`، فلا تعمل فيه ولا تشغّله للتجربة.

## الهيكل
```
alrahma-staging/
├─ backend/    ← github.com/raha-medical/backend   (الفرع staging)
├─ frontend/   ← github.com/raha-medical/frontend  (الفرع staging)
├─ dock/       ← github.com/raha-medical/dock      (الفرع staging)
├─ local-data/ (محلي، لا يُرفع)
│  ├─ s3/      بيانات التخزين الخاصة بـ staging و s3.json
│  └─ keys/    مفتاح توقيع الدرج الخاص بـ staging (يُنشأ تلقائياً عند أول تشغيل)
├─ start-native.bat   التشغيل بدون Docker (الطريقة المعتمدة)
├─ start-dev.bat      التشغيل عبر Docker (انظر الملاحظات)
├─ run-tests.bat , build-check.bat , pg-env.bat
├─ local-env.bat      كلمة مرور PostgreSQL (محلي، لا يُرفع)
└─ DEV_ACCOUNTS.local.txt
```

## التشغيل
```
D:\Progect\alrahma-staging\start-native.bat
```
يقوم هذا الأمر بما يلي:
1. يقرأ كلمة مرور PostgreSQL من `local-env.bat`.
2. يطبّق الترحيلات على `alrahma_staging`. الترحيلات آمنة للتكرار.
3. يشغّل التخزين والخادم ومحاكي الوكيل والواجهة.
4. يفتح `http://localhost:3001/staff/login`.

حسابات الدخول موجودة في `DEV_ACCOUNTS.local.txt`.

## المساعد الذكي (Gemini)
- المفتاح في `local-env.bat` فقط، بسطر واحد: `set "GEMINI_API_KEY=..."`. واختيارياً `set "GEMINI_MODEL=gemini-3.8-flash"` (الافتراضي `gemini-3.5-flash-lite`).
- لا تضع المفتاح في أي مستودع ولا في `backend\.env` ولا `appsettings*.json` ولا `frontend\.env.local` (الأخير يصل للمتصفح).
- `start-native.bat` يمرر المفتاح لنافذة الخادم وحدها (`Assistant__Provider=gemini`)، ويمسحه قبل نافذتي المحاكي والواجهة. بدون المفتاح يعمل المساعد بالوضع التجريبي.
- **تحذير: المفتاح الحالي للتجربة على `alrahma_staging` فقط.** في الطبقة المجانية تستخدم Google نصوص الطلبات والردود لتحسين منتجاتها. **قبل أي مراجع حقيقي يجب أن يكون المفتاح من مشروع Google Cloud مفعّل فيه الفوترة.**
- التشغيل والإيقاف والحد اليومي (30 رسالة لكل مراجع) من الإعدادات العامة في لوحة الإدارة، والأرقام اليومية في صفحة الإحصائيات (بطاقة «استخدام المساعد الذكي»).

## المنافذ
| الخدمة | staging (هنا) | المستقرة |
|---|---|---|
| الواجهة | **3001** | 3000 |
| الخادم API | **8089** | 8088 |
| محاكي الوكيل | **9444** | 9443 |
| تخزين S3 | **9010** (داخلياً 9334 / 18081 / 8889) | 9000 (9333 / 18080 / 8888) |

الواجهة تتصل بالخادم على 8089 عبر `API_PROXY_TARGET` في `frontend/.env.local`.

## القاعدة والتخزين
- قاعدة البيانات: **`alrahma_staging`** على PostgreSQL 16 المحلي (المنفذ 5432). أُنشئت من `D:\Progect\_backups\alrahma-db-v1.0-stable.dump`.
- القاعدة المستقرة `alrahma_db` لا يستخدمها أي ملف هنا. ولا تلمس `alhawaraaMedical-db` ولا أي قاعدة أخرى على السيرفر.
- التخزين: الـ bucket اسمه **`medical-staging`**، ويعمل على خادم SeaweedFS منفصل بياناته في `local-data\s3\data`.
- أول مرة فقط: بعد تشغيل التخزين أنشئ الـ bucket من نافذة ثانية بهذا الأمر:
  ```
  echo s3.bucket.create -name medical-staging | D:\Progect\_tools\weed.exe shell -master=127.0.0.1:9334
  ```
- لإعادة قاعدة staging إلى النسخة المستقرة (يحذف كل بيانات staging):
  ```
  dropdb -U postgres alrahma_staging
  createdb -U postgres alrahma_staging
  pg_restore -U postgres -d alrahma_staging --no-owner --no-tablespaces D:\Progect\_backups\alrahma-db-v1.0-stable.dump
  ```

## سير العمل في git
- `main` هو النسخة المستقرة ولا يُعدَّل مباشرة أبداً.
- كل جلسة عمل على فرع من `staging`، مثل `git switch -c fix/session-2 staging`. بعد التجربة يُدمج الفرع في `staging`.
- عند التسليم يُدمج `staging` في `main` ويوضع الوسم `v1.1`.

## ملاحظات
- لا تنسخ المجلد `DB\` من النسخة المستقرة إلى هنا.
- مفتاح الدرج هنا يختلف عن مفتاح النسخة المستقرة، لذلك الإيصالات الموقّعة في المستقرة لا تُتحقق هنا.
- `start-dev.bat` (Docker) يستخدم مشروع Docker منفصلاً `alrahma-staging`، فحاوياته وبياناته منفصلة عن المستقرة. لكن ملف `docker-compose.yml` ينشر الخادم على 8088، فلا تشغّله مع نسخة Docker المستقرة في الوقت نفسه. Docker غير مثبت حالياً على هذا الجهاز.
