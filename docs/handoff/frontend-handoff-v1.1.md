# وثيقة التسليم لفريق الواجهة (v1.1، محدّثة في v1.3-handoff)

- **الوسم:** `v1.3-handoff` على الفرع `staging` في المستودعات الثلاثة (`backend` و `frontend` و `dock`).
- **دليل التشغيل والربط:** `dock/frontend-handoff/README_FRONTEND.md` (التشغيل، الربط، التوكن، الأدوار)، والتشغيل المحلي على Windows: `dock/local-setup/README-LOCAL.md`.
- **عقود الـ API:** `backend/docs/api_contracts.md` (ملف العقود الوحيد، 247 نقطة).
- **متطلبات الواجهات:** `dock/docs/handoff/ui-requirements-handoff.md` (UI-01 إلى UI-141).
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

## الإشعارات و«حان دورك» (UI-136 إلى UI-141)

| | |
|---|---|
| نغمة وتنبيه منبثق للإشعار الجديد (UI-136) | `usePatientLive` في `frontend/components/patient/app.tsx` (حدث `notification.created`)، والأصوات في `frontend/lib/patient/alert-sound.ts`. الشارة: `PatientBell` في نفس الملف |
| كتم صوت الإشعارات (UI-137) | `MuteNotifs` في `frontend/components/patient/app.tsx`، داخل حسابي ← الإشعارات (تفضيل محلي على الجهاز) |
| شاشة «حان دورك» الكاملة (UI-138، UI-139) | `TurnAlert` في `frontend/components/patient/app.tsx`: من `GET /me/queue-tickets` (تذكرة `called` بلا `call_acknowledged_at`)، ونغمة واهتزاز من `startTurnAlarm`، وزر «تم، أنا قادم» يستدعي `POST /me/queue-tickets/{id}/acknowledge-call`. تظهر عند الفتح والعودة من الخلفية (`visibilitychange`) وعند حدث `queue.call_alert` |
| شارة الاستقبال (UI-140) | `Tag` في `frontend/components/reception/queue-screen.tsx`: «نُبّه في التطبيق · بانتظار رده»، «أكّد أنه قادم · الوقت»، «لم يرد» من `call_ack_status` و`call_ack_deadline` في `GET /queue/live` (تنقلب عند المهلة دون تحديث) |
| إعداد المهلة (UI-141) | `queue.call_ack_timeout_minutes` يظهر تلقائياً في إعدادات الفرع (`/staff/admin/settings`) |
| تأخر الطبيب ورسائل الإلغاء | زر «تأخر الطبيب» في `DayControls` بـ `frontend/components/reception/queue-screen.tsx` (`POST /queue/sessions/{id}/delay`)؛ رابط خيارات المبلغ في الإشعار يفتح «حجوزاتي» (`?tab=bookings&cancel_options=`) |
| شاشة الانتظار | النداء الصوتي العربي وزر «تفعيل الصوت» في `frontend/components/display/display.tsx` و`frontend/lib/display/announce.ts` (ملفات الأرقام الاحتياطية: `frontend/public/sounds/ar/README.md`) |
| الخادم | مكتمل لكل ما سبق (العقود: القسم 7 و18.y). المطلوب التصميم فقط. Web Push وSMS وواتساب غير منفذة |

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
