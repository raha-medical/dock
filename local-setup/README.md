# ملفات التشغيل المحلي (جذر المجلد)

هذه الملفات تعمل من **جذر** المجلد الذي يضم المستودعات الثلاثة، لا من داخل dock. انسخها مرة واحدة:

```
alrahma-staging/
├─ backend/  frontend/  dock/
├─ start-native.bat   ← التشغيل بلا Docker (الخادم 8089، الواجهة 3001، التخزين 9010)
├─ pg-env.bat         ← يجد PostgreSQL (يستدعيه start-native.bat و backend\setup-db.bat و run-tests.bat)
├─ local-env.bat      ← انسخه من local-env.example.bat وضع فيه كلمة مرور PostgreSQL (لا يُرفع)
├─ run-tests.bat , build-check.bat , start-dev.bat
└─ README-LOCAL.md    ← المنافذ وسير العمل
```

```
copy dock\local-setup\*.bat .
copy dock\local-setup\README-LOCAL.md .
copy local-env.example.bat local-env.bat
```
ثم: `backend\setup-db.bat alrahma_staging` و `start-native.bat`. الحسابات في `dock/docs/handoff/accounts.md`.
