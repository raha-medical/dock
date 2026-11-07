# سجل التغييرات (dock)

## v1.2-handoff (2026-11-07)

### خريطة الفروع وإحصائياتها
- متطلبات تصميم الخريطة وإضافة الفروع للمدير العام في `docs/handoff/ui-requirements-handoff.md` (UI-83 إلى UI-99).

### النسخ الاحتياطي
- `dev-scripts/start-native.bat`: تفعيل النسخ الأصلي (`Backup__Mode=native`)، و`docs/review/backup-audit.md` محدّث.

### مساعد Gemini
- `local-setup/start-native.bat`: المفتاح `GEMINI_API_KEY` لنافذة الخادم وحدها، و`Assistant__Provider=gemini` و`Assistant__Model`، ومسحه قبل النوافذ الأخرى. سطر مثال معلّق في `local-env.example.bat`، وتحذير المفتاح المدفوع قبل الإطلاق في `README-LOCAL.md`.
- `docs/review/gemini-plan.md` و `docs/review/gemini-test-report.md` (11 اختباراً حقيقياً ناجحاً ومقارنة النموذجين).

### وثائق التسليم
- `docs/handoff/ui-requirements-handoff.md` (135 بنداً)، و`docs/handoff/frontend-handoff-v1.1.md` (شاشتا النسخ الاحتياطي والمساعد)، و`docs/handoff/accounts.md`.
- `docs/review/requirements-report.md`: قسم «متطلبات وقرارات أُضيفت أثناء التنفيذ»، و`docs/review/progress-report.md` محدّث.
