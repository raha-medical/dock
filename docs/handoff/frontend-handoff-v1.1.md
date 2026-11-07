# وثيقة التسليم لفريق الواجهة (v1.1، محدّثة في v1.2-handoff)

- **الوسم:** `v1.2-handoff` على الفرع `staging` في المستودعات الثلاثة (`backend` و `frontend` و `dock`).
- **دليل التشغيل والربط:** `dock/frontend-handoff/README_FRONTEND.md` (التشغيل، الربط، التوكن، الأدوار)، والتشغيل المحلي على Windows: `dock/local-setup/README-LOCAL.md`.
- **عقود الـ API:** `backend/docs/api_contracts.md` (ملف العقود الوحيد، 246 نقطة).
- **متطلبات الواجهات:** `dock/docs/handoff/ui-requirements-handoff.md` (UI-01 إلى UI-135).
- **حسابات التجربة:** `dock/docs/handoff/accounts.md`.

**القاعدة:** الخادم مكتمل لكل الشاشات أدناه. المطلوب **التصميم فقط**: لا يُعدَّل منطق الشاشات ولا استدعاءات الـ API ولا الخادم.

## شاشة النسخ الاحتياطي (UI-119 إلى UI-125)

| | |
|---|---|
| المسار في التطبيق | `/staff/admin/backups` (للمدير العام؛ مدير الفرع يرى الحالة فقط) |
| الصفحة | `frontend/app/staff/(app)/admin/backups/page.tsx` |
| المكوّن | `BackupsScreen` في `frontend/components/admin/system.tsx` |
| استدعاءات الـ API | `backupsApi` في `frontend/lib/api/admin.ts`: `GET /admin/backups/status`، `GET /admin/backups`، `POST /admin/backups/run` («نسخ الآن»، للمدير العام فقط)، `PUT /admin/backups/settings` (`daily_time`، وقت النسخ اليومي) |
| حالة النسخ لمدير الفرع | `GET /branch/backup-status` في `frontend/components/staff/notifications.tsx` |
| الخادم | مكتمل: نسخة يومية تلقائية بالوقت المختار (افتراضياً 03:00 بغداد) مع اللحاق، و«نسخ الآن»، والتحقق من سلامة النسخة، والقرص الخارجي، والاحتفاظ بـ 14 نسخة. الاسترجاع: `backend/docs/backup_restore.md` |

## مساعد Gemini (UI-126 إلى UI-135)

| | |
|---|---|
| المسار في التطبيق | زر عائم في تطبيق المراجعين `/patient`، يظهر بعد الدخول واختيار فرد من الحساب |
| نافذة المحادثة | `AssistantButton` في `frontend/components/patient/assistant.tsx` (التنبيه أعلى المحادثة، الأسئلة المقترحة، بطاقة اقتراح الحجز وزر «تأكيد الحجز»، الطوارئ، «باقي لك اليوم X رسالة»، الصوت، أزرار الإجراءات) |
| موضع الزر وأزرار الإجراءات | `frontend/components/patient/app.tsx` (`onAction`: فتح النتائج أو الوصفات أو الفواتير أو طلب الدعم) |
| استدعاءات الـ API | `GET /assistant/status`، `POST /assistant/chat` (الرد فيه `proposal` و `actions` و `remaining_today`). تأكيد الحجز يستدعي `POST /bookings` الموجودة بنفس `booking_id` |
| بطاقة الإدارة | `AssistantUsageCard` في `frontend/components/admin/assistant-usage.tsx`، داخل صفحة الإحصائيات `/staff/admin/stats` (`frontend/components/admin/stats.tsx`)، من `GET /admin/assistant/stats` (أرقام فقط) |
| التشغيل والحد اليومي | الإعدادات العامة `assistant.enabled` و `assistant.daily_limit` في `/staff/admin/settings` (تظهر تلقائياً من `GET /settings`) |
| رصيد المحفظة | `GET /me/patients/{patientId}/credit` (متاح للتطبيق أيضاً) |
| الخادم | مكتمل: 8 أدوات، حد يومي 30 رسالة، طوارئ 122 من الخادم، لا تشخيص ولا جرعات، لا قيم طبية للنموذج، ورسائل لطيفة عند الحد والإيقاف والتعطل. التقرير الفعلي: `dock/docs/review/gemini-test-report.md` |
