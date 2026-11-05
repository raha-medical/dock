# 🔌 عقود الـ APIs - نظام مجمع الرحمة الطبي

**Al-Rahma Medical Complex - Enterprise API Contracts (v5.0)**
**تاريخ الإصدار:** 2026-11-02 (النسخة النهائية: كل الأقسام مبنية ومختبرة، مع إضافات الجزء الثالث)
**المرجع:** وثيقة المتطلبات والهندسة المعمارية v2.1
**يحل محل:** v4.0 (انظر "سجل التغييرات" في نهاية الملف)

---

## 0. القواعد العامة (تنطبق على كل الـ APIs)

### 0.1 العنوان والإصدار
* **Base URL:** `https://api.<domain>/api/v1` (النطاق يُحدد عند النشر، ولا يُكتب اسم المجمع داخل الكود).
* كل الطلبات والردود `application/json; charset=utf-8` عدا رفع الملفات.

### 0.2 المصادقة وتعدد الفروع
* كل الطلبات (عدا المذكور صراحةً كـ Public) ترسل: `Authorization: Bearer <access_token>`.
* **الهوية تؤخذ من التوكن وليس من جسم الطلب:** `user_id`، `role`، و`branch_id` الحالي. لا تُرسل الواجهة `doctor_id` أو `pharmacist_id` أو `cashier_id` للدلالة على المستخدم الحالي.
* الموظف قد يُعيَّن على أكثر من فرع؛ يختار الفرع عند تسجيل الدخول، ويستطيع التبديل عبر `POST /auth/switch-branch`.
* أدوار النظام: `admin` (مدير عام)، `branch_manager` (مدير فرع)، `doctor`، `receptionist` (موظف استقبال عيادة)، `accountant` (محاسب عام)، `lab_tech` (فني مختبر)، `radiologist` (أخصائي أشعة)، `pharmacist` (صيدلي)، `patient` (مستخدم تطبيق المريض).
* كل endpoint أدناه يذكر سطر **الصلاحية** (الأدوار المسموحة).

### 0.3 المعرفات (IDs)
* كل المعرفات **UUID v7** (نصية). يمكن للواجهة توليدها محلياً أثناء العمل أوفلاين وإرسالها مع الطلب، فلا حاجة لجداول "مؤقت ← نهائي".
* للعرض البشري توجد أرقام مقروءة يولدها السيرفر: رقم ملف المريض `file_number` (مثل `R1-004512`)، رقم الفاتورة `invoice_number`، رقم الإيصال `receipt_number`، رقم التذكرة `ticket_number`.
* في الأمثلة تُختصر المعرفات لسهولة القراءة (مثل `"pat_01"`)، وفي الواقع هي UUID كاملة.

### 0.4 المبالغ المالية
* العملة الدينار العراقي (IQD) وتُرسل **أعداداً صحيحة** بلا كسور: `25000` وليس `25000.00`.
* حصة الطبيب تُحسب: `floor(net_price × rate / 100)`، والباقي للمجمع (الكسور لصالح المجمع).
* **الأسعار لا تُرسل من الواجهة أبداً**؛ السيرفر يأخذها من جدول الخدمات.

### 0.5 منع التكرار (Idempotency)
* كل طلب `POST` مالي أو يُنشئ سجلاً يجب أن يحمل الهيدر `Idempotency-Key: <uuid>`.
* إعادة إرسال نفس المفتاح خلال 72 ساعة تُرجع **نفس الرد الأصلي** بدون تنفيذ العملية مرة ثانية، مع الهيدر `Idempotent-Replayed: true`. هذا أساسي مع الإنترنت المتقطع.
* الطلب الذي يفشل (4xx/5xx) لا يُحفظ، فيمكن تصحيحه وإعادته بنفس المفتاح.

### 0.6 صيغة الأخطاء (RFC 7807 Problem Details)
```json
{
  "type": "https://docs.<domain>/errors/PATIENT_BANNED",
  "title": "المريض محظور من الحجز",
  "status": 403,
  "code": "PATIENT_BANNED",
  "detail": "تم حظر المريض بسبب 3 حالات عدم حضور. يلزم دفع عربون لفك الحظر.",
  "trace_id": "00-4bf92f3577b34da6-01",
  "errors": { "phone_number": ["رقم الهاتف غير صالح"] }
}
```
* الحقل `errors` يظهر فقط في أخطاء التحقق (400/422).
* جدول رموز الأخطاء الكامل في الملحق (أ).

### 0.7 الردود الناجحة والقوائم
* الرد الناجح يعيد المورد مباشرة (بدون غلاف `status: success`)، ونجاح العملية يُعرف من رمز HTTP.
* القوائم تعيد: `{ "items": [...], "page": 1, "page_size": 20, "total": 134 }` وتقبل `?page=&page_size=` (الحد الأقصى 100).

### 0.8 الوقت
* كل الأوقات ISO-8601 بتوقيت UTC (`2026-11-02T17:10:00Z`)، والواجهة تعرضها بتوقيت بغداد (UTC+3).
* التواريخ بدون وقت: `YYYY-MM-DD` بتوقيت بغداد.

### 0.9 التحديث المباشر (Real-time)
* قناة **SignalR** على `wss://api.<domain>/hubs/live` بنفس التوكن (`?access_token=` في الرابط، لأن المتصفح لا يرسل ترويسة Authorization مع WebSocket).
* الموظف يُضاف تلقائياً لمجموعة فرعه (`branch:{id}:queue`) ومجموعته (`user:{id}`)، والطبيب لمجموعة طابوره (`doctor:{id}`).
* شاشة الانتظار تتصل بدون توكن ثم تستدعي `JoinDisplay(display_id, display_key)` (تعيد `true` أو `false`).
* أسماء الحقول في الأحداث بنفس صيغة الـ API (snake_case). عند إعادة الاتصال تعيد الواجهة تحميل `GET /queue/live`.
* المجموعات: `branch:{branch_id}:queue`، `doctor:{doctor_id}`، `user:{user_id}`، `display:{display_id}`، و`branch:{branch_id}:finance` (يُضاف إليها تلقائياً من يملك `shifts.review` أو `refunds.approve`)، و`branch:{branch_id}:lab` و`branch:{branch_id}:radiology` (فنيو المختبر وأخصائيو الأشعة)، و`patient_account:{id}` (تطبيق المريض بتوكن المريض).
* الأحداث مذكورة تحت كل وحدة باسم **Real-time events**.

### 0.10 حالة التنفيذ (ما يعمل الآن في الباك اند)
الملف يصف النظام كاملاً. الجدول يبين ما هو مبني ومختبر الآن، وما يأتي في المراحل القادمة **بنفس الشكل الموثق هنا** (لا تتغير العقود عند تنفيذها):

| الحالة | الأقسام |
| --- | --- |
| ✅ يعمل الآن (كل الأقسام) | 1 المصادقة للموظفين وللمريض (OTP)، 2 المستخدمون والصلاحيات، 3 إدارة الفروع والعيادات والمختبرات والأشعة والصيدليات والإغلاق المؤقت وقوائم الاختيار والخدمات والأطباء وصورهم وجداول الدوام والنسب، الأجهزة وشاشات الانتظار، 4 المرضى والدمج والحظر وفكه والسجل الطبي `GET /patients/{id}/history`، 5 الحجز (الاستقبال والهاتف وتطبيق المريض و`GET /bookings/my`)، 6 الدفع الإلكتروني (بوابة تجريبية) وعكسه، 7 الطابور الذكي كاملاً مع SignalR والتقديم الذكي، 8 الفواتير والخصم والاسترجاع، 9 التحصيل والإيصالات و QR وتوكن الدرج، 10 الورديات والإغلاق الأعمى، 11 العيادة والسجل الطبي، 12 المختبر، 13 الأشعة، 14 الاستثناء والدفع الآجل، 15 الصيدلية، 16 الوكيل المحلي (جانب السيرفر)، 17 الأوفلاين والمزامنة، 18 الإشعارات، 19 التقارير والتدقيق، 20 مصاريف الفروع |
| 🧪 وضع تجريبي (Sandbox) | رمز OTP ثابت `000000` يعود في الرد، والـ SMS والـ Push تُسجل ولا تُرسل (`GET /sandbox/messages`)، والدفع الإلكتروني عبر `provider: "sandbox"`. عند ربط المزودين الحقيقيين يتغير الإعداد فقط، **ولا يتغير أي عقد** (يختفي `sandbox_code`، وتُضاف قيم `provider` الجديدة). |

* كل endpoint في هذا الملف مفعّل. أي تعديل لاحق يكون **إضافة فقط** (حقل جديد أو endpoint جديد) ويُذكر في سجل التغييرات.
* القوائم المنسدلة (أسباب الإغلاق، الاختصاصات، العناوين الوظيفية) **لا تُكتب ثابتة في الواجهة**، بل تُقرأ من `GET /lookups/{category}` (انظر 3.2).

---

## 1. المصادقة والجلسات (Authentication)

### `POST /auth/login`
* **الصلاحية:** Public (موظفون فقط).
* **الوصف:** تسجيل دخول الموظف. كلمة المرور تُرسل كما هي عبر HTTPS، والسيرفر يتحقق منها مقابل hash مخزن بـ Argon2id. بعد 5 محاولات فاشلة يُقفل الحساب 15 دقيقة.
* **Request:**
```json
{
  "username": "reception_internal_b1",
  "password": "P@ssw0rd-2026",
  "branch_id": "br_01",
  "device_id": "dev_rec_pc_03"
}
```
* **Response (200):**
```json
{
  "access_token": "eyJhbGciOi...",
  "access_expires_in": 900,
  "refresh_token": "rt_8f3b...",
  "refresh_expires_in": 50400,
  "user": {
    "user_id": "usr_14",
    "full_name": "علي حسن",
    "role": "receptionist",
    "branch_id": "br_01",
    "branch_ids": ["br_01"],
    "clinic_ids": ["cl_internal"],
    "doctor_id": null,
    "permissions": ["patients.write", "payments.collect", "queue.manage"],
    "must_change_password": false
  }
}
```
* **ملاحظة أوفلاين:** صلاحية `refresh_token` = 14 ساعة (طول الوردية)، والواجهة تحتفظ بآخر بيانات المستخدم لتعمل أوفلاين. أي عملية تُنفذ أوفلاين تُسجل باسم هذا المستخدم وتُرفع لاحقاً عبر المزامنة.
* **أخطاء:** `401 INVALID_CREDENTIALS`، `423 ACCOUNT_LOCKED`، `403 BRANCH_NOT_ASSIGNED`، `403 USER_DISABLED`.
* **كلمة المرور المؤقتة:** إذا كان `must_change_password = true` فكل الـ endpoints عدا `/auth/*` ترفض بـ `403 PASSWORD_CHANGE_REQUIRED`. بعد `change-password` تستدعي الواجهة `/auth/refresh` للحصول على توكن جديد بدون هذا القيد.
* **محتوى التوكن (JWT):** `sub` (user_id)، `name`، `role`، `branch_id`، `sid` (معرف الجلسة)، و`perm` (قائمة الصلاحيات). يمكن للواجهة قراءتها لإخفاء الأزرار، والسيرفر يتحقق منها دائماً.

### `POST /auth/refresh`
* **الصلاحية:** Public (بواسطة refresh token).
* **Request:** `{ "refresh_token": "rt_8f3b..." }`
* **Response (200):** نفس شكل الدخول (توكنات جديدة، والـ refresh القديم يُلغى - Rotation).

### `POST /auth/logout`
* **الوصف:** إلغاء جلسة التوكن الحالي (الـ refresh token الذي صدر معه، عبر `sid`). بدون جسم.
* **Response:** `204 No Content`.

### `POST /auth/switch-branch`
* **Request:** `{ "branch_id": "br_02" }`
* **Response (200):** توكنات جديدة للفرع الجديد. خطأ `403 BRANCH_NOT_ASSIGNED`. لا يُسمح بالتبديل مع وجود وردية مفتوحة: `409 SHIFT_OPEN`.

### `GET /auth/me`
* **Response (200):** كائن `user` كما في الدخول.

### `POST /auth/change-password`
* **Request:** `{ "current_password": "...", "new_password": "..." }`
* **Response:** `204`. خطأ `422 WEAK_PASSWORD` (أقل من 10 أحرف).

### مصادقة المريض (تطبيق المرضى)

#### المبدأ
* المريض يدخل برقم هاتفه ورمز OTP، ولا توجد كلمة مرور. الحساب (`patient_account`) مرتبط برقم الهاتف، ويمكن أن يضم أكثر من مريض (أفراد العائلة).
* عند أول دخول، كل ملفات المرضى المسجلة في المجمع **بنفس رقم الهاتف** تُربط بالحساب تلقائياً (`relation: "self"`، ويغيّرها المريض لاحقاً).
* توكن المريض يحمل `role: "patient"`، ولا يصل إلى أي endpoint للموظفين. أي `patient_id` غير مربوط بحسابه يعيد `404 PATIENT_NOT_FOUND`.
* **الوضع التجريبي (Sandbox) مفعّل حالياً** (`Otp__Mode=sandbox`): لا تُرسل رسالة SMS، والرمز ثابت **`000000`** لكل الأرقام، ويعود في الرد كحقل `sandbox_code`. عند ربط مزود SMS يتحول إلى `Otp__Mode=sms` بلا أي تغيير في الواجهة (فقط يختفي `sandbox_code`).

#### `POST /patient-auth/otp/request`
* **الصلاحية:** Public.
* **Request:** `{ "phone_number": "07801234567" }` (يقبل `+964` و `964` والأرقام العربية، ويوحّدها إلى `07XXXXXXXXX`).
* **Response (202):** `{ "otp_expires_in": 300, "resend_after": 60, "sandbox_code": "000000" }`. `sandbox_code` يظهر في الوضع التجريبي فقط.
* حد الطلبات: 3 لكل رقم كل 10 دقائق، وإلا `429 RATE_LIMITED` مع `retry_after` بالثواني. رقم غير صالح: `400`.

#### `POST /patient-auth/otp/verify`
* **الصلاحية:** Public.
* **Request:** `{ "phone_number": "07801234567", "code": "000000" }`
* **Response (200):**
```json
{
  "access_token": "eyJ...", "expires_in": 900,
  "refresh_token": "rt_...", "refresh_expires_in": 2592000,
  "account": { "patient_account_id": "pa_01", "phone_number": "07801234567" },
  "patients": [
    { "patient_id": "pat_01", "full_name": "فاطمة حسن", "file_number": "R1-004512", "relation": "self", "gender": "female", "birth_date": "1991-03-02", "is_banned": false },
    { "patient_id": "pat_02", "full_name": "زينب علي", "file_number": "R1-004513", "relation": "child", "gender": "female", "birth_date": "2019-06-10", "is_banned": false }
  ]
}
```
* `patients` فارغة إذا لم يكن للرقم ملف في المجمع: التطبيق يعرض شاشة "أنشئ ملفك" (`POST /me/patients`).
* أخطاء: `401 INVALID_OTP` مع `attempts_left`، `401 OTP_EXPIRED` (اطلب رمزاً جديداً)، `429 OTP_TOO_MANY_ATTEMPTS` (5 محاولات خاطئة تُبطل الرمز).

#### `POST /patient-auth/refresh` و `POST /patient-auth/logout`
* **refresh:** `{ "refresh_token": "rt_..." }` ← نفس رد verify (توكنات جديدة، والقديم يُبطل). إعادة استخدام توكن مستبدل تُبطل كل جلسات الحساب: `401 UNAUTHORIZED`.
* **logout:** بتوكن المريض، **Response:** `204`.

#### `GET /me/patients`
* **الصلاحية:** `patient`. **Response (200):** `{ "items": [ <نفس عناصر patients أعلاه> ] }`

#### `POST /me/patients`
* **الصلاحية:** `patient`. **Headers:** `Idempotency-Key`.
* **الوصف:** إنشاء ملف جديد (له أو لفرد من عائلته) برقم هاتف الحساب، وربطه بالحساب.
* **Request:** `{ "patient_id": "pat_09", "full_name": "علي حسن", "gender": "male", "birth_date": "2020-01-15", "approx_age": null, "relation": "child" }`
* `birth_date` أو `approx_age` أحدهما إلزامي. `relation`: `self` | `child` | `spouse` | `parent` | `other`.
* **Response (201):** عنصر المريض. يوجد ملف بنفس الاسم والرقم: يُربط الموجود بدل إنشاء جديد (`200`).

#### `PATCH /me/patients/{patient_id}`
* **الصلاحية:** `patient`. **Request:** `{ "relation": "spouse" }`. البيانات الطبية والاسم يعدلها الاستقبال فقط. **Response (200):** عنصر المريض.

---

## 2. إدارة المستخدمين والصلاحيات (Users & RBAC)

### `GET /users`
* **الصلاحية:** `admin`، `branch_manager` (يرى موظفي فرعه فقط).
* **Query:** `?branch_id=&role=&q=&is_active=&page=`
* **Response (200):** قائمة بعناصر `user` (انظر أدناه).

### `POST /users`
* **الصلاحية:** `admin`، `branch_manager` (لا يستطيع إنشاء `admin`).
* **Request:**
```json
{
  "username": "lab_b1_sara",
  "full_name": "سارة كريم",
  "phone_number": "07709876543",
  "role": "lab_tech",
  "branch_ids": ["br_01"],
  "clinic_ids": [],
  "extra_permissions": [],
  "doctor_profile": null,
  "temporary_password": "Temp-4821-xy"
}
```
* `clinic_ids`: إلزامي للـ `receptionist` (العيادة التي يخدمها).
* `doctor_profile`: إلزامي للـ `doctor`: `{ "specialty": "internal", "job_title": "consultant", "clinic_id": "cl_internal", "default_slot_minutes": 10 }`.
  * `specialty` (إلزامي) و`job_title` (اختياري): **قائمة منسدلة** من `GET /lookups/doctor_specialty` و`GET /lookups/doctor_job_title`. يُرسل `code` أو `name_ar`، ويُخزن ويُعاد بالاسم العربي (`"باطنية"`، `"استشاري"`). قيمة غير موجودة أو موقوفة: `400 VALIDATION_ERROR`.
  * في `PATCH /users/{id}`: `job_title: ""` يمسح العنوان، وعدم إرساله يبقيه كما هو.
  * في الرد: `"doctor_profile": { "doctor_id", "specialty", "job_title", "clinic_id", "default_slot_minutes" }`.
* `extra_permissions`: صلاحيات إضافية فوق صلاحيات الدور (مثل `patients.unban` لموظف استقبال). مدير الفرع لا يمنح صلاحية لا يملكها.
* **Response (201):**
```json
{
  "user_id": "usr_31",
  "username": "lab_b1_sara",
  "full_name": "سارة كريم",
  "phone_number": "07709876543",
  "role": "lab_tech",
  "is_active": true,
  "must_change_password": true,
  "branch_ids": ["br_01"],
  "clinic_ids": [],
  "extra_permissions": [],
  "permissions": ["lab.write"],
  "doctor_profile": null,
  "last_login_at": null,
  "created_at": "2026-11-02T09:00:00Z"
}
```

### `GET /users/{user_id}` و `PATCH /users/{user_id}`
* تعديل الاسم، الهاتف، الدور، الفروع، العيادات. تغيير الدور يُسجل في سجل التدقيق.

### `POST /users/{user_id}/disable` و `POST /users/{user_id}/enable`
* تعطيل الحساب يُلغي كل جلساته فوراً. **Response:** `204`.
* **تعطيل طبيب** لا يترك حجوزاته القادمة معلقة:
  * إذا كانت على وجباته القادمة (من اليوم) حجوزات: `409 DOCTOR_HAS_BOOKINGS` + `bookings_count`. اعرض "سيتم إلغاء 5 حجوزات، متابعة؟" ثم أعد الطلب بـ `?cancel_bookings=true`.
  * مرضى حاضرون في طابوره الآن: `409 DOCTOR_HAS_PATIENTS`.
  * عند إلغاء وجبات: **Response (200):** `{ "cancelled_sessions": 6, "cancelled_bookings": 5, "credited_bookings": 1 }` (المدفوع يتحول رصيداً للمريض). بدون وجبات قادمة: `204` كما هو.
* تغيير دور طبيب لدور آخر عبر `PATCH` يُرفض بنفس الخطأ إذا كانت عليه حجوزات قادمة؛ عطّله بـ `cancel_bookings` أولاً.

### `POST /users/{user_id}/reset-password`
* **Response (200):** `{ "temporary_password": "Temp-9932-qa" }` (يُعرض مرة واحدة).

### `GET /roles`
* **Response (200):** قائمة الأدوار والصلاحيات الثابتة لكل دور (للعرض في شاشة الإدارة).
```json
{
  "items": [
    { "role": "receptionist", "name_ar": "موظف استقبال", "permissions": ["queue.manage", "payments.collect", "patients.write"] },
    { "role": "accountant", "name_ar": "محاسب عام", "permissions": ["shifts.review", "refunds.approve", "reports.finance", "patients.unban", "payments.collect", "audit.read", "expenses.manage"] }
  ]
}
```

---

## 3. الفروع والعيادات والخدمات والأطباء (Setup)

### 3.0 إدارة الفروع (ملخص الشاشة)
| ماذا تريد | الـ API | من يستطيع |
| --- | --- | --- |
| قائمة الفروع مع حالة كل فرع | `GET /branches` | الكل (المدير العام يرى الموقوفة مع `include_inactive`) |
| إضافة فرع، تعديله، إيقافه نهائياً | `POST /branches`، `PATCH /branches/{id}` | المدير العام |
| ماذا يوجد داخل الفرع | `GET /branches/{id}/overview` | المدير العام، ومدير الفرع لفرعه |
| إغلاق الفرع مؤقتاً (صيانة، عطلة، افتتاح قريب...) وإعادة فتحه | `POST /branches/{id}/closures`، `.../{closure_id}/end` | المدير العام، ومدير الفرع لفرعه |
| إضافة عيادة أو مختبر أو أشعة أو صيدلية للفرع | `POST /branches/{id}/clinics` | المدير العام، ومدير الفرع لفرعه |
| إعدادات الفرع (حد الغياب، فترة المراجعة...) | `GET/PATCH /branches/{id}/settings` | القراءة لموظفي الفرع، والتعديل للمدير العام ومدير الفرع |
| إضافة موظفين للفرع | `POST /users` مع `branch_ids` | المدير العام، ومدير الفرع لفرعه فقط (لا ينشئ مديراً أو مدير فرع) |
| تطبيق المريض: كل الفروع، والواجهة الرئيسية للفرع | `GET /public/branches`، `GET /public/branches/{id}` | بدون تسجيل دخول |

**حالة الفرع** تظهر في كل كائن فرع:

| `status` | `status_ar` | المعنى |
| --- | --- | --- |
| `open` | مفتوح | يعمل اليوم |
| `closed` | مغلق مؤقتاً | عليه إغلاق ساري اليوم، والسبب في `status_reason` و`status_reason_ar` (مثل "صيانة: صيانة المبنى")، وموعد العودة في `closed_until` (`null` = حتى إشعار آخر) |
| `inactive` | موقوف | موقوف نهائياً (`is_active = false`)، لا يظهر في تطبيق المريض ولا يُدخل عليه |

أسباب الإغلاق قائمة يديرها المدير (`GET /lookups/closure_reason`) ومشتركة مع إغلاق العيادات: سفر، صيانة، عطل فني، عطلة رسمية، نقص كادر، **افتتاح قريباً** (`opening_soon`، لفرع جديد قيد التجهيز)، أخرى. يمكن إضافة أي حالة جديدة كسبب.

### `GET /branches`
* **Query:** `?include_inactive=true` (للمدير العام: يظهر الفروع الموقوفة).
* **Response (200):** `{ "items": [ <branch> ] }`
```json
{
  "branch_id": "br_02", "code": "B2", "name": "فرع الكرادة", "city": "بغداد", "address": "شارع 62", "phone": "07701234567",
  "latitude": 33.3045, "longitude": 44.429, "working_hours": "السبت - الخميس، 9 صباحاً - 9 مساءً", "is_active": true,
  "status": "closed", "status_ar": "مغلق مؤقتاً", "status_reason": "maintenance", "status_reason_ar": "صيانة: صيانة المبنى",
  "closed_until": "2026-11-05",
  "closure": { "closure_id": "...", "branch_id": "br_02", "reason": "maintenance", "reason_ar": "صيانة", "note": "صيانة المبنى",
               "starts_on": "2026-11-02", "ends_on": "2026-11-05", "status": "active", "created_at": "...", "ended_at": null }
}
```
* `closure`: الإغلاق الساري أو القادم الأقرب، أو `null`. فرع مفتوح اليوم وعليه إغلاق قادم: `status = "open"` و`closure.status = "scheduled"`، والواجهة تعرض "سيُغلق من 2026-11-10".

### `GET /branches/{branch_id}`
* كائن فرع واحد بنفس الشكل. المدير العام لأي فرع، وباقي الموظفين لفرعهم الحالي فقط.

### `POST /branches` و `PATCH /branches/{branch_id}`
* **الصلاحية:** `admin` فقط. **Idempotency-Key** مطلوب للإضافة.
* **Request (POST):**
```json
{ "code": "B2", "name": "فرع الكرادة", "city": "بغداد", "address": "شارع 62", "phone": "07701234567",
  "latitude": 33.3045, "longitude": 44.429, "working_hours": "السبت - الخميس، 9 صباحاً - 9 مساءً" }
```
* `code`: حرف إنجليزي ثم حروف أو أرقام (10 كحد أقصى)، يُحفظ بأحرف كبيرة. **لا يتغير بعد الإنشاء** لأنه يدخل في أرقام الملفات والفواتير والإيصالات (أول ملف في B2 هو `B2-000001`، وأول فاتورة `B2-INV-000001`). مكرر: `409 DUPLICATE_BRANCH_CODE`.
* `latitude` و`longitude` اختياريان ويُرسلان معاً (للخريطة في تطبيق المريض). `working_hours` نص للعرض (255 حرفاً).
* **Request (PATCH):** `{ "name", "city", "address", "phone", "latitude", "longitude", "working_hours", "is_active", "cancel_bookings" }` كلها اختيارية.
* **الإيقاف النهائي** (`is_active: false`):
  * لا يمكن إيقاف الفرع الذي تعمل عليه الآن: `409 BRANCH_IN_USE`.
  * مرضى حاضرون في طوابير الفرع: `409 BRANCH_HAS_PATIENTS`.
  * حجوزات قادمة في الفرع: `409 BRANCH_HAS_BOOKINGS` + `bookings_count`؛ أعد الطلب مع `cancel_bookings: true` فتُلغى الوجبات والحجوزات القادمة (المدفوع يتحول رصيداً).
  * بعد الإيقاف: الفرع يختفي من تطبيق المريض، ولا يستطيع موظفوه الدخول عليه.
  * للإغلاق المؤقت (صيانة، عطلة...) استخدم إغلاق الفرع أدناه بدل الإيقاف.
* **Response:** كائن الفرع مع حالته. المدير العام يدخل أي فرع تلقائياً، وباقي الموظفين يُسندون للفرع عبر `branch_ids` في المستخدمين.

### `GET /branches/{branch_id}/overview` (ماذا يوجد داخل الفرع)
* **الصلاحية:** المدير العام لأي فرع، ومدير الفرع لفرعه المسند إليه. غيرهم: `403`.
* **Response (200):**
```json
{
  "branch": <branch>,
  "departments": [
    { "department": "clinic", "department_ar": "العيادات", "total": 4, "active": 4, "open_today": 3 },
    { "department": "lab", "department_ar": "المختبر", "total": 1, "active": 1, "open_today": 1 },
    { "department": "radiology", "department_ar": "الأشعة والسونار", "total": 1, "active": 1, "open_today": 0 },
    { "department": "pharmacy", "department_ar": "الصيدلية", "total": 0, "active": 0, "open_today": 0 }
  ],
  "clinics": [ {
    "clinic_id": "...", "name": "عيادة الباطنية", "department": "clinic", "department_ar": "العيادات", "floor": 1,
    "is_active": true, "is_open_today": true, "closure": null, "active_services": 2,
    "doctors": [ { "doctor_id": "...", "full_name": "د. سعد", "specialty": "باطنية", "job_title": "استشاري", "has_schedule_today": true } ]
  } ],
  "staff": [ { "role": "receptionist", "role_ar": "موظف استقبال", "count": 3 }, { "role": "doctor", "role_ar": "طبيب", "count": 6 } ],
  "active_doctors": 6,
  "today": { "date": "2026-11-02", "sessions": 8, "open_sessions": 8, "booked": 21, "in_queue": 9, "completed": 30, "no_shows": 2 },
  "setup_warnings": [ "لا توجد خدمات وأسعار في المختبر", "يوجد قسم أشعة بلا أخصائي أشعة" ]
}
```
* `clinics` تشمل الأقسام الموقوفة (`is_active: false`) ليتمكن المدير من إعادة تفعيلها.
* `setup_warnings`: ما ينقص الفرع ليعمل (عيادة بلا طبيب، قسم بلا خدمات أو كشفية، طبيب بلا جدول دوام، لا يوجد استقبال أو مدير فرع، مختبر بلا فني...). مفيد عند افتتاح فرع جديد: اعرضها كقائمة "أكمل إعداد الفرع".

### إغلاق الفرع مؤقتاً (صيانة، عطلة، افتتاح قريب...)
يعمل مثل إغلاق العيادة (3.1) لكن على **كل** عيادات وأقسام الفرع معاً.

#### `GET /branches/{branch_id}/closures`
* سجل إغلاقات الفرع (الأحدث أولاً، 100 كحد أقصى). **Response (200):** `{ "items": [ <branch_closure> ] }` بنفس شكل `closure` في كائن الفرع.

#### `POST /branches/{branch_id}/closures`
* **الصلاحية:** المدير العام، أو مدير الفرع لفرعه. **Idempotency-Key** مطلوب.
* **Request:** `{ "reason": "maintenance", "note": "صيانة المبنى", "starts_on": "2026-11-03", "ends_on": "2026-11-05", "cancel_bookings": true }` بنفس قواعد 3.1 (`note` إلزامي مع `other`، سنة كحد أقصى، بدون `ends_on` = حتى إعادة الفتح).
* ماذا يحدث: كل وجبات أطباء الفرع في الفترة تُلغى (حتى التي تُولد لاحقاً)، والحجوزات تُلغى والمدفوع يتحول رصيداً، والحجز والاستقبال في أي قسم يُرفضان بـ `409 BRANCH_CLOSED`، وكل عيادات الفرع تظهر `is_open_today: false`.
* **Response (201):** `{ "closure": <branch_closure>, "cancelled_sessions": 12, "cancelled_bookings": 30, "credited_bookings": 4 }`
* أخطاء: `409 BRANCH_HAS_BOOKINGS` + `bookings_count`، `409 BRANCH_HAS_PATIENTS`، `409 CLOSURE_OVERLAP`، `409 BRANCH_INACTIVE` (الفرع موقوف نهائياً).

#### `POST /branches/{branch_id}/closures/{closure_id}/end`
* إعادة الفتح: الساري ينتهي من اليوم، والقادم يُلغى. الوجبات التي ألغاها إغلاق الفرع تعود مفتوحة، **عدا** أيام عيادة عليها إغلاق خاص بها (تبقى مغلقة حتى يُعاد فتح تلك العيادة). والعكس صحيح عند إعادة فتح عيادة داخل فترة إغلاق الفرع.
* **Response (200):** `<branch_closure>`. منتهٍ مسبقاً: `409 CLOSURE_ENDED`.

#### `409 BRANCH_CLOSED`
```json
{ "code": "BRANCH_CLOSED", "title": "الفرع مغلق مؤقتاً", "detail": "صيانة: صيانة المبنى",
  "closure_reason": "maintenance", "closure_reason_ar": "صيانة", "closed_until": "2026-11-05" }
```

### `GET /branches/{branch_id}/clinics`
* **Query:** `?department=lab` (اختياري)، `?include_inactive=true` (لمن يملك `services.manage`).
* **Response (200):**
```json
{ "items": [ {
  "clinic_id": "cl_internal", "branch_id": "br_01", "name": "عيادة الباطنية", "department": "clinic", "floor": 2, "is_active": true,
  "is_open_today": false,
  "closure": { "closure_id": "...", "clinic_id": "cl_internal", "reason": "maintenance", "reason_ar": "صيانة", "note": "صيانة التكييف",
               "starts_on": "2026-11-02", "ends_on": "2026-11-04", "status": "active", "created_at": "...", "ended_at": null }
} ] }
```
* `department` (نوع العيادة): `clinic` (عيادة طبيب) | `lab` (مختبر) | `radiology` (أشعة وسونار) | `pharmacy` (صيدلية). يمكن إضافة أكثر من مختبر أو صيدلية أو أشعة في الفرع.
* `is_open_today`: `false` إذا كان عليها، أو على فرعها، إغلاق مؤقت ساري اليوم. `closure`: الإغلاق الساري أو القادم الأقرب، أو `null`. الواجهة تعرض شارة "مغلقة مؤقتاً: صيانة حتى 2026-11-04".

### `GET /clinics/{clinic_id}`
* **Response (200):** كائن عيادة واحد بنفس الشكل أعلاه.

### `POST /branches/{branch_id}/clinics` و `PATCH /clinics/{clinic_id}`
* **الصلاحية:** `services.manage`: المدير العام لكل الفروع، ومدير الفرع لفروعه المسندة إليه فقط. **Idempotency-Key** مطلوب للإضافة.
* **Request (POST):** `{ "name": "مختبر التحليلات", "department": "lab", "floor": 1 }`
* **Request (PATCH):** `{ "name", "department", "floor", "is_active" }` كلها اختيارية.
* أخطاء: `409 DUPLICATE_CLINIC` (نفس الاسم في الفرع)، `409 CLINIC_IN_USE` (تغيير نوع عيادة عليها أطباء أو خدمات)، `409 CLINIC_HAS_DOCTORS` (إيقاف عيادة فيها أطباء فعالون).
* إيقاف قسم (`is_active: false`) يوقف معه كل خدماته الفعالة (التحاليل، الأشعة، الكشفيات) حتى لا تُباع من قسم موقوف. عند إعادة التفعيل تُفعّل الخدمات المطلوبة يدوياً من شاشة الخدمات.
* **العيادة تُضاف دائماً على الفرع المذكور في المسار** `{branch_id}`، ولا تنتقل لفرع آخر. الطبيب يُربط بعيادة من نوع `clinic` ضمن فروعه فقط، وموظف الاستقبال بعيادات ضمن فروعه، والخدمة يجب أن يطابق نوعها نوع القسم (تحليل للمختبر، أشعة لقسم الأشعة).
* **ملاحظة للواجهة:** الخدمات وجداول الدوام تُضاف على الفرع الذي يعمل عليه المستخدم الآن. لإعداد فرع جديد ينتقل المدير العام إليه أولاً (`POST /auth/switch-branch`).
* بعد إضافة العيادة: أضف خدماتها وأسعارها (`POST /services`)، وأطباءها (`POST /users` مع `doctor_profile`)، وجدول دوامهم.
* `is_active = false` إيقاف **دائم**. للإيقاف المؤقت (سفر، صيانة، عطل...) استخدم الإغلاق المؤقت أدناه.

### 3.1 الإغلاق المؤقت (عيادة، مختبر، أشعة، صيدلية)

#### `GET /clinics/{clinic_id}/closures`
* **الصلاحية:** موظفو الفرع. سجل الإغلاقات (الأحدث أولاً، 100 كحد أقصى).
* **Response (200):** `{ "items": [ <closure> ] }` بنفس شكل `closure` أعلاه.
* `status`: `scheduled` (قادم) | `active` (ساري الآن) | `ended` (انتهت فترته) | `cancelled` (أُلغي قبل أن يسري).

#### `POST /clinics/{clinic_id}/closures`
* **الصلاحية:** المدير العام، أو مدير الفرع لفروعه. **Idempotency-Key** مطلوب.
* **Request:**
```json
{ "reason": "maintenance", "note": "صيانة جهاز التكييف", "starts_on": "2026-11-03", "ends_on": "2026-11-05", "cancel_bookings": true }
```
* `reason`: **قائمة منسدلة** من `GET /lookups/closure_reason` (يُرسل `code`). القيم الافتراضية: `travel` سفر، `maintenance` صيانة، `breakdown` عطل فني، `holiday` عطلة رسمية، `staff_shortage` نقص كادر، `other` أخرى. المدير يضيف أسباباً جديدة متى شاء.
* `note`: اختياري (500 حرف)، **إلزامي** مع `other`.
* `starts_on`: اليوم أو بعده (افتراضياً اليوم). `ends_on`: اختياري؛ بدونه تبقى مغلقة حتى إعادة الفتح يدوياً. سنة كحد أقصى.
* ماذا يحدث: وجبات الأطباء في الفترة تُلغى (حتى التي تُولد لاحقاً)، الحجوزات تُلغى والمدفوع منها يتحول رصيداً للمريض، والحجز والاستقبال يُرفضان بـ `409 CLINIC_CLOSED`.
* **Response (201):** `{ "closure": <closure>, "cancelled_sessions": 4, "cancelled_bookings": 7, "credited_bookings": 1 }`
* أخطاء:
  * `409 CLINIC_HAS_BOOKINGS` + `bookings_count`: توجد حجوزات في الفترة. اعرض للمستخدم "سيتم إلغاء 7 حجوزات، متابعة؟" ثم أعد الطلب مع `cancel_bookings: true`.
  * `409 CLINIC_HAS_PATIENTS`: مرضى حاضرون في العيادة الآن؛ أنهِ طابور اليوم أو ابدأ من الغد.
  * `409 CLOSURE_OVERLAP`: يوجد إغلاق آخر في نفس الفترة.

#### `POST /clinics/{clinic_id}/closures/{closure_id}/end`
* **الصلاحية:** نفس صلاحية الإغلاق. إعادة الفتح: الإغلاق الساري ينتهي من اليوم، والقادم يُلغى.
* الوجبات التي ألغاها الإغلاق تعود مفتوحة للحجز (الحجوزات الملغاة لا تعود).
* **Response (200):** `<closure>`. منتهٍ مسبقاً: `409 CLOSURE_ENDED`.

#### `409 CLINIC_CLOSED` (في الحجز والاستقبال)
```json
{ "code": "CLINIC_CLOSED", "title": "العيادة مغلقة مؤقتاً", "detail": "صيانة: صيانة التكييف",
  "closure_reason": "maintenance", "closure_reason_ar": "صيانة", "closed_until": "2026-11-05" }
```
* `closed_until = null` تعني حتى إشعار آخر. في `GET /public/doctors/{id}/availability` الأيام المغلقة تظهر `status: "cancelled"` و`cancel_reason: "إغلاق مؤقت - صيانة: ..."`.

### 3.1.1 إعدادات الفرع والإعدادات العامة
كل إعداد له قيمة عامة لكل الفروع، ويمكن لكل فرع تخصيص قيمته (تتقدم على العامة).

| `key` | الوصف | الوحدة | الافتراضي | المدى |
| --- | --- | --- | --- | --- |
| `ban.no_show_limit` | عدد مرات الغياب قبل الحظر | مرة | 3 | 1 - 20 |
| `ban.window_days` | فترة احتساب الغياب | يوم | 90 | 7 - 365 |
| `ban.unban_deposit_amount` | مبلغ التأمين لفك الحظر | دينار | 10000 | 0 - 1,000,000 |
| `booking.cancel_min_hours` | أقل مدة لإلغاء الحجز قبل موعده | ساعة | 2 | 0 - 72 |
| `visit.follow_up_window_days` | فترة المراجعة بعد الكشف | يوم | 14 | 0 - 90 |
| `refund.cashier_limit` | حد الاسترجاع المسموح لأمين الصندوق | دينار | 50000 | 0 - 10,000,000 |
| `prescription.valid_days` | مدة صلاحية الوصفة | يوم | 30 | 1 - 365 |
| `consultation.edit_window_hours` | مدة تعديل المعاينة بعد إنهائها | ساعة | 24 | 0 - 720 |

#### `GET /branches/{branch_id}/settings`
* **الصلاحية:** موظفو الفرع، والمدير العام لأي فرع.
* **Response (200):**
```json
{ "items": [ { "key": "ban.no_show_limit", "label_ar": "عدد مرات الغياب قبل الحظر", "unit": "مرة",
               "value": 5, "source": "branch", "global_value": 3, "min": 1, "max": 20 } ] }
```
* `source`: `branch` (قيمة خاصة بالفرع) | `global` (الإعداد العام) | `default` (افتراضي النظام). الواجهة تعرض بجانب القيمة الخاصة زر "إرجاع للقيمة العامة (3)".

#### `PATCH /branches/{branch_id}/settings`
* **الصلاحية:** المدير العام، أو مدير الفرع لفرعه.
* **Request:** `{ "values": { "ban.no_show_limit": 5, "booking.cancel_min_hours": null } }`. القيمة `null` تحذف التخصيص ويعود الفرع للقيمة العامة.
* **Response (200):** القائمة كاملة بعد التعديل. خارج المدى أو مفتاح غير معروف: `400` مع `errors["values.<key>"]`.

#### `GET /settings` و `PATCH /settings`
* الإعدادات العامة لكل الفروع (المدير العام فقط)، بنفس الشكل. `null` غير مسموح هنا.

### 3.2 قوائم الاختيار (Lookups) - قوائم منسدلة يديرها المدير

#### `GET /lookups`
* **الصلاحية:** موظفون. **Response (200):**
```json
{ "items": [
  { "category": "closure_reason",   "name_ar": "أسباب الإغلاق المؤقت",     "active_count": 6 },
  { "category": "doctor_specialty", "name_ar": "اختصاصات الأطباء",         "active_count": 20 },
  { "category": "doctor_job_title", "name_ar": "العناوين الوظيفية للأطباء", "active_count": 5 },
  { "category": "expense_category", "name_ar": "تصنيفات المصاريف",          "active_count": 10 }
] }
```

#### `GET /lookups/{category}`
* **الصلاحية:** موظفون. `doctor_specialty` متاحة بلا توكن أيضاً (لفلتر تطبيق المريض).
* **Query:** `?include_inactive=true` (المدير العام فقط، لشاشة الإدارة).
* **Response (200):** مرتبة حسب `sort_order`:
```json
{ "items": [
  { "lookup_id": "...", "category": "closure_reason", "code": "maintenance", "name_ar": "صيانة", "sort_order": 20, "is_active": true, "is_system": false }
] }
```
* القائمة المنسدلة تعرض `name_ar` وترسل `code`. فئة غير معروفة: `400`.

#### `POST /lookups/{category}`
* **الصلاحية:** `admin`. **Idempotency-Key** مطلوب.
* **Request:** `{ "name_ar": "انقطاع الكهرباء", "code": "power_outage", "sort_order": 60 }`. `code` اختياري (إنجليزي صغير وأرقام و `_`)، ويُولد تلقائياً إن لم يُرسل. `sort_order` اختياري (يُضاف في آخر القائمة).
* **Response (201):** `<lookup>`. اسم أو رمز مكرر في نفس القائمة: `409 DUPLICATE_LOOKUP`.

#### `PATCH /lookups/{category}/{lookup_id}`
* **الصلاحية:** `admin`. **Request:** `{ "name_ar", "sort_order", "is_active" }` كلها اختيارية.
* الإيقاف يخفي القيمة من القوائم المنسدلة فقط؛ السجلات القديمة تبقى تعرض اسمها. `code` لا يتغير.
* تغيير اسم اختصاص أو عنوان وظيفي يُحدّث كل الأطباء المرتبطين به تلقائياً.
* قيم النظام (`is_system: true` مثل سبب `other`): يتغير اسمها ولا تُوقف: `409 LOOKUP_IS_SYSTEM`.

### `GET /services`
* **الصلاحية:** كل الموظفين (الفرع من التوكن).
* **Query:** `?type=consultation|lab|radiology|procedure&clinic_id=&q=&include_inactive=false`
* `include_inactive=true` يظهر الخدمات المعطلة أيضاً، لمن يملك `services.manage` فقط.
* **Response (200):**
```json
{
  "items": [
    { "service_id": "svc_12", "name": "كشفية باطنية - جديد", "type": "consultation", "visit_kind": "new_visit", "clinic_id": "cl_internal", "price": 25000, "is_commissionable": true, "is_active": true },
    { "service_id": "svc_08", "name": "كشفية باطنية - مراجعة", "type": "consultation", "visit_kind": "follow_up", "clinic_id": "cl_internal", "price": 15000, "is_commissionable": true, "is_active": true },
    { "service_id": "svc_45", "name": "تحليل دم شامل CBC", "type": "lab", "price": 30000, "is_commissionable": false, "is_active": true },
    { "service_id": "svc_70", "name": "سونار بطن", "type": "radiology", "modality": "ultrasound", "price": 35000, "is_commissionable": false, "is_active": true }
  ]
}
```
* `modality` للأشعة: `xray` | `ultrasound` | `ct` | `mri`.

### `POST /services` و `PATCH /services/{service_id}`
* **الصلاحية:** `admin`، `branch_manager`.
* تغيير السعر لا يؤثر على الفواتير السابقة (كل بند فاتورة يحفظ نسخة Snapshot من السعر).
* **Headers (POST):** `Idempotency-Key`.
* **Request (POST):**
```json
{ "name": "كشفية باطنية - جديد", "type": "consultation", "visit_kind": "new_visit", "clinic_id": "cl_internal", "price": 25000, "is_commissionable": true }
```
* القواعد:
  * `visit_kind` إلزامي للكشفية فقط، و`modality` إلزامي للأشعة فقط.
  * `clinic_id` إلزامي للكشفية، ويجب أن تكون العيادة في الفرع الحالي ومن القسم المناسب: الكشفية والإجراء من قسم `clinic`، والتحليل من `lab`، والأشعة من `radiology`.
  * `is_commissionable` افتراضياً `true` للكشفية والإجراء، و`false` لغيرها.
  * لا توجد كشفيتان فعالتان من نفس النوع لنفس العيادة: `409 DUPLICATE_SERVICE`.
* **Request (PATCH):** `{ "name": "...", "price": 30000, "is_commissionable": true, "is_active": false, "clinic_id": "...", "reason": "تحديث الأسعار" }`. كل الحقول اختيارية. `type` و`visit_kind` لا يتغيران بعد الإنشاء. تغيير السعر يُسجل في التدقيق كـ `PRICE_CHANGED` مع السعر القديم والجديد.

### `GET /doctors`
* **الصلاحية:** موظفون.
* **Query:** `?clinic_id=&specialty=&q=` (`specialty` يقبل الرمز `internal` أو الاسم `باطنية`)
* **Response (200):** `{ "items": [ { "doctor_id": "doc_05", "full_name": "د. سعد الحيدري", "specialty": "باطنية", "job_title": "استشاري", "clinic_id": "cl_internal", "clinic_name": "عيادة الباطنية", "default_slot_minutes": 10, "photo_url": "https://minio.branch1.local/medical/doctors/doc_05/...&X-Amz-Signature=..." } ] }`
* `photo_url` رابط مؤقت للصورة (صالح ساعة)، أو `null` إذا لم تُرفع صورة. الواجهة تعرض صورة افتراضية (الحروف الأولى من الاسم) عند `null`.
* الأطباء في الفرع الحالي فقط. الطبيب يُنشأ مع حسابه عبر `POST /users` (حقل `doctor_profile`).

### `GET /doctors/{doctor_id}`
* **Response (200):** كائن طبيب واحد بنفس الشكل.

### صورة الطبيب
* الصورة تُرفع بنفس آلية MinIO في القسم 13 (`POST /files/upload-url` بـ `purpose: "doctor_photo"` ثم `POST /files/{file_id}/complete`)، ثم تُربط بالطبيب.
* شروط الصورة: `image/jpeg` أو `image/png` فقط، الحد 2MB. يُنصح بصورة مربعة 512×512 على الأقل. السيرفر يحفظ `object_key` فقط ولا يخزن روابط دائمة.

#### `PUT /doctors/{doctor_id}/photo`
* **الصلاحية:** `services.manage` (المدير العام، مدير الفرع)، أو الطبيب نفسه لصورته.
* **Idempotency-Key:** مطلوب.
* **Request:** `{ "file_id": "file_91" }`
* **Response (200):** كائن الطبيب مع `photo_url` الجديد.
* **أخطاء:** `404 FILE_NOT_FOUND`، `422 FILE_NOT_STORED` (لم يكتمل الرفع)، `422 INVALID_FILE_PURPOSE` (الملف ليس `doctor_photo`). الصورة القديمة تُحذف من MinIO في الخلفية، وتغيير الصورة يُسجل في التدقيق.

#### `DELETE /doctors/{doctor_id}/photo`
* **الصلاحية:** نفس السابق.
* **Response (204).** يرجع `photo_url` إلى `null`.

### `GET /doctors/{doctor_id}/commissions`
* **الصلاحية:** `reports.finance` (المدير العام، مدير الفرع، المحاسب).
* **Response (200):** النسبة السارية اليوم وتاريخ النسب (الأحدث أولاً):
```json
{
  "doctor_id": "doc_05",
  "current": { "new_visit_rate": 70, "follow_up_rate": 60, "effective_from": "2026-01-01", "created_at": "2026-01-01T08:00:00Z" },
  "items": [
    { "new_visit_rate": 75, "follow_up_rate": 65, "effective_from": "2026-12-01", "created_at": "2026-11-02T09:00:00Z" },
    { "new_visit_rate": 70, "follow_up_rate": 60, "effective_from": "2026-01-01", "created_at": "2026-01-01T08:00:00Z" }
  ]
}
```
* `current = null` إذا لم تُحدد للطبيب أي نسبة بعد.

### `POST /doctors/{doctor_id}/commissions`
* **الصلاحية:** `admin`.
* **الوصف:** إضافة نسبة جديدة تسري من تاريخ محدد. لا تمس الفواتير السابقة.
* **Request:**
```json
{ "new_visit_rate": 75, "follow_up_rate": 65, "effective_from": "2026-12-01" }
```
* **Response (201):** الكائن المُضاف.
* القواعد:
  * أول نسبة للطبيب يمكن أن تكون بتاريخ سابق (لإدخال البيانات الأولية). بعدها يجب أن يكون التاريخ اليوم أو بعده: `422 EFFECTIVE_DATE_IN_PAST`.
  * إرسال نسبة بتاريخ مستقبلي موجود مسبقاً (لم يسرِ بعد) يستبدلها. إذا كان التاريخ قد سرى: `409 DUPLICATE_EFFECTIVE_DATE`.
  * النسب بين 0 و 100، برقمين عشريين كحد أقصى.

### `GET /doctors/{doctor_id}/schedule`
* **الوصف:** الجدول الأسبوعي للطبيب (الوجبات). أساس حساب السعة.
* **Response (200):**
```json
{
  "doctor_id": "doc_05",
  "weekly": [
    { "session_template_id": "st_1", "weekday": "sat", "start": "16:00", "end": "21:00", "slot_minutes": 10, "online_quota_percent": 60, "capacity": 30, "online_quota": 18 }
  ]
}
```
* `weekday`: `sun` | `mon` | `tue` | `wed` | `thu` | `fri` | `sat`. الأوقات بتوقيت بغداد `HH:mm`، والوجبة لا تتجاوز منتصف الليل.
* `capacity` و`online_quota` يحسبهما السيرفر (للعرض فقط).
* السعة = (21:00 − 16:00) ÷ 10 = **30 حجز**، منها 60% (18) متاح للحجز الإلكتروني والباقي للحضور المباشر.

### `PUT /doctors/{doctor_id}/schedule`
* **الصلاحية:** `services.manage` (`admin`، `branch_manager`). يستبدل الجدول الأسبوعي كاملاً.
* **Request:** `{ "weekly": [ { "weekday": "sat", "start": "16:00", "end": "21:00", "slot_minutes": 10, "online_quota_percent": 60 } ] }`. `online_quota_percent` افتراضياً 60.
* يرفض الوجبات المتداخلة في نفس اليوم (`400` مع `errors["weekly[1]"]`).
* الوجبات المستقبلية التي ليس عليها حجوزات أو تذاكر تُحذف وتُولد من الجدول الجديد. الوجبات التي عليها حجوزات تبقى كما هي.

### `GET /doctors/{doctor_id}/sessions`
* **الوصف:** الوجبات الفعلية للطبيب. تُولد تلقائياً من الجدول الأسبوعي عند أول طلب، ولا تُولد لأيام مضت.
* **Query:** `?from=2026-11-02&to=2026-11-08`. الافتراضي 7 أيام من اليوم، والحد الأقصى 62 يوماً.
* **Response (200):**
```json
{
  "doctor_id": "doc_05",
  "items": [
    { "session_id": "ses_7781", "date": "2026-11-07", "weekday": "sat", "start": "16:00", "end": "21:00", "starts_at": "2026-11-07T13:00:00+00:00", "slot_minutes": 10, "capacity_total": 30, "online_quota": 18, "status": "open", "cancel_reason": null }
  ]
}
```

### `POST /doctors/{doctor_id}/sessions/{date}/cancel`
* **الوصف:** إلغاء وجبة يوم محدد (إجازة طبيب). يُبلغ كل المحجوزين، ومن دفع أونلاين يُسجل له رصيد قابل للاسترجاع.
* **الصلاحية:** `services.manage`.
* **Request:** `{ "reason": "سفر الطبيب" }` (السبب إلزامي).
* **Response (200):** `{ "cancelled_sessions": 1, "affected_bookings": 14, "notified": 14 }`
* أخطاء: `422 DATE_IN_PAST`، `404` لا توجد وجبة في هذا اليوم، `409 SESSION_STARTED` (فيها مرضى في الطابور).
* الحجوزات المدفوعة تُلغى ويتحول مبلغها إلى **رصيد** للمريض (`patient_credit_ledger`، نوع `booking_cancel_credit`) وتصبح `payment_status: "credited"`. تذاكر الانتظار المرتبطة تُلغى.
* `SESSION_STARTED` فقط إذا كان في الوجبة مريض حاضر فعلاً (وصل أو في الغرفة أو انتهى).
* الإشعارات تأتي مع وحدة الإشعارات (`notified` = 0 حالياً).

### الأجهزة وشاشات الانتظار (Devices)

#### `GET /devices` و `POST /devices`
* **الصلاحية:** `services.manage`.
* **Request (POST):** `{ "kind": "display", "name": "شاشة انتظار الباطنية", "clinic_id": "cl_internal" }`
* `kind`: `reception_pc` | `display` | `lab_pc` | `radiology_pc` | `pharmacy_pc`. الشاشة (`display`) تُربط بعيادة إلزامياً.
* **Response (201):** `{ "device_id": "...", "device_code": "b1-display-03", "kind": "display", "name": "...", "clinic_id": "...", "display_key": "dk_..." }`
* `display_key` يظهر **مرة واحدة فقط** (يُخزن مشفراً). يُدخل في إعدادات متصفح الشاشة.

#### `POST /devices/{device_id}/display-key`
* مفتاح جديد للشاشة عند فقدانه أو تسريبه، والقديم يتوقف فوراً. نفس شكل الرد.

---

## 4. المرضى (Patients)

### `POST /patients`
* **الصلاحية:** `receptionist`، `admin`.
* **Headers:** `Idempotency-Key`.
* **Request:**
```json
{
  "patient_id": "pat_01",
  "full_name": "فاطمة حسن",
  "phone_number": "07801234567",
  "birth_date": "1991-04-10",
  "gender": "female",
  "created_offline_at": null
}
```
* `patient_id` اختياري؛ ترسله الواجهة إذا ولّدته محلياً (أوفلاين).
* يُفضل `birth_date` على `age` لأن العمر يتغير. إذا لم يُعرف التاريخ تُرسل `"approx_age": 35`.
* **Response (201):**
```json
{
  "patient_id": "pat_01",
  "file_number": "R1-004512",
  "full_name": "فاطمة حسن",
  "phone_number": "07801234567",
  "possible_duplicates": []
}
```
* `possible_duplicates`: مرضى بنفس رقم الهاتف، لتنبيه الموظف (لا يمنع الإنشاء، لأن رقم العائلة قد يكون واحداً).
* **الصلاحية:** `patients.write` (الاستقبال، مدير الفرع، المدير).
* رقم الهاتف يُوحّد إلى `07XXXXXXXXX` (يقبل `+964` و`964` والأرقام العربية). رقم غير عراقي: `400`.
* `file_number` بصيغة `{رمز الفرع}-{6 أرقام}` مثل `B1-004512`، تسلسل مستقل لكل فرع.
* `gender`: `male` | `female`. إعادة إرسال نفس `patient_id`: `409 PATIENT_EXISTS`.

### `GET /patients/search`
* **Query:** `?phone=07801234567` أو `?q=فاطمة` أو `?file_number=R1-004512`
* **Response (200):**
```json
{
  "items": [
    {
      "patient_id": "pat_01",
      "file_number": "R1-004512",
      "full_name": "فاطمة حسن",
      "phone_number": "07801234567",
      "last_visit_date": "2026-10-15",
      "is_banned": false,
      "outstanding_balance": 0
    }
  ],
  "page": 1, "page_size": 20, "total": 1
}
```
* البحث على مستوى كل الفروع (ملف المريض موحد للمجمع). يجب إرسال أحد المعاملات الثلاثة وإلا `400`.
* الملفات المدموجة لا تظهر في البحث. `outstanding_balance` = مجموع المتبقي من الفواتير غير المدفوعة.

### `GET /patients/{patient_id}` و `PATCH /patients/{patient_id}`
* **Response (200):**
```json
{
  "patient_id": "pat_01", "file_number": "B1-004512", "full_name": "فاطمة حسن", "phone_number": "07801234567",
  "birth_date": "1991-04-10", "approx_age": null, "gender": "female", "home_branch_id": "...",
  "is_banned": false, "no_show_count": 1, "credit_balance": 25000, "merged_into_patient_id": null,
  "created_at": "...", "updated_at": "..."
}
```
* `credit_balance`: رصيد المريض (من إلغاء حجز مدفوع أو عربون فك الحظر)، يُخصم من فواتيره القادمة.
* الرصيد **واحد للمريض في كل الفروع**: ما دفعه في فرع يستطيع استخدامه في فرع آخر. كل حركة رصيد تُسجل مع الفرع الذي قُبض أو استُخدم فيه، والتسوية بين الفروع في `GET /reports/branch-settlements` (القسم 19).
* `merged_into_patient_id` غير فارغ = الملف مدموج؛ الواجهة تنتقل للملف الأساسي.
* **PATCH** (`patients.write`): `{ "full_name", "phone_number", "birth_date", "approx_age", "gender" }` كلها اختيارية. التعديل يُسجل في التدقيق (`PATIENT_UPDATED`). تعديل ملف مدموج: `409 PATIENT_MERGED`.

### `POST /patients/merge`
* **الصلاحية:** `admin`، `branch_manager`.
* **الوصف:** دمج ملفين مكررين (مثلاً سُجل أوفلاين وأونلاين بنفس الوقت). كل الزيارات والفواتير تنتقل للملف الأساسي.
* **Request:** `{ "primary_patient_id": "pat_01", "duplicate_patient_id": "pat_77" }`
* **Response (200):** `{ "patient_id": "pat_01", "moved_records": 6 }`
* **Headers:** `Idempotency-Key`. ينقل الحجوزات والتذاكر والفواتير والمدفوعات والإيصالات والغيابات والرصيد والسجل الطبي وروابط حسابات التطبيق، ويجمع عدد الغيابات. الملف المكرر يبقى للأرشيف مع `merged_into_patient_id`.
* أخطاء: `409 PATIENT_MERGED` (أحدهما مدموج مسبقاً)، `409 MERGE_CONFLICT` (الملفان محجوزان في نفس الوجبة: ألغِ أحدهما ثم أعد الدمج).

### الحظر وفكه (Ban / Unban)

#### `GET /patients/{patient_id}/ban-status`
* **Response (200):**
```json
{
  "is_banned": true,
  "reason": "no_show_limit",
  "no_show_count": 3,
  "banned_at": "2026-10-20T15:00:00Z",
  "unban_deposit_amount": 10000
}
```
* قاعدة الحظر (قابلة للضبط من الإعدادات): **3 حالات عدم حضور خلال 90 يوماً بدون إلغاء مسبق**.
* `no_show_count` = الغيابات المحتسبة الآن (داخل النافذة وبعد آخر فك حظر)، فلا يُعاد حظر المريض فوراً بعد فكه.
* الغياب يُحتسب عند: تسجيل غياب نهائي من الطابور (`no-show` بـ `final`)، أو إلغاء الحجز قبل موعده بأقل من ساعتين.

#### `POST /patients/{patient_id}/unban`
* **الصلاحية:** `accountant`، `branch_manager`، `admin`، و`receptionist` إذا كانت لديه صلاحية `patients.unban`.
* **Headers:** `Idempotency-Key`.
* **الوصف:** فك الحظر يدوياً مع قبض العربون نقداً أو POS. يُصدر إيصالاً حرارياً (انظر وحدة 9). العربون يُخصم من أول فاتورة قادمة للمريض.
* **Request:**
```json
{
  "method": "cash",
  "amount": 10000,
  "pos_reference": null,
  "note": "تعهد المريض بالحضور"
}
```
* أو فك بدون عربون (مدير فقط): `{ "method": "waived", "amount": 0, "note": "حالة إنسانية" }`. `note` إلزامي للإعفاء.
* `cash` و`pos`: يتطلبان **وردية مفتوحة** للموظف (`409 NO_OPEN_SHIFT`)، و`amount` لا يقل عن `unban_deposit_amount` من `ban-status`، و`pos_reference` إلزامي مع `pos`. المبلغ يدخل متوقع الدرج ويصبح **رصيداً للمريض** (`deposit_credit`) يُستخدم في `POST /payments` عبر `use_deposit_credit`.
* المريض غير المحظور: `409 PATIENT_NOT_BANNED`.
* **Response (200):**
```json
{
  "is_banned": false,
  "deposit_credit": 10000,
  "receipt": { "receipt_id": "rcp_900", "receipt_number": "B1-R-000911", "type": "deposit", "issued_at": "...", "qr_code": "https://verify.<domain>/r/7KQ2-M9XA-4F", "print_payload_url": "/receipts/rcp_900/print-payload" },
  "drawer_token": "eyJhbGciOiJFUzI1NiIs...",
  "open_drawer": true
}
```
* مع `waived`: `receipt` و`drawer_token` قيمتهما `null`. مع `pos`: `open_drawer = false`.
* فك الحظر إلكترونياً عبر التطبيق يتم بدفع عربون أونلاين (وحدة 6، `purpose: "unban_deposit"`).

### `GET /patients/{patient_id}/history`
* **الصلاحية:** `doctor` و`admin`. `private_notes` تظهر للأطباء فقط (`null` لغيرهم).
* **Query:** `?page=&page_size=` (الأحدث أولاً، في كل الفروع).
* **Response (200):**
```json
{
  "patient_id": "pat_01",
  "items": [
    {
      "consultation_id": "con_502", "date": "2026-11-02", "branch_name": "فرع الكرادة",
      "doctor_name": "د. سعد الحيدري", "clinic_name": "عيادة الباطنية", "visit_kind": "new_visit",
      "diagnosis": "Acute Bronchitis", "icd10_code": "J20.9", "clinical_notes": "سعال منذ 5 أيام",
      "private_notes": "متابعة ضغط الدم في الزيارة القادمة",
      "prescription": { "prescription_code": "RX-7KQ2M9", "status": "dispensed", "lines": [ { "line_no": 1, "drug_name": "Augmentin 1g", "dose": "1 حبة", "frequency": "مرتين يومياً", "duration_days": 7 } ] },
      "orders": [ { "order_item_id": "oi_103", "department": "lab", "service_name": "CBC", "status": "released", "has_critical": true, "result_available": true } ],
      "addenda_count": 0
    }
  ],
  "page": 1, "page_size": 20, "total": 1
}
```
* التفاصيل الكاملة لأي زيارة: `GET /consultations/{id}`، والنتائج: `GET /lab/orders/{id}/result` و`GET /radiology/orders/{id}/report`.

---

## 5. الحجز (Booking) - تطبيق المريض والاستقبال

**رحلة المريض:** يفتح التطبيق فيرى كل الفروع (`GET /public/branches`) مع حالة كل فرع، يختار فرعاً فتظهر الواجهة الرئيسية للفرع (`GET /public/branches/{id}`) بأقسامه وأطبائه، يختار طبيباً فيرى أيامه المتاحة (`GET /public/doctors/{id}/availability`)، ثم يحجز.

### `GET /public/branches`
* **الصلاحية:** Public. الفروع الفعالة فقط (الموقوفة نهائياً لا تظهر).
* **Query:** `?city=بغداد` (اختياري).
* **Response (200):**
```json
{ "items": [ {
  "branch_id": "br_02", "code": "B2", "name": "فرع الكرادة", "city": "بغداد", "address": "شارع 62", "phone": "07701234567",
  "latitude": 33.3045, "longitude": 44.429, "working_hours": "السبت - الخميس، 9 صباحاً - 9 مساءً",
  "status": "open", "status_ar": "مفتوح", "status_reason_ar": null, "closed_until": null,
  "departments": ["clinic", "lab", "radiology"], "doctors_count": 6
} ] }
```
* فرع مغلق مؤقتاً يظهر بـ `status: "closed"` و`status_reason_ar` (مثل "افتتاح قريباً" أو "صيانة: ...") و`closed_until`. الواجهة تعرضه رمادياً مع السبب، ويمكن الدخول إليه لرؤية الأطباء والحجز بعد تاريخ العودة.

### `GET /public/branches/{branch_id}` (الواجهة الرئيسية للفرع)
* **الصلاحية:** Public. فرع موقوف أو غير موجود: `404 BRANCH_NOT_FOUND`.
* **Response (200):**
```json
{
  "branch": <public_branch كما في القائمة أعلاه>,
  "departments": [
    { "department": "clinic", "department_ar": "العيادات", "clinics": [
        { "clinic_id": "...", "name": "عيادة الباطنية", "floor": 1, "is_open_today": true, "closure_label": null, "closed_until": null } ] },
    { "department": "lab", "department_ar": "المختبر", "clinics": [
        { "clinic_id": "...", "name": "المختبر", "floor": 0, "is_open_today": false, "closure_label": "عطل فني: جهاز التحليل", "closed_until": "2026-11-04" } ] }
  ],
  "specialties": [ { "code": "internal", "name_ar": "باطنية", "doctors_count": 2 } ],
  "doctors": [ <نفس عناصر GET /public/branches/{branch_id}/doctors> ]
}
```
* `departments` تضم الأقسام الفعالة فقط، والقسم بلا عيادات لا يظهر. `specialties` للفلترة السريعة (أرسل `code` إلى `?specialty=` في قائمة الأطباء).

### `GET /public/branches/{branch_id}/doctors`
* **الصلاحية:** Public (مخزن في Redis).
* **Query:** `?specialty=&q=` (`specialty` رمز أو اسم من `GET /lookups/doctor_specialty`)
* **Response (200):** `{ "items": [ { "doctor_id": "doc_05", "full_name": "د. سعد الحيدري", "specialty": "باطنية", "job_title": "استشاري", "clinic_name": "عيادة الباطنية", "photo_url": "...", "new_visit_price": 25000, "follow_up_price": 15000 } ] }`
* السعر `null` إذا لم تُحدد كشفية من هذا النوع للعيادة.
* فرع موقوف: `404 BRANCH_NOT_FOUND`. وفي `GET /public/doctors/{id}/availability` طبيب موقوف أو في عيادة أو فرع موقوف: `404`.

### `GET /public/doctors/{doctor_id}/availability`
* **الصلاحية:** Public.
* **Query:** `?from=2026-11-02&to=2026-11-08`
* **Response (200):**
```json
{
  "doctor_id": "doc_05",
  "days": [
    {
      "date": "2026-11-07",
      "session_id": "ses_7781",
      "start": "16:00",
      "end": "21:00",
      "capacity_total": 30,
      "online_remaining": 7,
      "next_sequence_number": 25,
      "next_estimated_time": "2026-11-07T17:10:00Z",
      "status": "open"
    }
  ]
}
```
* `status`: `open` | `full` | `cancelled` | `closed`. الافتراضي 7 أيام من اليوم، والحد الأقصى 31 يوماً.
* `online_remaining` = حصة الحجز المسبق ناقص الحجوزات الفعالة. `next_estimated_time` تقديري لمن يحجز الآن (`null` إذا لم تكن الوجبة مفتوحة).

### `POST /bookings`
* **الصلاحية:** `receptionist` (حجز هاتفي، صلاحية `queue.manage`) **مفعّل الآن**، و`patient` من التطبيق بتوكن المريض (انظر `GET /bookings/my`). موظف بلا `queue.manage`: `403`.
* **Headers:** `Idempotency-Key`.
* **Request:**
```json
{
  "booking_id": "bk_01",
  "patient_id": "pat_01",
  "session_id": "ses_7781",
  "visit_kind": "auto"
}
```
* `visit_kind`: `auto` (السيرفر يحدد: مراجعة إذا كانت هناك زيارة لنفس الطبيب خلال فترة المراجعة المحددة بالإعدادات، وإلا جديد)، أو `new_visit` / `follow_up` بقرار الاستقبال فقط.
* **Response (201):** كائن الحجز (نفس شكل `GET /bookings/{id}`):
```json
{
  "booking_id": "bk_01",
  "patient_id": "pat_01",
  "patient_name": "فاطمة حسن",
  "session_id": "ses_7781",
  "doctor_id": "doc_05",
  "doctor_name": "د. سعد الحيدري",
  "date": "2026-11-07",
  "sequence_number": 25,
  "ticket_number": "A-025",
  "estimated_time": "2026-11-07T17:10:00Z",
  "queue_position": 25,
  "visit_kind": "new_visit",
  "price": 25000,
  "source": "phone",
  "status": "booked",
  "payment_status": "unpaid",
  "payment_options": ["pay_at_clinic"],
  "cancel_reason": null,
  "created_at": "..."
}
```
* الحجز يحجز للمريض رقماً في الطابور فوراً (تذكرة بحالة `waiting`)، ويظهر في `GET /queue/live` حتى يصل.
* `payment_options`: للحجز الهاتفي `["pay_at_clinic"]`، ولحجز التطبيق `["pay_at_clinic", "pay_full_online", "pay_deposit_online"]` (القسم 6).
* `status`: `booked` | `checked_in` | `completed` | `cancelled` | `no_show`. `payment_status`: `unpaid` | `deposit_paid` (عربون من التطبيق) | `paid` | `credited` | `refunded`.
* المريض المحظور لا يحجز: `403 PATIENT_BANNED` ويعيد الرد `unban_deposit_amount` ليعرض التطبيق خيار دفع العربون.
* أخطاء: `409 SESSION_FULL` (اكتملت حصة الحجز المسبق)، `409 DUPLICATE_BOOKING` (نفس المريض في نفس الوجبة)، `409 SESSION_CANCELLED`، `409 SESSION_CLOSED` (انتهى وقتها)، `404 SESSION_NOT_FOUND`، `422 SERVICE_NOT_CONFIGURED` (لا توجد كشفية للعيادة).

### `GET /bookings`
* **Query:** `?patient_id=` أو `?session_id=` (أحدهما إلزامي). يعيد `{ "items": [ ... ] }` بنفس شكل الحجز، الأحدث أولاً (200 كحد أقصى).

### `GET /bookings/my`
* **الصلاحية:** `patient`. **Query:** `?patient_id=` (اختياري، الافتراضي كل مرضى الحساب) `&scope=upcoming|past` (الافتراضي `upcoming`).
* **Response (200):** `{ "items": [ <كائن الحجز> ] }`. `upcoming`: حجوزات اليوم والقادمة غير الملغاة، الأقرب أولاً. `past`: الباقي، الأحدث أولاً (50 كحد أقصى).
* `queue_position` و`estimated_time` محدّثان لحظياً، ويصل تحديثهما بحدث `eta.changed`.
* **حجز المريض من التطبيق:** `POST /bookings` بتوكن المريض و`patient_id` مربوط بحسابه، و`visit_kind` = `auto` دائماً، و`source: "online"` (الحجز الهاتفي `"phone"`). `payment_options`: `["pay_at_clinic", "pay_full_online", "pay_deposit_online"]`.
* **إلغاء المريض:** `POST /bookings/{id}/cancel` لحجوزات مرضاه فقط.

### `GET /bookings/{booking_id}`
* **Response (200):** كائن الحجز + `{ "queue_position": 4, "estimated_time": "...", "ticket_number": "A-025" }`.

### `POST /bookings/{booking_id}/cancel`
* **الصلاحية:** `patient` (حجزه فقط)، `receptionist`.
* **الوصف:** الإلغاء قبل الموعد بساعتين على الأقل لا يُحتسب غياباً. المبلغ المدفوع أونلاين يتحول إلى **رصيد** للمريض (أو استرجاع بقرار المحاسب).
* **Request:** `{ "reason": "ظرف طارئ" }` (السبب إلزامي).
* **Response (200):** `{ "status": "cancelled", "counted_as_no_show": false, "credit_added": 25000 }`
* الإلغاء قبل الموعد التقديري بأقل من `booking.cancel_min_hours` (افتراضياً ساعتان): `counted_as_no_show: true` ويُحتسب غياباً.
* يُلغى الحجز قبل تثبيت الحضور فقط، وإلا `409 BOOKING_NOT_CANCELLABLE`.

---

## 6. الدفع الإلكتروني (Online Payments)

### المبدأ
* **بوابة تجريبية (Sandbox) مفعّلة حالياً:** `provider: "sandbox"` تحاكي البوابة بالكامل. عند اختيار بوابة حقيقية (زين كاش، كي كارد، FIB) تُضاف كـ `provider` جديد بنفس التدفق، بلا تغيير في الواجهة سوى القيمة.
* التأكيد من البوابة (Webhook) هو المصدر الوحيد لنجاح الدفع، وليس رجوع المستخدم للتطبيق. التطبيق يتابع الحالة بـ `GET` أو بحدث مباشر.
* الدفع الإلكتروني لا يمر بوردية: يصدر له إيصال من نوع `online` برقم `B1-O-000045`.

### `POST /online-payments`
* **الصلاحية:** `patient` (لمريض مربوط بحسابه). **Headers:** `Idempotency-Key`.
* **Request:**
```json
{ "online_payment_id": "op_331", "purpose": "booking_full", "patient_id": "pat_01", "booking_id": "bk_01", "invoice_id": null, "provider": "sandbox" }
```
* `purpose`:
  * `booking_full`: كامل كشفية الحجز (`booking_id`).
  * `booking_deposit`: عربون الحجز (`booking.online_deposit_amount`، افتراضياً 5,000)، والمتبقي يُدفع في الاستقبال.
  * `unban_deposit`: عربون فك الحظر (`ban.unban_deposit_amount`).
  * `invoice`: البنود غير المدفوعة في فاتورة (`invoice_id`)، مثل تحليل طلبه الطبيب ليرى نتيجته.
* المبلغ يحسبه السيرفر ولا يُرسل من التطبيق.
* **Response (201):**
```json
{ "online_payment_id": "op_331", "purpose": "booking_full", "amount": 25000, "status": "pending", "provider": "sandbox",
  "redirect_url": "https://api.example.iq/api/v1/sandbox/pay/op_331", "expires_at": "2026-11-02T09:15:00Z", "receipt": null }
```
* التطبيق يفتح `redirect_url` في متصفح داخلي. الصلاحية 15 دقيقة، ثم `expired`.
* أخطاء: `409 BOOKING_NOT_ACTIVE`، `409 ALREADY_PAID` (الحجز أو الفاتورة مدفوعة)، `409 PATIENT_NOT_BANNED` (عربون فك حظر لمريض غير محظور)، `409 PAYMENT_PENDING` مع `online_payment_id` (عملية معلقة لنفس الغرض، أكملها أو انتظر انتهاءها).

### `GET /online-payments/{online_payment_id}`
* **الصلاحية:** `patient` صاحب العملية، أو `reports.finance`.
* **Response (200):** نفس شكل الإنشاء. بعد النجاح `receipt` = `{ "receipt_id", "receipt_number": "B1-O-000045", "qr_code" }`.
* `status`: `pending` | `succeeded` | `failed` | `expired` | `refunded`.
* **حدث مباشر:** `online_payment.updated` على `patient_account:{id}` بنفس الشكل.

### `POST /webhooks/payments/{provider}`
* **حالياً:** لا توجد بوابة حقيقية مربوطة، فيعيد `404 PROVIDER_NOT_AVAILABLE`. البوابة التجريبية تستخدم `POST /sandbox/pay/{id}` بنفس المنطق تماماً.
* **الصلاحية:** البوابة فقط (توقيع HMAC). Idempotent على `provider_transaction_id`. **Response:** `200` بدون جسم.
* **عند النجاح:**
  * `booking_full`: الحجز `payment_status: "paid"`، وتُنشأ فاتورته مدفوعة عند تثبيت الحضور.
  * `booking_deposit`: العربون يُضاف لرصيد المريض (`kind: booking_deposit`)، ويظهر في سلة الاستقبال كرصيد `deposit_credit` عند الوصول، ويُستخدم بـ `use_deposit_credit` في `POST /payments` (القسم 9). الحجز `payment_status: "deposit_paid"`.
  * `unban_deposit`: يُرفع الحظر فوراً ويُضاف المبلغ لرصيد المريض.
  * `invoice`: البنود تصبح مدفوعة، والطلبات الطبية تظهر للمختبر والأشعة.

### البوابة التجريبية (Sandbox فقط)
* `GET /sandbox/pay/{online_payment_id}`: صفحة HTML بسيطة بزرين "نجاح" و"فشل" بدل صفحة البوابة.
* `POST /sandbox/pay/{online_payment_id}` مع `{ "result": "succeeded" }` أو `"failed"`: يحاكي الـ Webhook (للاختبار الآلي). **Response (200):** كائن الدفع بعد التحديث (`receipt` عند النجاح). في الإنتاج: `404`.
* `Payments__PublicBaseUrl` على السيرفر هو بادئة `redirect_url` (العنوان الذي يصله هاتف المريض).
* `provider` غير `sandbox` حالياً: `422 PROVIDER_NOT_AVAILABLE`.

### استرجاع الدفع الإلكتروني
* `POST /invoice-items/{id}/refunds` بطريقة `online_reversal` (القسم 8) يعكس المبلغ عبر البوابة. في الوضع التجريبي يتم فوراً.
* إلغاء حجز مدفوع إلكترونياً يحول المبلغ إلى رصيد للمريض (القسم 5) ما لم يطلب المحاسب الاسترجاع.

---

## 7. الطابور الذكي (Queue)

### حالات التذكرة
`waiting` (حجز لم يصل بعد) ← `arrived` (وصل وتم تثبيت حضوره) ← `called` (تم استدعاؤه) ← `in_room` ← `completed`
وحالات جانبية: `no_show`، `skipped` (تخطي مؤقت لحين وصوله)، `cancelled`.

**ترتيب الطابور:** في الغرفة، ثم المُستدعى، ثم الطوارئ (الأقدم أولاً)، ثم الباقون حسب `queue_position`. الحجز الذي لم يصل صاحبه يحتفظ بمكانه لكنه لا يُستدعى، فيتقدم من بعده (ضغط الطابور).
**الوقت التقديري:** يبدأ من الآن (أو بداية الوجبة) ويتقدم بمتوسط المعاينة الفعلي للطبيب اليوم (بعد 3 معاينات)، وإلا بمدة المعاينة المجدولة. لا يُعطى صاحب الحجز وقتاً أبكر من موعده الأصلي.
**الصلاحيات:** كل أزرار الطابور تتطلب `queue.manage`. الطبيب يدير طابوره فقط، وموظف الاستقبال عياداته فقط (`clinic_ids`)، والمدير ومدير الفرع كل الفرع.

### `GET /queue/live`
* **الصلاحية:** `receptionist` (عياداته)، `doctor` (طابوره)، `branch_manager`.
* **Query:** `?doctor_id=&clinic_id=&date=` (`date` افتراضياً اليوم).
* **مع `doctor_id`:** وجبة الطبيب الحالية (أول وجبة لم ينتهِ وقتها، وإلا آخر وجبة في اليوم). `204` إذا لا توجد وجبة.
* **بدون `doctor_id`:** `{ "sessions": [ ...نفس الشكل لكل طبيب... ] }` لعيادة محددة، أو لعيادات موظف الاستقبال، أو للفرع كاملاً للمدير.
* **Response (200):**
```json
{
  "session_id": "ses_7781",
  "doctor_id": "doc_05",
  "doctor_name": "د. سعد الحيدري",
  "clinic_id": "cl_internal",
  "clinic_name": "عيادة الباطنية",
  "date": "2026-11-02",
  "start": "16:00",
  "end": "21:00",
  "session_status": "open",
  "avg_consult_minutes_today": 11.5,
  "delay_minutes": 8,
  "items": [
    {
      "ticket_id": "tk_300",
      "ticket_number": "A-103",
      "patient_id": "pat_11",
      "patient_name": "حسين محمد",
      "booking_id": "bk_44",
      "source": "online",
      "priority": "normal",
      "status": "in_room",
      "payment_status": "paid",
      "invoice_id": "inv_8900",
      "queue_position": null,
      "estimated_time": "2026-11-02T17:00:00Z",
      "arrived_at": "...", "called_at": "...", "started_at": "...", "completed_at": null
    }
  ]
}
```
* ترتيب `items`: في الغرفة، المُستدعى، المنتظرون بالترتيب، ثم المتخطّون، ثم المنتهون، ثم الغائبون.
* `payment_status`: `paid` | `unpaid` | `deferred` | `refunded` | `not_billed` (حجز لم يصل بعد، لا فاتورة).
* `avg_consult_minutes_today`: `null` قبل 3 معاينات مكتملة.
* `source`: `online` | `walk_in` | `phone`. `priority`: `normal` | `emergency` | `late_reinserted`.

### `GET /public/displays/{display_id}/queue`
* **الصلاحية:** Public بمفتاح الشاشة (`X-Display-Key`) من `POST /devices`. مفتاح خاطئ: `401 INVALID_DISPLAY_KEY`.
* **الوصف:** شاشة الانتظار العامة لعيادة. **لا تعرض أسماء المرضى** حفاظاً على الخصوصية.
* **Response (200):**
```json
{
  "clinic_name": "عيادة الباطنية",
  "doctor_name": "د. سعد الحيدري",
  "now_serving": "A-103",
  "next": ["A-104", "A-105", "A-107"],
  "boards": [
    { "doctor_name": "د. سعد الحيدري", "now_serving": "A-103", "next": ["A-104", "A-105", "A-107"] },
    { "doctor_name": "د. علي كاظم", "now_serving": "B-012", "next": ["B-013"] }
  ]
}
```
* `boards`: لوحة لكل طبيب يعمل اليوم في العيادة (حرف التذكرة يميز الطبيب: A، B، ...). الحقول العليا = أول لوحة.

### `POST /queue/check-in`
* **الصلاحية:** `receptionist`.
* **Headers:** `Idempotency-Key`.
* **الوصف:** تثبيت حضور مريض. ثلاث حالات:
  1. مريض محجوز وصل: يُرسل `booking_id` (أو `booking_qr` الذي يمسحه الاستقبال من تطبيق المريض = Zero-Touch).
  2. حضور مباشر (Walk-in): يُرسل `patient_id` + `doctor_id`، ويُعطى أول رقم متاح ضمن حصة الحضور المباشر.
  3. يعمل أوفلاين: تُرسل الواجهة `ticket_id` مولداً محلياً.
* **Request:**
```json
{
  "ticket_id": "tk_301",
  "booking_id": null,
  "booking_qr": null,
  "patient_id": "pat_12",
  "doctor_id": "doc_05",
  "visit_kind": "auto"
}
```
* **Response (201):**
```json
{
  "ticket_id": "tk_301",
  "ticket_number": "A-104",
  "status": "arrived",
  "queue_position": 4,
  "estimated_time": "2026-11-02T17:12:00Z",
  "invoice_id": "inv_8901",
  "visit_kind": "new_visit",
  "amount_due": 25000,
  "payment_status": "unpaid"
}
```
* `booking_qr` يحمل معرف الحجز (`booking:<booking_id>` أو المعرف مباشرة). إعادة مسح حجز ثُبّت حضوره تعيد نفس النتيجة.
* الحضور المباشر يأخذ أول وجبة للطبيب اليوم لم ينتهِ وقتها، ويُحدد `visit_kind` تلقائياً (مراجعة إذا زار نفس الطبيب خلال `visit.follow_up_window_days`)، أو يرسله الاستقبال صراحة.
* فاتورة الكشفية تحمل لقطة السعر ونسبة الطبيب السارية (`doctor_share`) وقت الإنشاء، برقم `B1-INV-000123`.
* أخطاء: `404 BOOKING_NOT_FOUND`، `409 BOOKING_NOT_ACTIVE`، `422 BOOKING_NOT_TODAY`، `409 NO_ACTIVE_SESSION`، `409 ALREADY_IN_QUEUE`، `409 PATIENT_HAS_BOOKING` (للمريض حجز في الوجبة: ثبّت بالحجز، والرد يحمل `booking_id`)، `409 SESSION_FULL`، `422 SERVICE_NOT_CONFIGURED`.
* يُنشئ السيرفر تلقائياً فاتورة الكشفية (أو يربط الحجز المدفوع). إذا كان المبلغ مدفوعاً أونلاين: `amount_due: 0` ولا حاجة لتحصيل.
* **قاعدة:** لا تدخل التذكرة غرفة الطبيب قبل الدفع، عدا حالة الاستثناء (وحدة 14) أو الطوارئ.

### `POST /queue/tickets/{ticket_id}/call`
* **الصلاحية:** `doctor`، `receptionist`.
* **الوصف:** استدعاء المريض (يظهر على الشاشة العامة). بدون `ticket_id` محدد يمكن استخدام `POST /queue/call-next?doctor_id=` الذي يستدعي أول مريض **واصل ومدفوع** (أو طوارئ)، وإلا `404 QUEUE_EMPTY`.
* **Response (200):** `{ "ticket_id": "tk_301", "ticket_number": "A-104", "status": "called", "priority": "normal", "queue_position": null, "estimated_time": "...", "called_at": "...", "started_at": null, "completed_at": null }`
* الكشفية غير مدفوعة: `402 INVOICE_UNPAID` مع `invoice_id` و`amount_due` (عدا الطوارئ والدفع الآجل المعتمد). حالة لا تسمح: `409 INVALID_TICKET_STATE`.

### `POST /queue/tickets/{ticket_id}/start` و `POST /queue/tickets/{ticket_id}/complete`
* **الصلاحية:** `doctor`.
* بدء وانتهاء المعاينة. أوقاتهما تدخل في حساب متوسط المعاينة وإعادة حساب أوقات الانتظار.
* **Response (200):** نفس شكل رد الاستدعاء بالحالة الجديدة.
* البدء يقبل تذكرة مُستدعاة أو واصلة، ويخضع لقاعدة الدفع. مريض آخر في الغرفة: `409 DOCTOR_BUSY`.

### `POST /queue/tickets/{ticket_id}/no-show`
* **الصلاحية:** `receptionist`، `doctor`.
* **الوصف:** زر "تخطي / متأخر". يضغط الطابور للأمام (Queue Compression)، ويُحتسب غياب في سجل المريض **فقط إذا انتهت الوجبة دون وصوله**.
* **Request:** `{ "mode": "skip" }`
  * `skip`: تخطي مؤقت، والتذكرة تبقى قابلة للإرجاع إذا وصل المريض.
  * `final`: تسجيل غياب نهائي (يزيد `no_show_count` وقد يطلق الحظر).
* **Response (200):** `{ "ticket_id": "tk_305", "status": "skipped", "queue_recalculated": true, "counted_as_no_show": false, "patient_banned": false }`
* `final` يلغي فاتورة الكشفية غير المدفوعة، و`patient_banned: true` إذا بلغ المريض حد الغياب.

### `POST /queue/tickets/{ticket_id}/emergency`
* **الصلاحية:** `receptionist`، `doctor`، `branch_manager`.
* **الوصف:** زر "طوارئ". ينقل التذكرة لأول الطابور ويعيد جدولة الباقين.
* **Request:** `{ "reason": "ضيق تنفس حاد" }` (السبب إلزامي ويُسجل في التدقيق).
* **Response (200):** `{ "ticket_id": "tk_310", "priority": "emergency", "position": 1, "affected_tickets": 12 }`
* الطوارئ تُستدعى وتدخل حتى قبل الدفع (تُحصّل لاحقاً). إذا لم يكن حضوره مثبتاً يُثبت وتُنشأ فاتورته.

### `POST /queue/tickets/{ticket_id}/late-arrival`
* **الصلاحية:** `receptionist`.
* **الوصف:** مريض متأخر (أو متخطى) وصل. لا يُلغى كشفه ولا يدفع رسوماً جديدة، ويُدرج في **أول فجوة متاحة** بعد وقت وصوله.
* **Response (200):** `{ "ticket_id": "tk_305", "ticket_number": "A-105", "status": "arrived", "priority": "late_reinserted", "queue_position": 6, "estimated_time": "..." }`
* **الفجوة:** يُدرج خلف كل الحاضرين المنتظرين (لا يتقدم على من انتظر)، وقبل الحجوزات التي لم يصل أصحابها. يقبل تذكرة `skipped` أو حجزاً لم يصل (`waiting`)، وفي الأخيرة تُنشأ فاتورته.

### التقديم الذكي (Smart Fast-Forward)

* **التقديم الذكي يُفعّل مع تطبيق المريض والإشعارات** (يحتاج حسابات المرضى وPush).

#### `POST /queue/sessions/{session_id}/fast-forward-offers`
* **الصلاحية:** `queue.manage` (الاستقبال يدوياً عند ملاحظة فجوة). الاكتشاف التلقائي للفجوة إضافة لاحقة بنفس العقد.
* المرشحون: الحجوزات المنتظرة في الوجبة لمرضى لهم حساب في التطبيق. عرض واحد فعال للوجبة (`409 OFFER_ACTIVE`)، وصلاحيته 10 دقائق.
* **الوصف:** إرسال إشعار Push لعدد من المرضى اللاحقين يعرض عليهم الحضور مبكراً. أول من يقبل يأخذ الفجوة.
* **Request:** `{ "gap_minutes": 20, "max_recipients": 5 }`
* **Response (201):** `{ "offer_id": "ffo_17", "sent_to": 5, "expires_at": "2026-11-02T16:25:00Z" }`

#### `POST /fast-forward-offers/{offer_id}/respond`
* **الصلاحية:** `patient`.
* **Request:** `{ "booking_id": "bk_44", "answer": "come_now" }`
* `answer`: `come_now` (سأحضر الآن) | `keep_original` (سألتزم بموعدي).
* **Response (200):** `{ "accepted": true, "new_estimated_time": "2026-11-02T16:30:00Z" }` أو `{ "accepted": false, "reason": "OFFER_TAKEN" }`.

### Real-time events (Queue)
| الحدث | المجموعة | المحتوى |
| --- | --- | --- |
| `queue.updated` | `branch:{id}:queue` و `doctor:{id}` | `{ session_id, doctor_id, items[] }` (نفس `items` في `GET /queue/live`، بعد أي تغيير) |
| `ticket.called` | `display:{id}` | `{ ticket_number, clinic_name, doctor_name, room }` |
| `eta.changed` | `patient_account:{id}` | `{ booking_id, estimated_time, queue_position }` |

### 7.x إضافات الجزء الثالث (كلها حقول اختيارية، لا تغيير في السابق)

#### سياسة الاستدعاء لكل فرع
* إعداد الفرع `queue.call_next_by`: `doctor` | `reception` | `both` (الافتراضي `both`). يحدد من يستدعي المرضى في:
  `POST /queue/call-next`، `POST /queue/tickets/{id}/call` (استدعاء وإعادة استدعاء، ومنه استدعاء حالة الطوارئ)، و`call_next: true` في الإنهاء.
* المدير العام ومدير الفرع مسموح لهما دائماً. الدور غير المسموح يحصل على `403 CALL_NOT_ALLOWED_FOR_ROLE` ومعه `call_next_by`.
* إعداد الفرع `queue.auto_call_next` (0 أو 1، الافتراضي 0): عند الإنهاء (زر "إنهاء" أو "حفظ وإنهاء") يستدعي النظام أول مريض جاهز (واصل ومدفوع). يعمل مستقلاً عن `call_next_by`، وإذا لم يوجد مريض جاهز لا يحدث خطأ.
* `GET /queue/live` يضيف في كل طابور:
```json
"call_policy": { "call_next_by": "both", "auto_call_next": false }
```
  الفرونت يُظهر أزرار "استدعاء/التالي" للطبيب إذا كانت `doctor` أو `both`، وللاستقبال إذا كانت `reception` أو `both`.

#### إنهاء المعاينة واستدعاء التالي
`POST /api/v1/queue/tickets/{ticket_id}/complete`
* **الصلاحية:** الطبيب، أو الاستقبال (زر "إنهاء واستدعاء التالي" لطبيب لا يستخدم النظام) إذا كانت `call_next_by` هي `reception` أو `both`، أو مدير الفرع.
* الاستقبال ومدير الفرع يمكنهم إنهاء تذكرة بحالة `called` مباشرة (بدون "بدء المعاينة")، و`started_at` = وقت الاستدعاء.
* **Request (اختياري):** `{ "call_next": true }`. بدون الحقل يُطبق `queue.auto_call_next`.
* **Response (200):** نفس رد أزرار الطابور + `"next_ticket": { ...نفس الشكل... }` أو `null`.

#### "اقترب دورك" و"تفضل للدخول" المستمر
* عندما يبقى أمام المريض `queue.turn_soon_ahead` مرضى (الافتراضي 3) يصله `queue.turn_soon` مرة واحدة لكل تذكرة.
* عند الاستدعاء يصله `queue.called` (Push عالي الأولوية، صوت `queue_alarm`، `require_ack: true`) وحدث مباشر:

| الحدث | المجموعة | Payload |
| --- | --- | --- |
| `queue.call_alert` | `patient_account:{id}` | `{ ticket_id, ticket_number, doctor_name, clinic_name, floor, repeat, require_ack: true, sound: "queue_alarm" }` |

* يتكرر التنبيه كل دقيقة (`queue.call_repeat`) حتى `queue.call_alert_repeats` مرات (الافتراضي 3) ما لم يضغط المريض "أنا قادم" أو يدخل الغرفة أو يُتخطى. كل إعادة استدعاء تبدأ تنبيهاً جديداً.
* في `GET /queue/live` لكل تذكرة: `call_acknowledged_at` (null = لم يؤكد) و`call_alerts_sent`، ويظهر عند الطبيب والاستقبال "قادم".

`POST /api/v1/me/queue-tickets/{ticket_id}/acknowledge-call` (تطبيق المريض، زر "أنا قادم")
* **Response (200):** `{ "ticket_id": "...", "status": "called", "call_acknowledged_at": "..." }`. الضغط مرة ثانية يرجع نفس الوقت.
* **الأخطاء:** `409 TICKET_NOT_CALLED`، `404 TICKET_NOT_FOUND` (تذكرة ليست للمريض).

`GET /api/v1/me/queue-tickets` (طابوري اليوم، يشمل المسجل من الاستقبال بدون حجز)
```json
{ "items": [ { "ticket_id": "...", "patient_id": "...", "patient_name": "...", "ticket_number": "A-004", "status": "arrived", "source": "walk_in", "booking_id": null,
  "queue_position": 3, "patients_ahead": 2, "estimated_time": "...", "doctor_name": "...", "clinic_name": "...", "floor": 2,
  "called_at": null, "call_acknowledged_at": null, "on_the_way_at": null } ] }
```

#### دعوة الحضور المبكر (وضع invite)
`POST /api/v1/queue/sessions/{session_id}/fast-forward-offers`
* **Request:** `{ "mode": "invite", "from_time": "2026-11-02T20:00:00+03:00", "max_recipients": 30, "expires_minutes": 45 }`. كلها اختيارية عدا `mode`؛ `max_recipients` حتى 30، `expires_minutes` من 5 إلى 120 (الافتراضي 30). `mode` الافتراضي `gap` (السلوك السابق).
* تصل الدعوة للمرضى الذين مواعيدهم من `from_time` فما بعد ولم يصلوا ولهم حساب. يمكن إرسال دعوات متتالية.
* **Response (201):** `{ "offer_id": "...", "sent_to": 12, "expires_at": "...", "mode": "invite" }`.
* المريض يرد بـ `POST /fast-forward-offers/{offer_id}/respond` و `{ "booking_id": "...", "answer": "come_now", "eta_minutes": 20 }`.
* الترتيب لا يتغير. في `GET /queue/live` يظهر للتذكرة `on_the_way_at` و`on_the_way_eta_minutes` ("في الطريق").

#### المريض بدون حجز
* له حساب في التطبيق: تصله كل الإشعارات أعلاه.
* بدون حساب: يصله `queue.turn_soon` و`queue.called` بـ SMS (يحتاج ربط مزود SMS، والحالي تجريبي).

---

## 8. الفوترة والفاتورة الموحدة (Invoices)

### 8.0 نقاط التحصيل (القرار المعتمد: "ادفع حيث تُخدم" مع سلة موحدة)
مصمم للواقع العراقي: الكاش هو الأساس، والمريض قد يأخذ طلب التحليل لمختبر آخر أو يؤجله، والمختبر والأشعة يستقبلون مراجعين مباشرين.

| نقطة التحصيل | من يحصّل | ماذا يحصّل عادةً |
| --- | --- | --- |
| استقبال/سكرتير العيادة | موظف استقبال مربوط بالعيادة | الكشفية (تُنشأ تلقائياً عند `check-in`) |
| استقبال المختبر | موظف استقبال مربوط بعيادة قسمها `lab` | بنود التحاليل |
| استقبال الأشعة والسونار | موظف استقبال مربوط بعيادة قسمها `radiology` | بنود الأشعة والسونار |
| تطبيق المريض | المريض أونلاين | أي بند (اختياري) |

* **التحصيل عند الخدمة لا مسبقاً:** طلب الطبيب يدخل سلة المريض كبند غير مدفوع، ولا يُطالب به عند العيادة. يُدفع عندما يصل المريض للقسم لتنفيذه. البند الذي لا يُنفذ يبقى غير مدفوع، ولا يحتاج استرجاعاً.
* **السلة موحدة:** أي نقطة تحصيل ترى كل بنود المريض غير المدفوعة، وتستطيع تحصيلها كلها مرة واحدة إذا رغب المريض.
* **الواجهة تعرض لكل نقطة بنود قسمها أولاً** عبر `?department=` في `GET /patients/{id}/billable-items`.
* **كل نقطة لها درج ووردية وإغلاق أعمى مستقل** (وحدة 10)، والمحاسب يرى كل النقاط في تقرير واحد.
* **لا تنفيذ قبل الدفع:** قوائم عمل المختبر والأشعة لا تعرض إلا البنود المدفوعة أو المؤجلة بصلاحية (وحدة 14).
* **مراجع مباشر بدون طبيب:** استقبال القسم ينشئ الفاتورة بـ `POST /invoices` ثم يحصّلها.
* لا يحتاج هذا القرار أي endpoint إضافي: نقطة التحصيل = موظف بصلاحية `payments.collect` + جهاز (`devices`) + وردية مفتوحة.

### المبدأ
* كل طلب من الطبيب (تحليل/أشعة) يُنشئ **بنداً غير مدفوع** في سلة المريض تلقائياً.
* الاستقبال أو شباك التسديد يجلب السلة ويحصّلها دفعة واحدة.
* كل بند يحفظ **Snapshot** للسعر ونسبة الطبيب لحظة الإنشاء، فلا يتأثر بتغيير الأسعار أو النسب لاحقاً.

### الصلاحيات في هذه الوحدة
| العملية | الصلاحية |
| --- | --- |
| السلة، عرض الفواتير وبحثها، بيانات الإيصال وإعادة طباعته | `payments.collect` أو `reports.finance` أو `refunds.approve` |
| التحصيل، الفاتورة اليدوية، فتح الوردية | `payments.collect` (الاستقبال، المحاسب) |
| الخصم | `discounts.grant` (مدير الفرع، أو موظف مُنح الصلاحية) |
| طلب استرجاع | `payments.collect` أو `refunds.approve` |
| الموافقة على الاسترجاع، إلغاء فاتورة | `refunds.approve` (المحاسب، مدير الفرع) |
| مطابقة الورديات ومراجعتها | `shifts.review` (المحاسب، مدير الفرع) |

### `GET /patients/{patient_id}/billable-items`
* **الوصف:** السلة الموحدة: كل البنود غير المدفوعة (أو المؤجلة) للمريض في الفرع الحالي من كل الأقسام.
* **Query:** `?department=clinic|lab|radiology|pharmacy` (اختياري): يرتب بنود القسم المحدد أولاً ويعلّمها بـ `"is_current_department": true`، مع إبقاء باقي البنود ظاهرة.
* **Response (200):**
```json
{
  "patient_id": "pat_01",
  "deposit_credit": 10000,
  "items": [
    { "invoice_item_id": "ii_102", "invoice_id": "inv_8901", "invoice_number": "B1-INV-012044", "service_name": "تحليل دم شامل CBC",
      "item_type": "lab", "department": "lab", "ordered_by": "د. سعد الحيدري", "ordered_at": "2026-11-02T17:05:00Z",
      "quantity": 1, "price": 30000, "status": "unpaid", "is_current_department": true }
  ],
  "total_due": 30000
}
```
* `price` هو الصافي بعد الخصم. `deposit_credit`: رصيد المريض (عربون، إلغاء حجز مدفوع، استرجاع كرصيد).

### `POST /invoices`
* **الصلاحية:** `payments.collect`. **Headers:** `Idempotency-Key`.
* **الوصف:** فاتورة يدوية لمراجع مباشر (تحليل أو أشعة أو إجراء يطلبه المريض بنفسه). الكشفية تُنشأ تلقائياً عند `check-in` ولا تُقبل هنا (`400`).
* **Request:**
```json
{
  "invoice_id": "inv_8902",
  "patient_id": "pat_01",
  "items": [ { "service_id": "svc_45", "doctor_id": null, "quantity": 1 } ],
  "discount": { "type": "percent", "value": 10, "reason": "موظف في المجمع" }
}
```
* `invoice_id` اختياري (UUID من الواجهة). `quantity` من 1 إلى 100 (افتراضياً 1). حتى 50 بنداً.
* **لا يوجد `unit_price` ولا `item_type`**: السعر والنوع من جدول الخدمات.
* `doctor_id` اختياري: إذا كانت الخدمة `is_commissionable` يأخذ الطبيب نسبة "جديد" السارية اليوم (للإجراءات مثلاً).
* `discount` اختياري ويتطلب `discounts.grant` (`403` بدونها): `type` = `amount` (مبلغ) أو `percent` (نسبة حتى 100)، و`reason` إلزامي. يُوزع على البنود بنسبة أسعارها، وتُحسب حصة الطبيب على الصافي.
* **Response (201):** كائن الفاتورة الكامل (نفس شكل `GET /invoices/{id}`).

### `GET /invoices/{invoice_id}`
* **Response (200):**
```json
{
  "invoice_id": "inv_8902", "invoice_number": "B1-INV-012044", "branch_id": "br_01",
  "patient_id": "pat_01", "patient_name": "فاطمة حسن", "file_number": "B1-004512",
  "status": "paid",
  "gross_amount": 100000, "discount_amount": 10000, "net_amount": 90000, "paid_amount": 90000, "refunded_amount": 0,
  "discount_reason": "موظف في المجمع", "void_reason": null, "created_at": "2026-11-02T09:00:00Z",
  "items": [
    { "invoice_item_id": "ii_201", "service_id": "svc_45", "service_name": "فحص شامل", "item_type": "lab", "department": "lab",
      "doctor_id": null, "doctor_name": null, "ticket_id": null, "quantity": 1, "unit_price": 100000, "price": 100000,
      "discount": 10000, "net_price": 90000, "commission_rate": 0, "doctor_share": 0, "complex_share": 90000,
      "refunded_amount": 0, "status": "paid", "performed_at": null }
  ],
  "payments": [ { "payment_id": "pay_701", "receipt_id": "rcp_910", "receipt_number": "B1-R-000915", "amount": 90000, "created_at": "...", "cashier_name": "علي حسن" } ],
  "refunds": [ { "refund_id": "rf_55", "invoice_item_id": "ii_201", "amount": 30000, "method": "cash", "status": "completed", "reason": "...", "created_at": "..." } ]
}
```
* حالة الفاتورة: `unpaid` | `partially_paid` | `paid` | `deferred` | `void`. حالة البند: `unpaid` | `paid` | `deferred` | `partially_refunded` | `refunded` | `void`.
* `performed_at`: وقت التنفيذ (إنهاء المعاينة، سحب العينة، إجراء الأشعة).

### مثال على حساب نسب الطبيب (الطبيب `doc_05` بنسبة 70% جديد / 60% مراجعة حتى 2026-11-30)
| البند | السعر | النسبة | حصة الطبيب | حصة المجمع |
| --- | --- | --- | --- | --- |
| كشفية جديد | 25000 | 70% | 17500 | 7500 |
| كشفية مراجعة | 15000 | 60% | 9000 | 6000 |
| تحليل CBC | 30000 | 0% | 0 | 30000 |
| **المجموع** | **70000** | | **26500** | **43500** |

* من 2026-12-01 تسري النسب الجديدة (75% / 65%) على الفواتير الجديدة فقط.

### `GET /invoices`
* **Query:** `?patient_id=&status=unpaid|partially_paid|paid|deferred|void&from=2026-11-01&to=2026-11-30&q=&page=&page_size=`
* `q`: رقم الفاتورة أو رقم الملف أو جزء من اسم المريض. الفرع الحالي فقط، الأحدث أولاً.
* **Response (200):** `{ "items": [ { "invoice_id", "invoice_number", "patient_id", "patient_name", "file_number", "status", "net_amount", "paid_amount", "items_count", "created_at" } ], "page": 1, "page_size": 20, "total": 1 }`

### `POST /invoices/{invoice_id}/void`
* **الصلاحية:** `refunds.approve`.
* **الوصف:** إلغاء فاتورة **غير مدفوعة** بالكامل (طلب خاطئ أو مكرر). المدفوعة تُعالج بالاسترجاع.
* **Request:** `{ "reason": "طلب مكرر" }` (إلزامي).
* **Response (200):** كائن الفاتورة بحالة `void`. عليها دفعات: `409 INVOICE_HAS_PAYMENTS`.

### `POST /invoice-items/{invoice_item_id}/refunds`
* **الصلاحية:** `payments.collect` أو `refunds.approve`. **Headers:** `Idempotency-Key`.
* **الوصف:** استرجاع كلي أو جزئي لبند مدفوع. يُخفّض حصة الطبيب والمجمع **بنفس النسبة** المحفوظة في البند.
* **Request:**
```json
{ "refund_id": "rf_55", "amount": 30000, "method": "cash", "reason": "المريض ألغى التحليل قبل سحب العينة" }
```
* `method`: `cash` (من درج الوردية) | `pos` (عكس على الجهاز، يُخصم من متوقع POS) | `patient_credit` (يبقى رصيداً للمريض) | `online_reversal` (يُفعّل مع الدفع الإلكتروني: `422 REFUND_METHOD_NOT_AVAILABLE`).
* **التنفيذ:**
  * إذا كان المبلغ ≤ حد الاستقبال (`refund.cashier_limit`، افتراضياً 50000) أو كان الطالب يملك `refunds.approve`: يُنفذ فوراً (`status: "completed"`).
  * وإلا يبقى `pending_approval`، ويصل تنبيه فوري `refund.approval_needed` لمجموعة `branch:{id}:finance`.
  * `cash` و`pos` يحتاجان وردية مفتوحة لمن ينفذ (`409 NO_OPEN_SHIFT`).
* أخطاء: `409 ITEM_NOT_REFUNDABLE` (البند غير مدفوع)، `422 REFUND_EXCEEDS_PAID` + `refundable_amount` (أكبر من المتبقي بعد الاسترجاعات والطلبات المعلقة)، `409 ITEM_ALREADY_PERFORMED` (بند منفذ: الاسترجاع لمن يملك `refunds.approve` فقط).
* **Response (201):**
```json
{
  "refund_id": "rf_55", "status": "completed",
  "invoice_item_id": "ii_201", "invoice_id": "inv_8902", "service_name": "فحص شامل",
  "amount": 30000, "method": "cash", "reason": "...",
  "requested_by": "usr_12", "requested_by_name": "علي حسن", "created_at": "...",
  "decided_by": "usr_12", "decided_at": "...", "reject_reason": null,
  "doctor_share_adjustment": 0, "complex_share_adjustment": -30000,
  "invoice_net_after": 60000, "invoice_paid_after": 60000,
  "receipt": { "receipt_id": "rcp_920", "receipt_number": "B1-RF-000031", "type": "refund", "issued_at": "...", "qr_code": "...", "print_payload_url": "/receipts/rcp_920/print-payload" },
  "drawer_token": "eyJhbGciOiJFUzI1NiIs...",
  "open_drawer": true
}
```
* `receipt` يصدر عند التنفيذ فقط (`null` أثناء الانتظار). إيصال الاسترجاع يوقعه المريض. `open_drawer = true` للاسترجاع النقدي فقط.
* إيصال الدفع الأصلي يصبح `partially_refunded` أو `refunded` (يظهر عند التحقق من الـ QR).

### `GET /refunds` و `GET /refunds/{refund_id}`
* **الصلاحية:** `payments.collect` أو `refunds.approve`. **Query:** `?status=pending_approval|completed|rejected&page=`
* قائمة الموافقات للمحاسب: `GET /refunds?status=pending_approval`. العنصر بنفس شكل رد الاسترجاع.

### `POST /refunds/{refund_id}/approve` و `POST /refunds/{refund_id}/reject`
* **الصلاحية:** `refunds.approve`. لا يوافق الموظف على طلبه بنفسه.
* **approve:** يُنفذ الاسترجاع. النقد يخرج من درج المعتمد إن كانت له وردية مفتوحة، وإلا من درج طالب الاسترجاع إن كانت ورديته ما زالت مفتوحة، وإلا `409 NO_OPEN_SHIFT`. **Response:** كائن الاسترجاع مع `receipt` و`drawer_token`.
* **reject:** `{ "reason": "..." }` (إلزامي). **Response:** كائن الاسترجاع بحالة `rejected`.
* تم البت مسبقاً: `409 REFUND_NOT_PENDING`.

---

## 9. التحصيل والإيصالات (Payments & Receipts)

### المبدأ
* **لا يوجد تحصيل بدون إيصال.** كل دفعة تُنشئ إيصالاً برقم تسلسلي لكل فرع و QR للتحقق.
* الدرج لا ينفتح إلا بـ `drawer_token` موقّع من السيرفر (انظر وحدة 16).
* كل دفعة مرتبطة بوردية مفتوحة للموظف. بدون وردية: `409 NO_OPEN_SHIFT`.
* أرقام الإيصالات: `B1-R-000915` (قبض وعربون)، `B1-RF-000031` (استرجاع).

### `POST /payments`
* **الصلاحية:** `payments.collect`. **Headers:** `Idempotency-Key`.
* **الوصف:** تحصيل بند أو أكثر من سلة المريض، بطريقة دفع واحدة أو أكثر (جزء كاش وجزء POS)، مع استخدام رصيده.
* **Request:**
```json
{
  "payment_id": "pay_701",
  "patient_id": "pat_01",
  "invoice_item_ids": ["ii_102", "ii_104"],
  "use_deposit_credit": 10000,
  "tenders": [
    { "method": "cash", "amount": 40000 },
    { "method": "pos", "amount": 15000, "pos_terminal": "qicard_pos_1", "pos_reference": "TX-883201" }
  ]
}
```
* `payment_id` اختياري (UUID من الواجهة). `method`: `cash` | `pos` (زين كاش / كي كارد)، و`pos_reference` إلزامي مع `pos`.
* مجموع `tenders` يجب أن يساوي مجموع البنود ناقص الرصيد المستخدم **بالضبط**: وإلا `422 AMOUNT_MISMATCH` مع `expected_amount` و`total_due`. إذا غطى الرصيد المبلغ كله تُرسل `tenders: []`.
* أخطاء:
  * `404 INVOICE_ITEM_NOT_FOUND` + `invoice_item_ids`: بند ليس في سلة هذا المريض في هذا الفرع.
  * `409 ITEM_NOT_PAYABLE` + `invoice_item_ids`: بند دُفع أو أُلغي (حدّث السلة).
  * `422 INSUFFICIENT_CREDIT` + `credit_balance`: الرصيد المستخدم أكبر من رصيد المريض أو من المستحق.
  * `422 OFFLINE_NOT_AVAILABLE`: إرسال `offline_receipt_number` أو `created_offline_at` قبل تفعيل المزامنة.
* **Response (201):**
```json
{
  "payment_id": "pay_701",
  "shift_id": "sh_412",
  "total_paid": 55000,
  "deposit_used": 10000,
  "receipt": {
    "receipt_id": "rcp_910",
    "receipt_number": "B1-R-000915",
    "type": "payment",
    "issued_at": "2026-11-02T17:20:00Z",
    "qr_code": "https://verify.<domain>/r/7KQ2-M9XA-4F",
    "print_payload_url": "/receipts/rcp_910/print-payload"
  },
  "drawer_token": "eyJhbGciOiJFUzI1NiIs...",
  "open_drawer": true
}
```
* `open_drawer = true` و`drawer_token` فقط إذا كان فيها مبلغ نقدي. الواجهة تجلب `print_payload` وترسله مع التوكن للوكيل المحلي (وحدة 16).
* دفع الكشفية يحدّث الطابور فوراً (`queue.updated`) ويصبح `payment_status: "paid"`، فيستطيع الطبيب بدء المعاينة.

### `GET /receipts/{receipt_id}/print-payload`
* **Query:** `?copy=2` (يأتي من رد إعادة الطباعة).
* **Response (200):**
```json
{
  "receipt_number": "B1-R-000915",
  "type": "payment",
  "type_ar": "إيصال قبض",
  "branch_name": "مجمع الرحمة الطبي - الفرع الرئيسي",
  "issued_at": "2026-11-02T17:20:00Z",
  "cashier_name": "علي حسن",
  "patient_name": "فاطمة حسن",
  "file_number": "B1-004512",
  "lines": [ { "text": "تحليل دم شامل CBC", "amount": 30000 }, { "text": "سونار بطن", "amount": 35000 } ],
  "deposit_used": 10000,
  "tenders": [ { "method": "cash", "amount": 40000 }, { "method": "pos", "amount": 15000 } ],
  "total": 55000,
  "qr_code": "https://verify.<domain>/r/7KQ2-M9XA-4F",
  "footer": "لا يعتد بأي إيصال يدوي",
  "is_copy": false,
  "copy_number": 1
}
```
* `type`: `payment` (قبض) | `deposit` (عربون) | `refund` (استرجاع). في النسخة المكررة `is_copy = true` ويبدأ `footer` بـ "نسخة مكررة".
* اسم المجمع والتذييل ورابط الـ QR من إعدادات السيرفر (`Receipts__ComplexName`، `Receipts__Footer`، `Receipts__VerifyBaseUrl`).

### `POST /receipts/{receipt_id}/reprint`
* **الوصف:** نسخة مكررة. **لا تفتح الدرج** ولا تحتاج توكن. تُسجل في التدقيق وتظهر في مطابقة الوردية.
* الاستقبال مرة واحدة لكل إيصال (`403 REPRINT_LIMIT` بعدها)، والمحاسب بلا حد.
* **Response (200):** `{ "print_payload_url": "/receipts/rcp_910/print-payload?copy=2", "copy_number": 2 }`

### `GET /public/receipts/verify/{code}`
* **الصلاحية:** Public (يُفتح من مسح الـ QR). لا يعرض بيانات المريض.
* **Response (200):**
```json
{ "valid": true, "receipt_number": "B1-R-000915", "type": "payment", "issued_at": "2026-11-02T17:20:00Z", "total": 55000, "branch_name": "الفرع الرئيسي", "status": "valid" }
```
* `status`: `valid` | `partially_refunded` | `refunded`. رمز غير موجود: `404 RECEIPT_NOT_FOUND` (اعرض "إيصال غير صحيح").

---

## 10. الورديات والإغلاق الأعمى (Shifts & Blind Closing)

### `POST /shifts/open`
* **الصلاحية:** `payments.collect`. **Headers:** `Idempotency-Key`.
* **Request:** `{ "shift_id": "sh_412", "opening_float": 50000, "device_id": "dev_rec_pc_03", "clinic_id": "cl_lab_01" }`
* `shift_id` و`device_id` و`clinic_id` اختيارية. `opening_float`: الفكة المستلمة في بداية الوردية. `device_id` يدخل في توكن الدرج.
* `clinic_id`: **نقطة التحصيل** (عيادة، مختبر، أشعة، صيدلية) التي يعمل عليها الدرج. يجب أن تكون في الفرع الحالي وفعالة، وإلا `400` مع `errors.clinic_id`. بدونها تُعد وردية استقبال عامة للفرع. تظهر في المطابقة والقائمة لتعرف إيرادات كل قسم.
* **Response (201):** `{ "shift_id": "sh_412", "status": "open", "opened_at": "...", "closed_at": null, "opening_float": 50000, "device_id": null, "receipts_count": 0, "clinic_id": "cl_lab_01", "clinic_name": "المختبر", "department": "lab" }`. وردية مفتوحة مسبقاً: `409 SHIFT_ALREADY_OPEN`.

### `GET /shifts/current`
* **الوصف:** الوردية المفتوحة للموظف، بنفس الشكل أعلاه. **لا تعرض المبالغ المتوقعة** (مبدأ الإغلاق الأعمى). لا توجد: `404 NO_OPEN_SHIFT` (اعرض زر "فتح وردية").

### `POST /shifts/{shift_id}/close`
* **الصلاحية:** صاحب الوردية فقط. **Headers:** `Idempotency-Key`.
* **الوصف:** الإغلاق الأعمى. الموظف يُدخل ما عدّه بيده لكل طريقة دفع، دون رؤية متوقع النظام.
* **Request:**
```json
{
  "declared": { "cash": 450000, "pos_slips_count": 12, "pos_total": 180000 },
  "cash_denominations": { "25000": 14, "10000": 6, "5000": 4, "1000": 0, "250": 0 },
  "note": ""
}
```
* `declared.cash` إلزامي (صفر إن لم يوجد نقد). `cash_denominations` اختياري ويساعد في التدقيق.
* كل نقطة تحصيل (عيادة، مختبر، أشعة) تغلق ورديتها بشكل مستقل (انظر 8.0).
* **Response (200) للموظف:** كائن الوردية بحالة `closed_pending_review`. **الموظف لا يرى الفرق.**
* النتيجة تظهر للمحاسب فقط عبر المطابقة، ويصله حدث فوري `shift.closed` على `branch:{id}:finance`: `{ "shift_id", "user_id", "audit_status", "variance_total" }`.

### `GET /shifts/{shift_id}/reconciliation`
* **الصلاحية:** `shifts.review`.
* **Response (200):**
```json
{
  "shift_id": "sh_412", "user_id": "usr_12", "cashier_name": "علي حسن", "status": "closed_pending_review",
  "clinic_id": "cl_lab_01", "clinic_name": "المختبر", "department": "lab",
  "opened_at": "2026-11-02T14:00:00Z", "closed_at": "2026-11-02T22:00:00Z", "opening_float": 50000,
  "lines": [
    { "method": "cash", "expected": 455000, "declared": 450000, "variance": -5000 },
    { "method": "pos", "expected": 180000, "declared": 180000, "variance": 0 },
    { "method": "online", "expected": 0, "declared": null, "variance": null }
  ],
  "cash_breakdown": { "opening_float": 50000, "cash_received": 440000, "cash_refunds": -30000, "cash_expenses": -5000, "expenses_count": 1, "expected_in_drawer": 455000 },
  "receipts_count": 47, "refunds_count": 1, "reprints_count": 2,
  "declared_pos_slips_count": 12, "pos_slips_count": 12,
  "cash_denominations": { "25000": 14, "10000": 6, "5000": 4 },
  "close_note": null,
  "audit_status": "SHORTAGE", "variance_total": -5000,
  "review_decision": null, "review_note": null, "reviewed_at": null
}
```
* `audit_status`: `MATCHED` | `SHORTAGE` (عجز) | `OVERAGE` (زيادة). للوردية المفتوحة تظهر الأرقام الحالية و`variance` = `null`.
* `cash_received` يشمل الكشفيات والتحاليل والعربون. `cash_expenses`: مصاريف صُرفت نقداً من هذا الدرج (القسم 20)، تُطرح من المتوقع. `pos_slips_count` عدد عمليات POS في النظام، للمقارنة مع ما عدّه الموظف.

### `POST /shifts/{shift_id}/review`
* **الصلاحية:** `shifts.review`. لا يراجع الموظف ورديته بنفسه.
* **Request:** `{ "decision": "accepted", "note": "العجز يُخصم من الموظف" }`. `decision`: `accepted` | `escalated`. `note` إلزامي إذا لم تكن `MATCHED`.
* **Response (200):** المطابقة بعد المراجعة (`status: "reviewed"`). أخطاء: `409 SHIFT_NOT_CLOSED`، `409 SHIFT_ALREADY_REVIEWED`.

### `GET /shifts`
* **الصلاحية:** `shifts.review`.
* **Query:** `?status=open|closed_pending_review|reviewed&cashier_id=&clinic_id=&from=&to=&page=&page_size=`
* **Response (200):** `{ "items": [ { "shift_id", "user_id", "cashier_name", "status", "opened_at", "closed_at", "audit_status", "variance_total", "clinic_id", "clinic_name", "department" } ], "page", "page_size", "total" }`

---

## 11. العيادة والسجل الطبي (Clinical EMR)

### المبدأ
* الطبيب يفتح المعاينة لمريض **داخل غرفته** (تذكرة `in_room` عنده، بعد `POST /queue/tickets/{id}/start`)، أو بعد إنهاء الزيارة (`completed`) لتوثيقها متأخراً. معاينة واحدة لكل تذكرة.
* كل طلب تحليل أو أشعة ينشئ **طلباً طبياً** (`order_item_id`) و**بنداً غير مدفوع** في سلة المريض (القسم 8) بسعر الخدمة من السيرفر. المختبر والأشعة لا يريان الطلب حتى يُدفع أو يُستثنى (القسم 14).
* `private_notes` للأطباء فقط: لا تظهر للمريض ولا للصيدلية ولا للمختبر ولا لأي دور غير `doctor`.
* إنهاء الزيارة بـ `POST /queue/tickets/{id}/complete` (القسم 7)، منفصل عن حفظ المعاينة.

### كائن المعاينة `<consultation>`
```json
{
  "consultation_id": "con_502",
  "ticket_id": "tk_300", "ticket_number": "A-012",
  "patient": { "patient_id": "pat_01", "full_name": "فاطمة حسن", "file_number": "R1-004512", "gender": "female", "age": 35 },
  "doctor_id": "doc_05", "doctor_name": "د. سعد الحيدري", "clinic_name": "عيادة الباطنية",
  "visit_kind": "new_visit",
  "diagnosis": "Acute Bronchitis", "icd10_code": "J20.9",
  "clinical_notes": "سعال منذ 5 أيام، حرارة 38.2",
  "private_notes": "متابعة ضغط الدم في الزيارة القادمة",
  "follow_up_after_days": 14, "follow_up_date": "2026-11-16",
  "prescription": {
    "prescription_id": "rx_502", "prescription_code": "RX-7KQ2M9", "status": "not_dispensed", "expires_at": "2026-12-02T17:08:00Z",
    "lines": [
      { "line_no": 1, "drug_name": "Augmentin 1g", "dose": "1 حبة", "frequency": "مرتين يومياً", "duration_days": 7, "instructions": "بعد الأكل" }
    ]
  },
  "orders": [
    { "order_item_id": "oi_103", "department": "lab", "service_id": "svc_45", "service_name": "CBC", "note": "صائم",
      "status": "paid", "payment_status": "paid", "invoice_item_id": "ii_102", "price": 30000, "has_critical": false, "result_available": false }
  ],
  "addenda": [ { "addendum_id": "ad_1", "text": "المريض اتصل وأفاد بتحسن", "created_by": "د. سعد الحيدري", "created_at": "..." } ],
  "editable_until": "2026-11-03T17:08:00Z",
  "created_at": "2026-11-02T17:08:00Z", "updated_at": "2026-11-02T17:08:00Z"
}
```
* `prescription` = `null` إذا لم تُكتب وصفة. `status` للطلب كما في القسمين 12 و13، و`payment_status`: `unpaid` | `paid` | `deferred` | `refunded` | `void`.
* `result_available`: النتيجة معتمدة (`released`) وجاهزة للعرض.

### `POST /consultations`
* **الصلاحية:** `doctor` (الطبيب من التوكن). **Headers:** `Idempotency-Key`.
* **Request:**
```json
{
  "consultation_id": "con_502",
  "ticket_id": "tk_300",
  "diagnosis": "Acute Bronchitis",
  "icd10_code": "J20.9",
  "clinical_notes": "سعال منذ 5 أيام، حرارة 38.2",
  "private_notes": "متابعة ضغط الدم في الزيارة القادمة",
  "prescription": [
    { "drug_name": "Augmentin 1g", "dose": "1 حبة", "frequency": "مرتين يومياً", "duration_days": 7, "instructions": "بعد الأكل" }
  ],
  "lab_orders": [ { "service_id": "svc_45", "note": "صائم" } ],
  "radiology_orders": [ { "service_id": "svc_70", "note": "تقييم الكبد" } ],
  "follow_up_after_days": 14
}
```
* كل الحقول اختيارية عدا `ticket_id`. `prescription` حتى 30 سطراً، `drug_name` إلزامي في كل سطر.
* خدمات الطلبات من الفرع الحالي وفعالة: `lab_orders` من نوع `lab`، و`radiology_orders` من نوع `radiology`، وإلا `400` مع `errors`.
* **Response (201):** `<consultation>`.
* أخطاء: `404 TICKET_NOT_FOUND`، `409 INVALID_TICKET_STATE` (المريض ليس داخل غرفة هذا الطبيب)، `409 CONSULTATION_EXISTS` مع `consultation_id` (للتذكرة معاينة، عدّلها بـ PATCH).

### `GET /consultations/{consultation_id}`
* **الصلاحية:** `doctor` (أي طبيب، لمتابعة المريض). **Response (200):** `<consultation>`. غير موجودة: `404 CONSULTATION_NOT_FOUND`.

### `GET /consultations`
* **الصلاحية:** `doctor`. **Query:** `?ticket_id=` أو `?patient_id=` (أحدهما إلزامي)، `&page=`.
* **Response (200):** `{ "items": [ <consultation> ], "page", "page_size", "total" }` الأحدث أولاً. `?ticket_id=` يستخدمه الطبيب لمعرفة هل فُتحت معاينة للتذكرة.

### `PATCH /consultations/{consultation_id}`
* **الصلاحية:** الطبيب صاحب المعاينة، خلال `consultation.edit_window_hours` (افتراضياً 24 ساعة) من إنشائها.
* **Request:** أي من: `diagnosis`، `icd10_code`، `clinical_notes`، `private_notes`، `follow_up_after_days`، `prescription` (تستبدل الأسطر كاملة، وفقط قبل الصرف).
* **Response (200):** `<consultation>`. أخطاء: `403 FORBIDDEN` (ليست معاينتك)، `409 EDIT_WINDOW_CLOSED` (أضف ملحقاً)، `409 PRESCRIPTION_ALREADY_DISPENSED`.

### `POST /consultations/{consultation_id}/orders`
* **الصلاحية:** الطبيب صاحب المعاينة، خلال نافذة التعديل. **Headers:** `Idempotency-Key`.
* **Request:** `{ "lab_orders": [ { "service_id": "svc_46" } ], "radiology_orders": [] }`
* **Response (201):** `<consultation>` بعد الإضافة.

### `POST /consultations/{consultation_id}/addenda`
* **الصلاحية:** الطبيب صاحب المعاينة (في أي وقت). **Request:** `{ "text": "..." }` (إلزامي).
* **Response (201):** `<consultation>`. الأصل لا يتغير، والملحق يظهر بتاريخه واسم كاتبه.

### الطلب المباشر من الاستقبال (بدون معاينة)
#### `POST /medical-orders`
* **الصلاحية:** `patients.write` أو `payments.collect` (الاستقبال). **Headers:** `Idempotency-Key`.
* **الوصف:** مريض جاء بورقة طبيب من خارج المجمع يريد تحليلاً أو أشعة.
* **Request:** `{ "patient_id": "pat_01", "items": [ { "service_id": "svc_45", "note": "" } ], "referring_doctor_name": "د. خارجي" }`
* **Response (201):** `{ "items": [ { "order_item_id": "oi_120", "department": "lab", "service_name": "CBC", "invoice_item_id": "ii_140", "price": 30000, "status": "ordered" } ] }`. البنود تظهر في السلة للدفع.

#### `POST /medical-orders/{order_item_id}/cancel`
* **الصلاحية:** الطبيب الطالب، أو الاستقبال. **Request:** `{ "reason": "طلب خاطئ" }`.
* يُلغى الطلب غير المدفوع فقط (والبند في السلة يصبح `void`). المدفوع يُسترجع بالقسم 8: `409 INVALID_ORDER_STATE`.
* **Response (200):** `{ "order_item_id": "oi_120", "status": "cancelled" }`

### `GET /me/patients/{patient_id}/visits`
* **الصلاحية:** `patient` (تطبيق المريض، لمريض مربوط بحسابه). **Query:** `?page=`
* **Response (200):**
```json
{
  "items": [
    {
      "consultation_id": "con_502", "date": "2026-11-02", "doctor_name": "د. سعد الحيدري", "clinic_name": "عيادة الباطنية",
      "diagnosis": "Acute Bronchitis", "follow_up_date": "2026-11-16",
      "prescription": { "prescription_code": "RX-7KQ2M9", "status": "not_dispensed", "expires_at": "...", "lines": [ { "line_no": 1, "drug_name": "Augmentin 1g", "dose": "1 حبة", "frequency": "مرتين يومياً", "duration_days": 7, "instructions": "بعد الأكل" } ] },
      "orders": [ { "order_item_id": "oi_103", "department": "lab", "service_name": "CBC", "status": "released", "result_available": true, "payment_required": false } ]
    }
  ],
  "page": 1, "page_size": 20, "total": 1
}
```
* **بدون** `private_notes` و`clinical_notes` و`icd10_code`. `payment_required: true` يعني النتيجة جاهزة لكن البند غير مدفوع (يعرض التطبيق زر الدفع، القسم 6).
* النتيجة نفسها: `GET /lab/orders/{id}/result` و`GET /radiology/orders/{id}/report` بتوكن المريض.

### Real-time events (Clinical)
| الحدث | المجموعة | المحتوى |
| --- | --- | --- |
| `order.created` | `branch:{id}:lab` أو `branch:{id}:radiology` | `{ order_item_id, department, service_name, patient_name, status }` (عند الدفع أو الاستثناء فقط) |

### 11.x "حفظ وإنهاء" بعد التشخيص (إضافة)
* `POST /api/v1/consultations` و `PATCH /api/v1/consultations/{id}` يقبلان حقلين اختياريين:
  * `finish_visit: true`: بعد الحفظ تُنهى المعاينة في الطابور (مثل `POST /queue/tickets/{id}/complete`) إذا كان المريض ما زال في الغرفة.
  * `call_next: true | false`: مع `finish_visit` فقط (وإلا `400`). بدونه يُطبق `queue.auto_call_next`. إذا كانت `call_next_by = reception` فطلب `call_next: true` من الطبيب يرجع `403 CALL_NOT_ALLOWED_FOR_ROLE` قبل حفظ أي شيء.
* الرد يضيف `"queue": { ...رد الإنهاء..., "next_ticket": {...} | null }` عند `finish_visit`، وإلا `null`.

---

## 12. المختبر (Laboratory)

### حالات طلب التحليل
`ordered` (غير مدفوع، لا يظهر للمختبر) ← `paid` أو `deferred` ← `sample_collected` ← `in_progress` ← `resulted` (مسودة) ← `released` (معتمدة وتظهر للطبيب والمريض). أو `cancelled`.
* الدفع أو الاستثناء ينقل الطلب من `ordered` تلقائياً. الاسترجاع الكامل لبند لم تُسحب عينته يجعله `cancelled`.
* فني المختبر يرى طلبات فرعه الحالي فقط.

### `GET /lab/worklist`
* **الصلاحية:** `lab.write` (فني المختبر).
* **Query:** `?status=paid|sample_collected|in_progress|resulted|released&date=2026-11-02&q=&page=&page_size=`
* `status` بدون قيمة: كل ما لم يُعتمد بعد (`paid` و`deferred` و`sample_collected` و`in_progress` و`resulted`) **من كل الأيام** حتى لا يضيع طلب مفتوح من الأمس. `date` يحصر بتاريخ الطلب، ومع `status=released` بتاريخ الاعتماد. `q`: اسم المريض أو رقم ملفه أو باركود العينة.
* **Response (200):**
```json
{
  "items": [
    { "order_item_id": "oi_103", "patient_id": "pat_01", "patient_name": "فاطمة حسن", "file_number": "R1-004512", "gender": "female", "age": 35,
      "service_id": "svc_45", "service_name": "CBC", "ordered_by": "د. سعد الحيدري", "status": "paid", "payment_status": "paid",
      "sample_barcode": null, "has_critical": false, "ordered_at": "2026-11-02T17:05:00Z", "note": "صائم" }
  ],
  "page": 1, "page_size": 20, "total": 1
}
```
* `ordered_by` = `null` للطلب المباشر من الاستقبال (مع `referring_doctor_name` إن وُجد).

### `POST /lab/orders/{order_item_id}/collect-sample`
* **الصلاحية:** `lab.write`. **Request:** `{ "sample_barcode": "S-26110201" }`. الباركود اختياري: بدونه يولده السيرفر (`S-YYMMDD-NNNN`) ليُطبع على الأنبوب.
* **Response (200):** `{ "order_item_id": "oi_103", "status": "sample_collected", "sample_barcode": "S-261102-0001" }`
* أخطاء: `402 INVOICE_UNPAID` (غير مدفوع ولا استثناء)، `409 INVALID_ORDER_STATE`، `409 DUPLICATE_BARCODE`.

### `POST /lab/orders/{order_item_id}/start`
* **الصلاحية:** `lab.write`. اختياري لتتبع "قيد العمل". **Response (200):** `{ "order_item_id": "oi_103", "status": "in_progress" }`

### قالب التحليل
#### `GET /lab/tests/{service_id}/template`
* **الصلاحية:** موظفون. **Response (200):**
```json
{
  "service_id": "svc_45", "service_name": "CBC", "result_type": "numeric",
  "parameters": [
    { "code": "WBC", "name": "White Blood Cells", "unit": "10^9/L", "ref_low": 4.0, "ref_high": 11.0, "critical_low": 2.0, "critical_high": 30.0, "sort_order": 1 },
    { "code": "HGB", "name": "Hemoglobin", "unit": "g/dL", "ref_low": 12.0, "ref_high": 16.0, "critical_low": 7.0, "critical_high": 20.0, "sort_order": 2 }
  ]
}
```
* `result_type`: `numeric` (له بارامترات) | `text` (تحليل وصفي مثل الزرع، بدون بارامترات).

#### `PUT /lab/tests/{service_id}/template`
* **الصلاحية:** `services.manage`. **Request:** `{ "parameters": [ <بارامتر بدون sort_order أو معه> ] }` (يستبدل القالب كاملاً، و`code` فريد في التحليل). قائمة فارغة = تحليل وصفي.
* الحدود اختيارية، ويجب أن تكون `critical_low <= ref_low <= ref_high <= critical_high` عند وجودها. **Response (200):** القالب.

### `PUT /lab/orders/{order_item_id}/result`
* **الصلاحية:** `lab.write`.
* **Request:**
```json
{
  "values": [ { "code": "WBC", "value": 7.5 }, { "code": "HGB", "value": 6.8 } ],
  "text_result": null,
  "comment": "",
  "attachments": [ { "file_id": "file_88" } ],
  "release": true,
  "amend_reason": null
}
```
* `values` لكل بارامترات القالب عند الاعتماد (`release: true`)، وفي المسودة يمكن جزء منها. `text_result` للتحاليل الوصفية. المرفقات ملفات مرفوعة لنفس الطلب (`purpose: "lab"`).
* `release: false` يحفظ مسودة (`resulted`)، و`true` يعتمد (`released`). تعديل نتيجة معتمدة يحتاج `amend_reason` ويُسجل في التدقيق، ويُشعر الطبيب.
* **Response (200):** `<lab_result>` (أدناه).
* السيرفر يحسب `flag` لكل قيمة: `normal` | `low` | `high` | `critical_low` | `critical_high`.
* عند الاعتماد: إشعار `lab.result_ready` للطبيب الطالب وللمريض، ومع قيمة حرجة إشعار فوري `lab.critical_value` للطبيب.
* أخطاء: `402 INVOICE_UNPAID`، `409 INVALID_ORDER_STATE` (لم تُسحب العينة)، `400` مع `errors` (رمز غير موجود في القالب أو قيمة ناقصة).

### `GET /lab/orders/{order_item_id}/result`
* **الصلاحية:** `doctor`، `lab.write`، و`patient` (لمريض مربوط بحسابه، وللنتيجة المعتمدة فقط).
* **شرط الدفع:** للمريض، بند غير مدفوع ولا استثناء: `402 INVOICE_UNPAID` (والطبيب يرى النتيجة دائماً).
* **Response (200) `<lab_result>`:**
```json
{
  "order_item_id": "oi_103", "service_name": "CBC", "status": "released",
  "patient": { "patient_id": "pat_01", "full_name": "فاطمة حسن", "file_number": "R1-004512", "gender": "female", "age": 35 },
  "ordered_by": "د. سعد الحيدري", "sample_barcode": "S-261102-0001", "sample_collected_at": "...",
  "values": [
    { "code": "WBC", "name": "White Blood Cells", "unit": "10^9/L", "value": 7.5, "ref_low": 4.0, "ref_high": 11.0, "flag": "normal" },
    { "code": "HGB", "name": "Hemoglobin", "unit": "g/dL", "value": 6.8, "ref_low": 12.0, "ref_high": 16.0, "flag": "critical_low" }
  ],
  "text_result": null, "comment": "",
  "attachments": [ { "file_id": "file_88", "file_name": "cbc.pdf", "content_type": "application/pdf", "url": "https://minio...", "expires_in": 300 } ],
  "has_critical": true, "released_at": "...", "released_by": "أحمد كريم", "amended": false
}
```
* المريض لا يرى نتيجة غير معتمدة: `404 RESULT_NOT_READY`.

---

## 13. الأشعة والسونار (Radiology) - قسم مستقل

### حالات طلب الأشعة
`ordered` ← `paid` أو `deferred` ← `scheduled` (اختياري) ← `performed` ← `reported` (مسودة) ← `released`. أو `cancelled`.
* `modality` من الخدمة: `xray` | `ultrasound` | `ct` | `mri`. أخصائي الأشعة يرى طلبات فرعه الحالي فقط.

### `GET /radiology/worklist`
* **الصلاحية:** `radiology.write`.
* **Query:** `?modality=&status=paid|scheduled|performed|reported|released&date=&q=&page=&page_size=` (الافتراضي كما في المختبر: كل ما لم يُعتمد).
* **Response (200):** مثل قائمة المختبر بدون `sample_barcode`، مع `"modality": "ultrasound"` و`"scheduled_at"` و`"room"` و`"performed_at"`.

### `POST /radiology/orders/{order_item_id}/schedule`
* **الوصف:** موعد للأشعة التي لا تُنفذ فوراً (المفراس والرنين غالباً). **Request:** `{ "scheduled_at": "2026-11-03T09:30:00Z", "room": "MRI-1" }`
* **Response (200):** `{ "order_item_id": "oi_104", "status": "scheduled", "scheduled_at": "...", "room": "MRI-1" }`. يمكن إعادة الجدولة قبل التنفيذ.

### `POST /radiology/orders/{order_item_id}/performed`
* **Response (200):** `{ "order_item_id": "oi_104", "status": "performed", "performed_at": "..." }`. يُقبل من `paid` أو `deferred` أو `scheduled`.
* أخطاء الأقسام كلها: `402 INVOICE_UNPAID`، `409 INVALID_ORDER_STATE`.

### `PUT /radiology/orders/{order_item_id}/report`
* **الصلاحية:** `radiology.write`.
* **Request:**
```json
{ "findings": "الكبد بحجم طبيعي، لا توجد آفات بؤرية...", "impression": "فحص طبيعي",
  "attachments": [ { "file_id": "file_90" }, { "file_id": "file_91" } ], "release": true, "amend_reason": null }
```
* `findings` إلزامي. بعد `performed` فقط. قواعد المسودة والاعتماد والتعديل والإشعار (`radiology.report_ready`) كما في المختبر.
* **Response (200):** `<radiology_report>`.

### `GET /radiology/orders/{order_item_id}/report`
* **الصلاحية وشرط الدفع:** كما في `GET /lab/orders/{id}/result`.
* **Response (200) `<radiology_report>`:**
```json
{
  "order_item_id": "oi_104", "service_name": "سونار بطن", "modality": "ultrasound", "status": "released",
  "patient": { "patient_id": "pat_01", "full_name": "فاطمة حسن", "file_number": "R1-004512", "gender": "female", "age": 35 },
  "ordered_by": "د. سعد الحيدري", "scheduled_at": null, "room": null, "performed_at": "...",
  "findings": "...", "impression": "فحص طبيعي",
  "attachments": [ { "file_id": "file_90", "file_name": "us1.jpg", "content_type": "image/jpeg", "url": "https://minio...", "expires_in": 300 } ],
  "released_at": "...", "reported_by": "د. هدى ناصر", "amended": false
}
```

### رفع الملفات (صور الأشعة و PDF) - MinIO

#### `POST /files/upload-url`
* **الصلاحية:** `radiologist`، `lab_tech` لملفات الأشعة والمختبر. لـ `purpose: "doctor_photo"`: `services.manage` أو الطبيب نفسه (مع `doctor_id` بدل `order_item_id`).
* **الوصف:** طلب رابط رفع مؤقت (Presigned) إلى MinIO المحلي. الملف يُرفع من المتصفح مباشرة إلى MinIO ولا يمر على سيرفر .NET.
* **Request:**
```json
{ "file_name": "abdomen_us_1.jpg", "content_type": "image/jpeg", "size_bytes": 2480000, "purpose": "radiology", "order_item_id": "oi_104" }
```
* الأنواع المسموحة: `image/jpeg`، `image/png`، `application/pdf`، `application/dicom`. الحد: 200MB.
* لصورة الطبيب: `{ "file_name": "dr.jpg", "content_type": "image/jpeg", "size_bytes": 150000, "purpose": "doctor_photo", "doctor_id": "doc_05" }`، JPG أو PNG فقط وحدها 2MB.
* المتصفح يرفع الملف بـ `PUT` على `upload_url` مع ترويسة `Content-Type` المعطاة، ثم يستدعي `complete`.
* **Response (201):**
```json
{
  "file_id": "file_90",
  "upload_url": "https://minio.branch1.local/medical/rad/oi_104/file_90?X-Amz-Signature=...",
  "method": "PUT",
  "headers": { "Content-Type": "image/jpeg" },
  "expires_in": 900
}
```

#### `POST /files/{file_id}/complete`
* **الوصف:** تأكيد انتهاء الرفع. السيرفر يتحقق من وجود الملف وحجمه.
* **Response (200):** `{ "file_id": "file_90", "status": "stored" }`
* **أخطاء:** `422 FILE_NOT_UPLOADED` (الملف لم يصل إلى التخزين بعد)، `422 FILE_TOO_LARGE` (الحجم الفعلي أكبر من المسموح، ويُحذف الملف). تكرار الاستدعاء بعد النجاح يعيد نفس النتيجة.

#### `GET /files/{file_id}/download-url`
* **Response (200):** `{ "url": "https://minio.branch1.local/...&X-Amz-Signature=...", "expires_in": 300 }`
* لا تُخزن روابط دائمة في قاعدة البيانات، فقط `object_key`. النسخ إلى AWS S3 يتم في الخلفية ولا يظهر للواجهة.

---

## 14. الاستثناء والدفع الآجل (Deferred Payment)

### `POST /deferrals`
* **الصلاحية:** `deferrals.grant` (الطبيب، مدير الفرع، المدير العام). **Headers:** `Idempotency-Key`.
* **الوصف:** السماح بتنفيذ الخدمة وعرض النتيجة قبل الدفع للحالات الإنسانية أو الطارئة. البنود تبقى ديناً على المريض، وحالتها `deferred`، والطابور يعاملها كالمدفوعة (`payment_status: "deferred"`).
* **Request:**
```json
{
  "deferral_id": "df_19",
  "patient_id": "pat_01",
  "invoice_item_ids": ["ii_102", "ii_104"],
  "reason": "humanitarian",
  "note": "حالة إنسانية بموافقة المدير",
  "due_date": "2026-11-30"
}
```
* `deferral_id` و`due_date` و`note` اختيارية. `reason`: `emergency` | `humanitarian` | `other` (مع `other` تكون `note` إلزامية). `due_date` اليوم أو بعده.
* البنود من سلة المريض في الفرع الحالي وغير مدفوعة. بند مدفوع أو مؤجل أو ملغى: `409 ITEM_NOT_PAYABLE` مع `invoice_item_ids`.
* **Response (201):** كائن الآجل:
```json
{
  "deferral_id": "df_19", "patient_id": "pat_01", "patient_name": "فاطمة حسن", "phone_number": "07701234567",
  "branch_id": "br_01", "branch_name": "فرع الكرادة", "reason": "humanitarian", "note": "حالة إنسانية بموافقة المدير",
  "amount": 65000, "paid": 0, "remaining": 65000, "due_date": "2026-11-30", "is_overdue": false, "status": "active",
  "granted_by_id": "usr_05", "granted_by": "د. سعد الحيدري", "created_at": "...", "settled_at": null, "write_off_reason": null,
  "items": [ { "invoice_item_id": "ii_102", "service_name": "CBC", "department": "lab", "price": 15000, "status": "deferred" } ]
}
```

### `GET /deferrals`
* **الصلاحية:** `reports.finance` (المحاسب، مدير الفرع، المدير العام). المدير العام يرى كل الفروع، وغيره فروعه.
* **Query:** `?status=active|settled|written_off&patient_id=&branch_id=&overdue=true&page=&page_size=`
* **الوصف:** كشف الذمم لدى المحاسب. `overdue=true`: الفعالة التي مضى تاريخ سدادها.
* **Response (200):** `{ "items": [ <deferral بدون items> ], "page", "page_size", "total", "total_outstanding": 65000, "overdue_count": 3 }`
* `total_outstanding`: مجموع المتبقي على الآجلات الفعالة المطابقة للفلتر (كل الصفحات).

### `GET /deferrals/{deferral_id}`
* **الصلاحية:** `deferrals.grant` أو `reports.finance`. **Response (200):** كائن الآجل مع `items`. غير موجود: `404 DEFERRAL_NOT_FOUND`.

### التسديد
* يتم بـ `POST /payments` على نفس البنود (تظهر في `billable-items` بحالة `deferred`)، ويمكن تسديدها على دفعات (بنداً بنداً).
* عند تسديد كل البنود تتحول الحالة **تلقائياً** إلى `settled` مع `settled_at`.

### `POST /deferrals/{deferral_id}/write-off`
* **الصلاحية:** `admin` فقط. **Request:** `{ "reason": "إعفاء نهائي" }` (إلزامي).
* **الوصف:** إعفاء نهائي من المتبقي. الحالة `written_off`، والبنود غير المسددة **لا تظهر في السلة ولا تُحصّل** بعده (`409 ITEM_NOT_PAYABLE`). يُسجل في التدقيق `DEFERRAL_WRITTEN_OFF` مع المبلغ المعفى.
* **Response (200):** كائن الآجل. آجل مسدد أو معفى: `409 DEFERRAL_NOT_ACTIVE`.

---

## 15. الصيدلية (Pharmacy - Phase 1)

### المبدأ
* Phase 1: صرف الوصفة إلكترونياً **مرة واحدة فقط** مع توثيق ما صُرف وما لم يُصرف وسببه. لا يوجد مخزون أو أسعار.
* الوصفة صالحة في **أي فرع** حتى `expires_at` (`prescription.valid_days`، افتراضياً 30 يوماً).
* Phase 2 (لاحقاً): المخزون والأسعار والفوترة.

### `GET /pharmacy/prescriptions/{prescription_code}`
* **الصلاحية:** `pharmacy.dispense`. الصيدلي يمسح كود الوصفة (`RX-7KQ2M9`) المطبوع أو من تطبيق المريض.
* **Response (200) `<prescription>`:**
```json
{
  "prescription_id": "rx_502", "prescription_code": "RX-7KQ2M9",
  "patient_name": "فاطمة حسن", "file_number": "R1-004512", "gender": "female", "age": 35,
  "doctor_name": "د. سعد الحيدري", "clinic_name": "عيادة الباطنية", "branch_name": "فرع الكرادة",
  "diagnosis": "Acute Bronchitis",
  "issued_at": "2026-11-02T17:08:00Z", "expires_at": "2026-12-02T17:08:00Z",
  "status": "not_dispensed", "dispensed_at": null, "dispensed_by": null,
  "items": [
    { "line_no": 1, "drug_name": "Augmentin 1g", "dose": "1 حبة", "frequency": "مرتين يومياً", "duration_days": 7, "instructions": "بعد الأكل",
      "dispensed": null, "substitute_drug_name": null, "not_dispensed_reason": null }
  ]
}
```
* `status`: `not_dispensed` | `dispensed` | `expired`. كود غير موجود: `404 PRESCRIPTION_NOT_FOUND`.

### `POST /pharmacy/prescriptions/{prescription_id}/dispense`
* **الصلاحية:** `pharmacy.dispense` (الصيدلي من التوكن). **Headers:** `Idempotency-Key`.
* **Request:**
```json
{
  "lines": [
    { "line_no": 1, "dispensed": true, "substitute_drug_name": null },
    { "line_no": 2, "dispensed": false, "not_dispensed_reason": "المريض يملكه" }
  ]
}
```
* يجب إرسال **كل** الأسطر. `not_dispensed_reason` إلزامي للسطر غير المصروف. `substitute_drug_name` عند صرف بديل.
* **Response (200):** `<prescription>` بحالة `dispensed`.
* أخطاء: `409 PRESCRIPTION_ALREADY_DISPENSED`، `409 PRESCRIPTION_EXPIRED`، `400` (سطر ناقص أو سبب مفقود).

### `GET /pharmacy/dispensed`
* **الصلاحية:** `pharmacy.dispense`. **Query:** `?date=&page=` (الافتراضي اليوم، الفرع الحالي).
* **Response (200):** `{ "items": [ <prescription> ], "page", "page_size", "total" }` (سجل ما صرفه الصيدلي).

### `GET /me/patients/{patient_id}/prescriptions`
* **الصلاحية:** `patient`. **Response (200):** `{ "items": [ <prescription بدون file_number> ] }` الأحدث أولاً، ليعرض التطبيق كود الوصفة كـ QR.

---

## 16. وكيل العتاد المحلي (Local Hardware Agent)

### المبدأ
* **برنامج الوكيل نفسه مشروع منفصل** (يُثبت على حاسوب الاستقبال). الباك اند يوفر له: المفتاح العام لتوقيع الدرج (يعمل الآن)، وكتل الإيصالات (القسم 17)، واستقبال أحداثه عبر `POST /sync/batch`. الـ endpoints أدناه على `localhost` هي عقد الوكيل مع المتصفح.
* برنامج خفيف (Windows Service مبني بـ .NET) على حاسوب الاستقبال، يعمل على `https://localhost:9443`.
* يتحدث معه **المتصفح** (وليس السيرفر)، فيعمل حتى بدون إنترنت.
* يقبل الطلبات فقط من أصل الـ PWA المسجل (CORS) ومع `X-Agent-Key` يُسلم عند تثبيت الجهاز.
* **الدرج لا ينفتح إلا مع طباعة إيصال**، ويتطلب `drawer_token` موقعاً:
  * **أونلاين:** موقّع من السيرفر (JWT بتوقيع ES256، عمره 60 ثانية، `aud = "alrahma-agent"`، يحمل `drawer: "open"` و`receipt_number` و`shift_id` و`device_id` إن وُجد)، والوكيل يتحقق منه بالمفتاح العام من `GET /api/v1/agent/drawer-public-key` → `{ "algorithm": "ES256", "public_key_pem": "-----BEGIN PUBLIC KEY-----..." }`. يُضبط المفتاح الخاص على السيرفر بـ `Drawer__PrivateKeyPem`.
  * **أوفلاين:** الوكيل يقبل فتح الدرج فقط مع إيصال رقمه من **الكتلة المحجوزة لهذا الجهاز** (انظر 17)، ويسجل كل فتحة في سجل محلي يُرفع عند عودة الإنترنت.
* أي فتح يدوي للدرج (بالمفتاح المعدني) يُكتشف من حساس الدرج ويُسجل كحدث `drawer.opened_without_receipt`.

### `GET https://localhost:9443/status`
* **Response (200):**
```json
{
  "agent_version": "1.2.0",
  "device_id": "dev_rec_pc_03",
  "printer": { "connected": true, "model": "Epson TM-T20III", "paper": "ok" },
  "drawer": { "connected": true, "state": "closed" },
  "pending_events": 0
}
```
* `paper`: `ok` | `low` | `out`.

### `POST https://localhost:9443/print/receipt`
* **Request:**
```json
{
  "print_payload": { "...": "نفس رد GET /receipts/{id}/print-payload" },
  "drawer_token": "eyJkcmF3ZXIiOiJvcGVuIi...",
  "open_drawer": true
}
```
* **Response (200):** `{ "printed": true, "drawer_opened": true }`
* أخطاء: `409 PRINTER_OFFLINE`، `409 PAPER_OUT`، `403 INVALID_DRAWER_TOKEN`، `403 RECEIPT_NUMBER_NOT_IN_BLOCK`.
* إذا فشلت الطباعة **لا ينفتح الدرج**.

### `POST https://localhost:9443/print/ticket`
* **الوصف:** طباعة تذكرة الطابور (رقم الدور) بدون فتح الدرج.
* **Request:** `{ "ticket_number": "A-104", "doctor_name": "د. سعد الحيدري", "estimated_time": "17:12" }`

### `GET https://localhost:9443/events?since={event_id}`
* **الوصف:** سجل أحداث الدرج والطباعة المحلي، ترفعه الواجهة للسيرفر عبر `POST /sync/batch` (نوع `agent_event`).

---

## 17. العمل أوفلاين والمزامنة (Offline Sync)

### المبدأ
* كل عملية تتم أوفلاين تُحفظ في IndexedDB في **صندوق صادر (Outbox)** مع معرف عملية `op_id` (UUID) ووقت حدوثها.
* المعرفات (`patient_id`، `ticket_id`، `payment_id`...) مولدة محلياً كـ UUID، فلا يحتاج السيرفر لتحويلها.
* الإرسال بالترتيب الزمني، وكل عملية idempotent عبر `op_id`؛ إعادة الإرسال آمنة.
* العمليات المسموحة أوفلاين: تسجيل مريض، تثبيت حضور، تحصيل نقدي، فتح/إغلاق وردية، أزرار الطابور. **غير مسموح أوفلاين:** الاسترجاع، الخصومات، فك الحظر بدون عربون، تعديل الأسعار.

### `POST /devices/{device_id}/receipt-blocks`
* **الصلاحية:** `payments.collect` (الاستقبال، يُستدعى تلقائياً عند بداية الوردية). `{device_id}` = `device_code` أو UUID.
* `size` من 10 إلى 2000 (الافتراضي `receipt.block_size` = 200). البادئة ثابتة للجهاز، والكتلة الجديدة تكمل بعد آخر كتلة.
* `signature`: توقيع ES256 (DER بصيغة base64) بمفتاح الدرج على النص `{block_id}|{device_id}|{prefix}|{from}|{to}`، يتحقق منه الوكيل بنفس المفتاح العام.
* **الوصف:** حجز مسبق لكتلة أرقام إيصالات للجهاز، لتُستخدم أوفلاين دون تضارب بين الأجهزة.
* **Request:** `{ "size": 200 }`
* **Response (201):**
```json
{ "block_id": "blk_31", "prefix": "B1-D03-", "from": 1201, "to": 1400, "signature": "MEUCIQ..." }
```
* الجهاز مسجل في `devices` من نوع `reception_pc`، والموظف في نفس فرعه. للجهاز كتلة فعالة واحدة: الطلب الثاني يعيدها نفسها (`200`).
* الواجهة تمرر الكتلة للوكيل المحلي (ليعرف الأرقام المسموح بها).

### `POST /devices/{device_id}/receipt-blocks/{block_id}/return`
* **الوصف:** إعادة الأرقام غير المستخدمة عند إغلاق الوردية. **Request:** `{ "last_used": 1260 }` (`null` إن لم يُستخدم شيء).
* **Response (200):** `{ "block_id": "blk_31", "returned_from": 1261, "returned_to": 1400 }`. السيرفر لا يعيد رقماً وصله إيصال به، فإن كان `last_used` أقل من آخر إيصال مزامن يُعتمد الأكبر. لا شيء متبقٍ: `returned_from` و`returned_to` = `null`. الإعادة مرة ثانية تعيد نفس النتيجة.

### `POST /sync/batch`
* **الصلاحية:** أي موظف، وكل عملية تُفحص بصلاحية الـ endpoint المقابل. `device_id` = `device_code` أو معرف الجهاز (UUID) في فرع الموظف، وإلا `404 DEVICE_NOT_FOUND`.
* **Headers:** `Idempotency-Key` اختياري (كل عملية idempotent بـ `op_id`، فإعادة الدفعة كاملة آمنة).
* **Request:**
```json
{
  "device_id": "dev_rec_pc_03",
  "operations": [
    {
      "op_id": "op_a1",
      "type": "patient.create",
      "occurred_at": "2026-11-02T08:30:00Z",
      "payload": { "patient_id": "pat_01", "full_name": "فاطمة حسن", "phone_number": "07801234567", "gender": "female", "approx_age": 35 }
    },
    {
      "op_id": "op_a2",
      "type": "queue.check_in",
      "occurred_at": "2026-11-02T08:31:00Z",
      "payload": { "ticket_id": "tk_401", "patient_id": "pat_01", "doctor_id": "doc_05", "visit_kind": "auto" }
    },
    {
      "op_id": "op_a3",
      "type": "payment.create",
      "occurred_at": "2026-11-02T08:32:00Z",
      "payload": { "payment_id": "pay_801", "patient_id": "pat_01", "ticket_id": "tk_401", "tenders": [ { "method": "cash", "amount": 25000 } ], "offline_receipt_number": "B1-D03-1201" }
    }
  ]
}
```
* `type` المدعومة: `patient.create`، `patient.update`، `queue.check_in`، `queue.call`، `queue.start`، `queue.complete`، `queue.no_show`، `queue.emergency`، `queue.late_arrival`، `payment.create`، `shift.open`، `shift.close`، `agent_event`.
* `payload` لكل نوع = نفس جسم الـ endpoint الأونلاين المقابل (مثلاً `patient.create` = جسم `POST /patients`)، مع المعرفات المولدة محلياً. `payment.create` يقبل `ticket_id` بدل `invoice_item_ids` (يُحصّل كشفية التذكرة) و`offline_receipt_number` إلزامي من كتلة الجهاز.
* `agent_event`: `{ "local_event_id": 812, "type": "drawer.opened_without_receipt", "receipt_number": null, "occurred_at": "..." }`. الأنواع: `receipt.printed`، `drawer.opened`، `drawer.opened_without_receipt`، `printer.error`، `paper.out`. الفتح بدون إيصال يُشعر المحاسب.
* الحد: 500 عملية في الدفعة.
* في `payment.create` الأوفلاين يكون السعر المسجل هو آخر سعر مخزن محلياً، والسيرفر يتحقق منه؛ أي فرق يُسجل كتنبيه للمحاسب ولا يرفض العملية (لأن المال قُبض فعلاً).
* **Response (200):**
```json
{
  "results": [
    { "op_id": "op_a1", "status": "applied", "server_refs": { "file_number": "R1-004513" }, "warnings": [ { "code": "POSSIBLE_DUPLICATE_PATIENT", "patient_id": "pat_77" } ] },
    { "op_id": "op_a2", "status": "applied", "server_refs": { "ticket_number": "A-131" } },
    { "op_id": "op_a3", "status": "applied", "server_refs": { "receipt_id": "rcp_1201" } }
  ],
  "server_time": "2026-11-02T09:05:00Z"
}
```
* `status` لكل عملية: `applied` | `duplicate` (أُرسلت سابقاً، ومعها `server_refs` الأصلية) | `conflict` (رمز `409`، مثلاً تذكرة لمريض أُلغي حجزه، مع `detail` و`error`) | `rejected` (خطأ تحقق، مع `error` = `{ code, title, detail, errors }`).
* `server_refs` حسب النوع: `patient_id` و`file_number`، `ticket_id` و`ticket_number` و`status`، `payment_id` و`receipt_id` و`receipt_number`، `shift_id`، `event_id`. وتحذير `PRICE_MISMATCH` عند اختلاف السعر في `payment.create`.
* العمليات تُنفذ بترتيب `occurred_at`. `occurred_at` إلزامي ولا يكون في المستقبل.
* رقم إيصال خارج كتلة الجهاز: `rejected` برمز `RECEIPT_NUMBER_NOT_IN_BLOCK`، ورقم مستخدم: `conflict` برمز `RECEIPT_NUMBER_USED`.
* العملية المرفوضة لا تمنع باقي العمليات، والواجهة تعرض قائمة "عمليات تحتاج مراجعة" للموظف.

### `GET /sync/snapshot`
* **الوصف:** بيانات اليوم التي تخزنها الواجهة محلياً لتعمل أوفلاين: الخدمات والأسعار، الأطباء وجداولهم، طابور اليوم، مرضى اليوم، وكتلة الإيصالات.
* **Query:** `?since=2026-11-02T08:00:00Z` (تحديثات تزايدية للمرضى فقط) `&device_id=` (لإرجاع كتلة الإيصالات الفعالة لهذا الجهاز).
* **Response (200):** `{ "services": [ <كائن الخدمة> ], "doctors": [ <كائن الطبيب> ], "sessions": [ <كائن الوجبة + doctor_id> ], "tickets": [ <عنصر queue/live> ], "queues": [ <رد GET /queue/live لكل طبيب> ], "patients": [ <كائن المريض> ], "receipt_block": <الكتلة الفعالة أو null>, "server_time": "..." }` بنفس أشكال الـ endpoints الأونلاين. `patients`: مرضى حجوزات وطابور اليوم في الفرع.
* الواجهة تخزن `server_time` وترسله كـ `since` في الطلب التالي.

---

## 18. الإشعارات (Notifications)

### `GET /me/notifications`
* **الصلاحية:** أي موظف أو مريض (إشعارات حسابه). **Query:** `?unread=true&page=&page_size=`
* **Response (200):**
```json
{
  "items": [
    { "notification_id": "nt_15", "type": "lab.critical_value", "title": "قيمة حرجة", "message": "HGB = 6.8 للمريضة فاطمة حسن", "link": { "type": "lab_order", "id": "oi_103" }, "is_read": false, "created_at": "2026-11-02T17:40:00Z" }
  ],
  "unread_count": 3,
  "page": 1, "page_size": 20, "total": 3
}
```
* `link.type`: `lab_order` | `radiology_order` | `consultation` | `booking` | `shift` | `refund` | `prescription` | `fast_forward_offer` | `null`.

| النوع | يصل إلى | متى |
| --- | --- | --- |
| `lab.critical_value` | الطبيب الطالب | اعتماد نتيجة فيها قيمة حرجة |
| `lab.result_ready` / `radiology.report_ready` | الطبيب الطالب والمريض | اعتماد النتيجة أو التقرير |
| `queue.new_patient` | الطبيب | دفع كشفية مريض في طابوره |
| `shift.closed_with_variance` | المحاسبون ومدير الفرع | إغلاق وردية بعجز أو زيادة |
| `refund.approval_needed` | المحاسبون ومدير الفرع | طلب استرجاع فوق حد الاستقبال |
| `booking.reminder` | المريض | قبل الموعد بساعتين |
| `booking.eta_changed` | المريض | تغير الوقت التقديري 15 دقيقة أو أكثر |
| `booking.cancelled` | المريض | إلغاء الوجبة أو إغلاق العيادة أو الفرع |
| `fast_forward.offer` | المريض | عرض تقديم الموعد |
| `patient.banned` | المريض | حظر تلقائي بسبب الغياب |

* **Real-time:** `notification.created` على `user:{user_id}` للموظف و`patient_account:{id}` للمريض، بنفس شكل العنصر. عند إعادة الاتصال تعيد الواجهة قراءة `GET /me/notifications?unread=true`.
* **القنوات:** الجرس داخل النظام للموظفين، و Push لتطبيق المريض، و SMS للمريض بلا تطبيق (حجز هاتفي) لأنواع `booking.*` فقط.

### `POST /me/notifications/{notification_id}/read` و `POST /me/notifications/read-all`
* **Response:** `204`.

### `POST /me/devices` و `DELETE /me/devices/{push_token}`
* **الوصف:** تسجيل جهاز لاستقبال Push (تطبيق المريض والموظفين)، وإلغاؤه عند الخروج.
* **Request:** `{ "push_token": "fcm_...", "platform": "android", "app": "patient" }`. `platform`: `android` | `ios` | `web`. `app`: `patient` | `staff`.
* **Response (201):** `{ "device_registration_id": "dr_5" }`. نفس التوكن لحساب آخر ينتقل إليه. الحذف: `204`.

### الوضع التجريبي للرسائل (Sandbox)
* **مفعّل حالياً** (`Sms__Mode=sandbox` و`Push__Mode=sandbox`): لا تُرسل SMS ولا Push فعلياً، بل تُسجل.
* `GET /sandbox/messages?phone_number=&page=` (المدير العام فقط، وفي الوضع التجريبي فقط): `{ "items": [ { "channel": "sms", "to": "07801234567", "text": "...", "created_at": "..." } ] }` لاختبار ما كان سيُرسل.

### 18.x إضافات الجزء الثالث

| النوع | المستلم | متى | Push |
| --- | --- | --- | --- |
| `payment.refunded` | المريض | إرجاع مبلغ (نقد، POS، إلكتروني) | عادي، `link_type: refund` |
| `credit.added` | المريض | استرجاع كرصيد، أو رصيد من إلغاء حجز مدفوع | عادي، `link_type: refund` أو `booking` |
| `booking.reminder` | المريض | قبل الموعد بـ `booking.reminder_minutes` (60)، والنص: "يُرجى الحضور قبل موعدك بـ 20 دقيقة" من `booking.arrive_early_minutes` | عادي |
| `queue.turn_soon` | المريض | بقي أمامه `queue.turn_soon_ahead` (3) | عادي |
| `queue.called` | المريض | استدعاؤه | عالي الأولوية، `sound: queue_alarm`، `require_ack: true`، `link_type: queue_ticket` |
| `queue.call_repeat` | المريض | تكرار كل دقيقة حتى يؤكد | مثل `queue.called` |
| `backup.failed` | المدير العام | فشل نسخة، أو 26 ساعة بلا نسخة ناجحة، أو تأخر نسخ الملفات 24 ساعة | `link_type: backup_run` أو `backup_stale` أو `backup_files` |

* **بيانات Push (`data`):** `{ "type": "queue.called", "link_type": "queue_ticket", "link_id": "...", "sound": "queue_alarm", "priority": "high", "require_ack": true }`. الحقول `sound` و`priority` و`require_ack` موجودة فقط للأنواع التي تحتاجها.
* **SMS للمريض بلا تطبيق:** `booking.*`، و`queue.turn_soon`، و`queue.called`، و`payment.refunded`، و`credit.added`.
* **سلوك التطبيق في التنبيه المستمر:**
  * قناة إشعارات عالية الأولوية (Android: `IMPORTANCE_HIGH` باسم `queue_alarm` مع ملف الصوت، iOS: `interruption-level: time-sensitive`).
  * يعمل والتطبيق مغلق أو في الخلفية، والصوت يتكرر حتى يضغط المريض "أنا قادم" (`acknowledge-call`) أو تتغير حالة التذكرة إلى `in_room` أو `completed` أو `skipped`.
  * عند `queue.call_alert` والتطبيق مفتوح: شاشة كاملة بزر "أنا قادم".
* **الإعدادات الجديدة** (في `GET/PATCH /branches/{id}/settings` و `/settings`):

| المفتاح | الافتراضي | المدى |
| --- | --- | --- |
| `booking.reminder_minutes` | 60 | 10 إلى 1440 دقيقة |
| `booking.arrive_early_minutes` | 20 | 0 إلى 120 دقيقة |
| `queue.turn_soon_ahead` | 3 | 1 إلى 20 مريض |
| `queue.auto_call_next` | 0 | 0 أو 1 |
| `queue.call_alert_repeats` | 3 | 0 إلى 10 |
| `queue.call_next_by` | `both` | `doctor` \| `reception` \| `both` |

* إعدادات الاختيار (مثل `queue.call_next_by`) تعرض في القائمة: `value` رقم الخيار (1 إلى 3)، و`value_text` القيمة النصية، و`global_value_text`، و`options: [ { "value": "doctor", "label_ar": "الطبيب فقط" }, ... ]`. في PATCH ترسل النص (`"queue.call_next_by": "doctor"`) أو رقم الخيار. الإعدادات الرقمية لا تتغير.

---

## 19. التقارير والتدقيق (Reports & Audit)

### `GET /reports/branch-settlements` (تسويات الرصيد بين الفروع)
* **الصلاحية:** `reports.finance`. المدير العام يرى كل الفروع، وغيره الفروع المسندة إليه فقط (طلب فرع آخر: `403`).
* **Query:** `?from=2026-11-01&to=2026-11-30&branch_id=` كلها اختيارية. الافتراضي من بداية الشهر حتى اليوم، والحد الأقصى 366 يوماً (وإلا `400`).
* **الفكرة:** مريض دفع عربوناً أو بقي له رصيد في فرع الكرادة، ثم استخدمه في فرع المنصور. النقد في درج الكرادة والخدمة قُدمت في المنصور، فالكرادة **مدينة** للمنصور بالمبلغ. كل استخدام يُنسب لأقدم رصيد للمريض (الأقدم أولاً).
* **Response (200):**
```json
{
  "from": "2026-11-01", "to": "2026-11-30",
  "branches": [
    { "branch_id": "br_01", "branch_name": "فرع الكرادة", "credit_received": 250000, "credit_used": 90000,
      "used_from_other_branches": 0, "used_by_other_branches": 60000, "net_settlement": -60000, "outstanding_credit_held": 140000 },
    { "branch_id": "br_02", "branch_name": "فرع المنصور", "credit_received": 40000, "credit_used": 75000,
      "used_from_other_branches": 60000, "used_by_other_branches": 0, "net_settlement": 60000, "outstanding_credit_held": 25000 }
  ],
  "flows": [
    { "holder_branch_id": "br_01", "holder_branch_name": "فرع الكرادة", "serving_branch_id": "br_02", "serving_branch_name": "فرع المنصور", "amount": 60000, "entries": 4 }
  ],
  "total_outstanding_credit": 165000
}
```
* `credit_received`: أرصدة قُبضت في الفرع خلال الفترة (عربون، إلغاء حجز مدفوع، استرجاع كرصيد). `credit_used`: أرصدة استُخدمت للدفع فيه.
* `net_settlement`: **موجب** = للفرع مبلغ عند الفروع الأخرى، **سالب** = على الفرع تحويله للفروع الأخرى.
* `outstanding_credit_held`: أرصدة المرضى التي قبضها الفرع ولم تُستخدم بعد حتى نهاية الفترة (التزام على الفرع).
* `flows`: من يدين لمن، مرتبة بالأكبر مبلغاً. تُعرض كجدول "تحويلات مطلوبة" في شاشة المدير العام.

### `GET /reports/dashboard` (لوحة المدير العام)
* **الصلاحية:** `reports.finance`. المدير العام يرى كل الفروع، ومدير الفرع والمحاسب فروعهم فقط.
* **Query:** `?date=2026-11-02&branch_id=` كلاهما اختياري (الافتراضي اليوم وكل الفروع المتاحة).
* **Response (200):**
```json
{
  "date": "2026-11-02", "month_from": "2026-11-01",
  "branches": [
    {
      "branch_id": "br_01", "branch_name": "فرع الكرادة", "code": "B1", "is_active": true, "closed_today": false,
      "today":         { "gross": 2510000, "refunds": 30000, "revenue_net": 2480000, "cash_in": 2100000, "expenses": 150000, "net_after_expenses": 2330000, "payments_count": 96 },
      "month_to_date": { "gross": 4100000, "refunds": 30000, "revenue_net": 4070000, "cash_in": 3900000, "expenses": 900000, "net_after_expenses": 3170000, "payments_count": 180 },
      "activity": { "bookings": 120, "checked_in": 98, "completed": 85, "no_shows": 7 },
      "alerts": { "open_shifts": 3, "shifts_pending_review": 2, "shifts_with_variance": 1, "variance_total": -5000,
                  "pending_refunds": 1, "pending_refunds_amount": 60000, "deferrals_outstanding": 65000, "overdue_deferrals": 1 }
    }
  ],
  "totals": { "today": { ... }, "month_to_date": { ... }, "activity": { ... }, "alerts": { ... } }
}
```
* `revenue_net`: إيراد الخدمات (المحصّل على البنود − المسترجع). `cash_in`: النقد و POS الداخل فعلاً (يشمل العربون) − المسترجع نقداً. `net_after_expenses` = `revenue_net` − `expenses`.
* `alerts` تُعرض كشارات تنبيه: ورديات مفتوحة، ورديات بانتظار المراجعة وما فيها فرق، استرجاع بانتظار الموافقة، ديون آجلة ومتأخرة.
* الضغط على فرع يفتح `GET /reports/daily-revenue?branch_id=` و`GET /shifts` و`GET /deferrals` و`GET /expenses` لنفس الفرع.

### `GET /reports/daily-revenue`
* **الصلاحية:** `reports.finance`. نطاق الفروع كما في اللوحة.
* **Query:** `?branch_id=&date=2026-11-02` ليوم واحد، أو `?from=2026-11-01&to=2026-11-30` لفترة (366 يوماً كحد أقصى). بدونها: اليوم. بدون `branch_id`: كل الفروع المتاحة مجمعة، مع تفصيل لكل فرع في `by_branch`.
* **Response (200):**
```json
{
  "from": "2026-11-02", "to": "2026-11-02", "branch_id": null,
  "by_department": [
    { "department": "clinic", "gross": 1250000, "refunds": 0, "net": 1250000 },
    { "department": "lab", "gross": 840000, "refunds": 30000, "net": 810000 },
    { "department": "radiology", "gross": 420000, "refunds": 0, "net": 420000 },
    { "department": "pharmacy", "gross": 0, "refunds": 0, "net": 0 }
  ],
  "by_method": [
    { "method": "cash", "amount": 1580000, "refunded": 30000, "net": 1550000 },
    { "method": "pos", "amount": 520000, "refunded": 0, "net": 520000 },
    { "method": "online", "amount": 0, "refunded": 0, "net": 0 }
  ],
  "total_gross": 2510000, "total_refunds": 30000, "total_net": 2480000,
  "deposits_received": 20000, "credit_used": 10000, "deferred_new": 65000, "discounts": 10000,
  "expenses": 150000, "net_after_expenses": 2330000, "payments_count": 96,
  "by_branch": [
    { "branch_id": "br_01", "branch_name": "فرع الكرادة", "gross": 2510000, "refunds": 30000, "total_net": 2480000,
      "deposits_received": 20000, "cash_in": 2070000, "expenses": 150000, "net_after_expenses": 2330000, "payments_count": 96 }
  ]
}
```
* `by_department`: الإيراد حسب القسم بوقت التحصيل، والمسترجع بوقت اعتماده. يشمل ما دُفع من رصيد المريض.
* `by_method`: حركة الأموال الفعلية (تشمل العربون). `credit_used`: ما دُفع من أرصدة المرضى (ليس نقداً جديداً). `deferred_new`: آجل منح في الفترة (لم يُقبض). `discounts`: خصومات الفواتير المنشأة في الفترة.

### `GET /reports/doctor-earnings`
* **الصلاحية:** `reports.finance` لأي طبيب في فروعه، والطبيب يرى أرباحه هو فقط (بدون `doctor_id`، أو `403` لطبيب آخر).
* **Query:** `?doctor_id=&from=2026-11-01&to=2026-11-30&branch_id=`
* **Response (200) مع `doctor_id` أو للطبيب نفسه:**
```json
{
  "doctor_id": "doc_05", "doctor_name": "د. سعد الحيدري", "clinic_name": "عيادة الباطنية",
  "from": "2026-11-01", "to": "2026-11-30",
  "new_visits": { "count": 210, "gross": 5250000, "doctor_share": 3675000 },
  "follow_ups": { "count": 95, "gross": 1425000, "doctor_share": 855000 },
  "other_services": { "count": 0, "gross": 0, "doctor_share": 0 },
  "refund_adjustments": -7000,
  "total_doctor_share": 4523000,
  "total_complex_share": 2142000
}
```
* **بدون `doctor_id`** (للمحاسب والمدير): `{ "from", "to", "items": [ <نفس الكائن لكل طبيب> ], "total_doctor_share", "total_complex_share" }` مرتبة بالأعلى.
* المحسوب: البنود **المحصّلة** في الفترة بالنسبة المسجلة لحظة الفوترة (الآجل لا يُحسب حتى يُسدد). `refund_adjustments`: ما خُصم من حصة الطبيب بسبب استرجاع اعتُمد في الفترة.

### `GET /reports/no-shows`
* **الصلاحية:** `reports.finance`. **Query:** `?from=&to=&doctor_id=&branch_id=`
* **Response (200):**
```json
{
  "from": "2026-11-01", "to": "2026-11-30", "total_no_shows": 42, "distinct_patients": 39,
  "by_doctor": [ { "doctor_id": "doc_05", "doctor_name": "د. سعد الحيدري", "clinic_name": "عيادة الباطنية", "count": 12 } ],
  "patients_banned": 5, "patients_unbanned": 3, "unbanned_by_deposit": 2, "unbanned_by_waiver": 1, "currently_banned": 9
}
```
* الحظر على المريض في كل الفروع، فأرقام الحظر وفكه تشمل كل الفروع.

### `GET /reports/audit-logs`
* **الصلاحية:** `audit.read` (المدير العام والمحاسب). المدير العام يرى كل الفروع والعمليات العامة (بدون فرع، مثل الإعدادات العامة)، والمحاسب فروعه فقط.
* **Query:** `?branch_id=&user_id=&action=&entity_type=&entity_id=&from=&to=&page=&page_size=` (الافتراضي آخر 30 يوماً، 50 في الصفحة، الأحدث أولاً). `action` مثل `REFUND_CREATED` أو `DEFERRAL_GRANTED` أو `EXPENSE_VOIDED`.
* **Response (200):**
```json
{
  "items": [
    {
      "log_id": 89,
      "branch_id": "br_01",
      "branch_name": "فرع الكرادة",
      "user_id": "usr_14",
      "user_name": "علي حسن",
      "action": "REFUND_CREATED",
      "entity_type": "invoice_item",
      "entity_id": "ii_201",
      "before": { "status": "paid" },
      "after": { "status": "refunded" },
      "reason": "المريض ألغى التحليل قبل سحب العينة",
      "ip": "10.0.1.23",
      "device_id": "dev_rec_pc_03",
      "occurred_at": "2026-11-02T18:00:00Z",
      "synced_offline": false
    }
  ],
  "page": 1, "page_size": 50, "total": 1
}
```
* العمليات التي تُسجل إلزامياً: الدخول، تغيير الصلاحيات، تعديل الأسعار والنسب، الخصم، الاسترجاع، إلغاء الفاتورة، الاستثناء، فك الحظر، الطوارئ، إعادة طباعة الإيصال، فتح الدرج بدون إيصال، إغلاق الوردية، دمج المرضى.
* سجل التدقيق **للإضافة فقط** (Append-only)؛ لا يوجد API لتعديله أو حذفه.

---

## 20. مصاريف الفروع (Expenses)

### المبدأ
* كل مصروف (رواتب، إيجار، كهرباء ومولدة، صيانة، مستلزمات...) يُسجل على فرعه برقم تسلسلي (`B1-EXP-000123`)، ويظهر في التقارير ولوحة المدير العام لحساب **الصافي بعد المصاريف**.
* `paid_from`:
  * `shift_cash`: نقد من **درج الوردية المفتوحة** للموظف. يُطرح من المتوقع في الدرج عند الإغلاق الأعمى، ويُرجع توكن فتح الدرج.
  * `treasury`: من صندوق الفرع أو البنك أو الإدارة، لا يمس الأدراج.
* لا حذف: الإلغاء بسبب ويبقى في السجل وفي التدقيق.
* التصنيفات من `GET /lookups/expense_category` (يديرها المدير العام، القسم 3.2).
* **الصلاحية:** `expenses.manage` (المدير العام، مدير الفرع، المحاسب، ويمكن منحها لموظف استقبال عبر الصلاحيات الإضافية ليصرف من درجه).

### `POST /expenses`
* **Headers:** `Idempotency-Key`.
* **Request:**
```json
{ "expense_id": "exp_01", "category": "maintenance", "amount": 75000, "expense_date": "2026-11-02",
  "description": "تصليح جهاز التكييف", "payee": "ورشة النور", "paid_from": "treasury", "branch_id": null }
```
* `expense_id` و`expense_date` (الافتراضي اليوم، لا يكون في المستقبل) و`payee` و`branch_id` اختيارية. `branch_id` لفرع آخر: للمدير العام فقط ومع `treasury` فقط.
* `shift_cash` بدون وردية مفتوحة: `409 NO_OPEN_SHIFT`. تصنيف غير موجود: `400` مع `errors.category`.
* **Response (201):**
```json
{
  "expense_id": "exp_01", "expense_number": "B1-EXP-000123", "branch_id": "br_01", "branch_name": "فرع الكرادة",
  "category": "maintenance", "category_name": "صيانة", "amount": 75000, "expense_date": "2026-11-02",
  "description": "تصليح جهاز التكييف", "payee": "ورشة النور", "paid_from": "treasury", "shift_id": null, "status": "recorded",
  "created_by_id": "usr_03", "created_by": "علي حسن", "created_at": "...", "void_reason": null, "voided_at": null,
  "drawer_token": null, "open_drawer": false
}
```
* مع `shift_cash`: `shift_id` الوردية، و`open_drawer: true` و`drawer_token` (يُرسل للوكيل المحلي كما في التحصيل).

### `GET /expenses`
* **Query:** `?branch_id=&category=&paid_from=&from=&to=&status=recorded|void&page=&page_size=` (الافتراضي من بداية الشهر حتى اليوم، والمسجلة فقط). المدير العام كل الفروع، وغيره فروعه.
* **Response (200):** `{ "items": [ <expense> ], "page", "page_size", "total", "total_amount": 1050000, "by_category": [ { "category": "rent", "category_name": "إيجار", "amount": 1000000, "count": 1 } ] }`

### `GET /expenses/{expense_id}`
* **Response (200):** `<expense>`. غير موجود أو في فرع غير متاح: `404 EXPENSE_NOT_FOUND`.

### `POST /expenses/{expense_id}/void`
* **Request:** `{ "reason": "سُجل مرتين" }` (إلزامي). **Response (200):** `<expense>` بحالة `void`.
* مصروف من درج وردية **أُغلقت**: `409 SHIFT_CLOSED` (حُسب في مطابقتها، ويُعالج بمصروف عكسي أو عند المراجعة).

---

## 21. النسخ الاحتياطي (Backups) - المدير العام فقط

* مجاني (pgBackRest على سيرفر قاعدة البيانات). لا تنزيل للنسخ من الواجهة، والاسترجاع من السيرفر فقط (`docs/backup_restore.md`).
* الـ API لا ينفذ أوامر على السيرفر: "نسخة الآن" يسجل طلباً ينفذه سكربت السيرفر خلال دقيقة.

### 21.1 `GET /api/v1/admin/backups/status`
```json
{
  "enabled": true, "healthy": true, "repo2_enabled": false,
  "last_success": { "run_id": "...", "type": "incr", "trigger": "schedule", "status": "succeeded", "requested_by": null,
                    "started_at": "...", "finished_at": "...", "duration_seconds": 42.5, "backup_label": "20261102-030000F_20261103-030000I",
                    "size_bytes": 33786797, "stored_bytes": 4010088, "repos": "1", "error": null, "created_at": "..." },
  "last_failure": null, "last_verify": { ...نفس الشكل... }, "active": null,
  "hours_since_last_success": 5.2, "max_hours_without_success": 26,
  "files": { "mode": "off", "pending_files": 0, "oldest_pending_at": null, "lag_hours": null, "healthy": true },
  "schedule": { "timezone": "Asia/Baghdad", "full": "كل جمعة الساعة 03:00", "incremental": "باقي الأيام الساعة 03:00",
                "wal": "كل 5 دقائق كحد أقصى", "verify": "اختبار استرجاع تلقائي كل جمعة الساعة 05:00",
                "retention": "4 نسخ أسبوعية + 12 شهرية، وسجل WAL لمدة 14 يوماً" },
  "notes": [ "النسخ الاحتياطي مجاني بالكامل ...", "..." ]
}
```
* `active`: طلب أو تشغيل جارٍ (لإخفاء زر "نسخة الآن"). `enabled: false` = حاوية النسخ غير مفعلة بعد.

### 21.2 `GET /api/v1/admin/backups?type=&status=&page=&page_size=`
* `type`: `full` | `diff` | `incr` | `verify` | `files`. `status`: `requested` | `running` | `succeeded` | `failed`.
* **Response (200):** `{ "items": [ BackupRun ], "page": 1, "page_size": 20, "total": 30 }`.

### 21.3 `POST /api/v1/admin/backups/run`
* **Request (اختياري):** `{ "type": "full" }` (الافتراضي `incr`؛ و`verify` لاختبار استرجاع، و`files` لنسخ الملفات إذا كان مفعلاً).
* **Response (202):** `BackupRun` بحالة `requested` و`trigger: "manual"`.
* **الأخطاء:** `409 BACKUP_IN_PROGRESS` (ومعه `run_id` و`current_status`)، `409 BACKUP_FILES_DISABLED`، `400` نوع غير معروف، `403` لغير المدير العام.

---

## الملحق (أ): رموز الأخطاء

| HTTP | code | المعنى |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | خطأ في الحقول (التفاصيل في `errors`) |
| 400 | `IDEMPOTENCY_KEY_REQUIRED` | الهيدر `Idempotency-Key` غير مرسل لعملية تتطلبه |
| 401 | `UNAUTHORIZED` | لا يوجد توكن أو التوكن غير صالح |
| 401 | `INVALID_CREDENTIALS` | اسم المستخدم أو كلمة المرور خطأ |
| 401 | `TOKEN_EXPIRED` | انتهى التوكن، استخدم refresh |
| 402 | `INVOICE_UNPAID` | الخدمة أو النتيجة غير متاحة قبل الدفع |
| 403 | `FORBIDDEN` | الدور لا يملك الصلاحية |
| 403 | `USER_DISABLED` | الحساب معطل |
| 403 | `PASSWORD_CHANGE_REQUIRED` | يجب تغيير كلمة المرور المؤقتة أولاً |
| 403 | `BRANCH_NOT_ASSIGNED` | الموظف غير معين على هذا الفرع |
| 403 | `PATIENT_BANNED` | المريض محظور من الحجز |
| 403 | `INVALID_DRAWER_TOKEN` | (الوكيل المحلي) توكن الدرج غير صالح |
| 404 | `NOT_FOUND` | المورد غير موجود |
| 409 | `SESSION_FULL` | الوجبة ممتلئة |
| 409 | `DUPLICATE_BOOKING` | المريض محجوز مسبقاً في نفس الوجبة |
| 404 | `PATIENT_NOT_FOUND` | المريض غير موجود |
| 409 | `PATIENT_EXISTS` | يوجد مريض بنفس المعرف |
| 409 | `PATIENT_MERGED` | الملف مدموج في ملف آخر |
| 409 | `MERGE_CONFLICT` | لا يمكن الدمج (حجزان في نفس الوجبة) |
| 409 | `PATIENT_NOT_BANNED` | المريض غير محظور |
| 404 | `SESSION_NOT_FOUND` | الوجبة غير موجودة |
| 409 | `SESSION_CANCELLED` | الوجبة ملغاة |
| 409 | `SESSION_CLOSED` | انتهى وقت الوجبة |
| 409 | `NO_ACTIVE_SESSION` | لا توجد وجبة متاحة للطبيب اليوم |
| 404 | `BOOKING_NOT_FOUND` | الحجز غير موجود |
| 409 | `BOOKING_EXISTS` | يوجد حجز بنفس المعرف |
| 409 | `BOOKING_NOT_ACTIVE` | الحجز ملغى أو منتهٍ |
| 409 | `BOOKING_NOT_CANCELLABLE` | لا يُلغى الحجز بعد تثبيت الحضور |
| 422 | `BOOKING_NOT_TODAY` | الحجز ليس لهذا اليوم |
| 409 | `PATIENT_HAS_BOOKING` | للمريض حجز في الوجبة، ثبّته بالحجز |
| 409 | `ALREADY_IN_QUEUE` | المريض في الطابور مسبقاً |
| 404 | `TICKET_NOT_FOUND` | التذكرة غير موجودة |
| 409 | `TICKET_EXISTS` | يوجد تذكرة بنفس المعرف |
| 409 | `INVALID_TICKET_STATE` | العملية لا تناسب حالة التذكرة |
| 409 | `DOCTOR_BUSY` | يوجد مريض داخل الغرفة |
| 404 | `QUEUE_EMPTY` | لا يوجد مريض جاهز في الانتظار |
| 422 | `SERVICE_NOT_CONFIGURED` | لم تُحدد كشفية للعيادة |
| 409 | `DUPLICATE_BRANCH_CODE` | رمز الفرع مستخدم |
| 409 | `BRANCH_IN_USE` | لا يمكن إيقاف الفرع الحالي |
| 409 | `DUPLICATE_CLINIC` | عيادة بنفس الاسم في الفرع |
| 409 | `CLINIC_IN_USE` | تغيير نوع عيادة عليها أطباء أو خدمات |
| 409 | `CLINIC_HAS_DOCTORS` | إيقاف عيادة فيها أطباء فعالون |
| 409 | `CLINIC_CLOSED` | العيادة أو القسم مغلق مؤقتاً (مع `closure_reason_ar` و`closed_until`) |
| 409 | `CLINIC_HAS_BOOKINGS` | حجوزات في فترة الإغلاق، أعد الطلب مع `cancel_bookings` |
| 409 | `CLINIC_HAS_PATIENTS` | مرضى حاضرون الآن في العيادة |
| 409 | `CLOSURE_OVERLAP` | إغلاق آخر في نفس الفترة |
| 409 | `BRANCH_CLOSED` | الفرع كله مغلق مؤقتاً (مع `closure_reason_ar` و`closed_until`) |
| 409 | `BRANCH_HAS_BOOKINGS` | حجوزات قادمة في الفرع (إغلاق أو إيقاف)، أعد الطلب مع `cancel_bookings` |
| 409 | `BRANCH_HAS_PATIENTS` | مرضى حاضرون الآن في الفرع |
| 409 | `BRANCH_INACTIVE` | الفرع موقوف نهائياً |
| 404 | `BRANCH_NOT_FOUND` | الفرع غير موجود أو موقوف (تطبيق المريض) |
| 409 | `DOCTOR_HAS_BOOKINGS` | إيقاف طبيب عليه حجوزات قادمة، أعد الطلب مع `cancel_bookings=true` |
| 409 | `DOCTOR_HAS_PATIENTS` | إيقاف طبيب في طابوره مرضى حاضرون |
| 409 | `CLOSURE_ENDED` | الإغلاق منتهٍ مسبقاً |
| 409 | `DUPLICATE_LOOKUP` | القيمة موجودة في القائمة |
| 409 | `LOOKUP_IS_SYSTEM` | قيمة نظام لا تُوقف |
| 401 | `INVALID_DISPLAY_KEY` | مفتاح شاشة الانتظار غير صحيح |
| 422 | `NOT_A_DISPLAY` | الجهاز ليس شاشة انتظار |
| 409 | `NO_OPEN_SHIFT` | لا توجد وردية مفتوحة للتحصيل (و `404` من `GET /shifts/current`) |
| 409 | `SHIFT_EXISTS` | يوجد وردية بنفس المعرف لموظف آخر |
| 409 | `SHIFT_NOT_CLOSED` | لا تُراجع وردية مفتوحة |
| 409 | `SHIFT_ALREADY_REVIEWED` | رُوجعت الوردية مسبقاً |
| 409 | `PAYMENT_EXISTS` | يوجد دفعة بنفس المعرف |
| 409 | `INVOICE_EXISTS` | يوجد فاتورة بنفس المعرف |
| 404 | `INVOICE_NOT_FOUND` | الفاتورة غير موجودة |
| 404 | `INVOICE_ITEM_NOT_FOUND` | البند غير موجود في سلة المريض |
| 409 | `ITEM_NOT_PAYABLE` | البند مدفوع أو ملغى مسبقاً |
| 422 | `INSUFFICIENT_CREDIT` | الرصيد المستخدم أكبر من رصيد المريض |
| 422 | `OFFLINE_NOT_AVAILABLE` | التحصيل أوفلاين يُفعّل مع المزامنة |
| 409 | `ITEM_NOT_REFUNDABLE` | البند غير مدفوع |
| 422 | `REFUND_EXCEEDS_PAID` | المبلغ أكبر من المتبقي القابل للاسترجاع |
| 422 | `REFUND_METHOD_NOT_AVAILABLE` | عكس الدفع الإلكتروني لاحقاً |
| 409 | `REFUND_EXISTS` | يوجد استرجاع بنفس المعرف |
| 404 | `REFUND_NOT_FOUND` | طلب الاسترجاع غير موجود |
| 409 | `REFUND_NOT_PENDING` | تم البت في الطلب مسبقاً |
| 404 | `RECEIPT_NOT_FOUND` | الإيصال غير موجود (أو مزور عند التحقق) |
| 403 | `REPRINT_LIMIT` | إعادة الطباعة الثانية للمحاسب |
| 409 | `SHIFT_ALREADY_OPEN` | توجد وردية مفتوحة مسبقاً |
| 409 | `SHIFT_OPEN` | لا يمكن تبديل الفرع مع وردية مفتوحة |
| 409 | `PENDING_OFFLINE_SYNC` | توجد عمليات أوفلاين غير مزامنة |
| 409 | `INVOICE_HAS_PAYMENTS` | لا يمكن إلغاء فاتورة عليها دفعات |
| 409 | `ITEM_ALREADY_PERFORMED` | البند نُفذ ولا يُسترجع إلا بصلاحية مدير |
| 409 | `PRESCRIPTION_ALREADY_DISPENSED` | الوصفة صُرفت سابقاً |
| 401 | `INVALID_OTP` | رمز التحقق خطأ (مع `attempts_left`) |
| 401 | `OTP_EXPIRED` | انتهت صلاحية الرمز، اطلب رمزاً جديداً |
| 429 | `OTP_TOO_MANY_ATTEMPTS` | محاولات خاطئة كثيرة، اطلب رمزاً جديداً |
| 409 | `CONSULTATION_EXISTS` | للتذكرة معاينة (مع `consultation_id`) |
| 404 | `CONSULTATION_NOT_FOUND` | المعاينة غير موجودة |
| 409 | `EDIT_WINDOW_CLOSED` | انتهت مدة تعديل المعاينة، أضف ملحقاً |
| 404 | `ORDER_NOT_FOUND` | الطلب الطبي غير موجود |
| 409 | `INVALID_ORDER_STATE` | العملية لا تناسب حالة الطلب |
| 409 | `DUPLICATE_BARCODE` | باركود العينة مستخدم |
| 404 | `RESULT_NOT_READY` | النتيجة لم تُعتمد بعد |
| 404 | `PRESCRIPTION_NOT_FOUND` | الوصفة غير موجودة |
| 409 | `PRESCRIPTION_EXPIRED` | انتهت صلاحية الوصفة |
| 404 | `ONLINE_PAYMENT_NOT_FOUND` | عملية الدفع غير موجودة |
| 409 | `ALREADY_PAID` | الحجز أو الفاتورة مدفوعة |
| 409 | `PAYMENT_PENDING` | توجد عملية دفع معلقة لنفس الغرض |
| 404 | `RECEIPT_BLOCK_NOT_FOUND` | كتلة الإيصالات غير موجودة |
| 409 | `DEFERRAL_EXISTS` | يوجد استثناء بنفس المعرف |
| 404 | `DEFERRAL_NOT_FOUND` | الاستثناء غير موجود |
| 409 | `DEFERRAL_NOT_ACTIVE` | الاستثناء مسدد أو معفى مسبقاً |
| 409 | `EXPENSE_EXISTS` | يوجد مصروف بنفس المعرف |
| 404 | `EXPENSE_NOT_FOUND` | المصروف غير موجود |
| 409 | `SHIFT_CLOSED` | لا يُلغى مصروف من وردية مغلقة |
| 409 | `IDEMPOTENCY_KEY_REUSED` | نفس المفتاح مع طلب مختلف |
| 409 | `REQUEST_IN_PROGRESS` | نفس الطلب ما زال قيد التنفيذ |
| 409 | `USERNAME_TAKEN` | اسم المستخدم مستخدم مسبقاً |
| 409 | `DUPLICATE_SERVICE` | توجد كشفية فعالة من نفس النوع للعيادة |
| 409 | `DUPLICATE_EFFECTIVE_DATE` | توجد نسبة سارية بنفس تاريخ السريان |
| 409 | `SESSION_STARTED` | الوجبة بدأت وفيها مرضى في الطابور |
| 422 | `AMOUNT_MISMATCH` | المبلغ المدفوع لا يساوي المستحق |
| 422 | `EFFECTIVE_DATE_IN_PAST` | تاريخ سريان النسبة في الماضي |
| 422 | `DATE_IN_PAST` | التاريخ المطلوب مضى |
| 422 | `WEAK_PASSWORD` | كلمة المرور ضعيفة |
| 404 | `FILE_NOT_FOUND` | الملف غير موجود |
| 422 | `FILE_NOT_STORED` | لم يكتمل رفع الملف |
| 422 | `FILE_NOT_UPLOADED` | الملف لم يصل إلى التخزين بعد |
| 422 | `FILE_TOO_LARGE` | حجم الملف أكبر من المسموح |
| 422 | `INVALID_FILE_PURPOSE` | نوع الملف لا يناسب العملية |
| 423 | `ACCOUNT_LOCKED` | الحساب مقفل مؤقتاً |
| 409 | `TEMPLATE_IN_USE` | بارامتر في قالب التحليل عليه نتائج ولا يُحذف |
| 409 | `OFFER_ACTIVE` | يوجد عرض تقديم فعال لهذه الوجبة |
| 409 | `ONLINE_PAYMENT_EXISTS` | يوجد دفع إلكتروني بنفس المعرف |
| 409 | `RECEIPT_NUMBER_USED` | رقم الإيصال الأوفلاين مستخدم مسبقاً |
| 422 | `RECEIPT_NUMBER_NOT_IN_BLOCK` | رقم الإيصال الأوفلاين ليس من كتلة هذا الجهاز |
| 422 | `PROVIDER_NOT_AVAILABLE` | بوابة الدفع غير مربوطة بعد (المتاح حالياً `sandbox`) |
| 404 | `DEVICE_NOT_FOUND` | الجهاز غير مسجل في فرع الموظف |
| 429 | `RATE_LIMITED` | طلبات كثيرة (مثل OTP) |
| 403 | `CALL_NOT_ALLOWED_FOR_ROLE` | استدعاء المرضى في هذا الفرع من صلاحية دور آخر (`queue.call_next_by`) |
| 409 | `TICKET_NOT_CALLED` | "أنا قادم" قبل الاستدعاء أو بعد انتهائه |
| 409 | `BACKUP_IN_PROGRESS` | يوجد نسخ احتياطي جارٍ أو مطلوب |
| 409 | `BACKUP_FILES_DISABLED` | نسخ الملفات للموقع الثاني غير مفعّل |
| 500 | `INTERNAL_ERROR` | خطأ غير متوقع (أرسل `trace_id` للدعم) |

---

## الملحق (ب): سجل التغييرات عن v4

| الموضوع | v4 | v5 |
| --- | --- | --- |
| الاسم | مجمع الحوراء / alhawraa | مجمع الرحمة الطبي، والنطاق غير مكتوب في الكود |
| المعرفات | أرقام متسلسلة + `local_provisional_id` + mapping | UUID v7 تولدها الواجهة أو السيرفر + أرقام مقروءة للعرض |
| المبالغ | `25000.00` | أعداد صحيحة `25000` |
| كلمة المرور | `secure_password_hash` | كلمة المرور كما هي عبر HTTPS، والسيرفر يخزنها بـ Argon2id |
| الجلسات | login فقط | + refresh، logout، switch-branch، change-password، OTP للمريض |
| المستخدمون | لا يوجد | وحدة 2 كاملة |
| الهوية | `doctor_id`، `pharmacist_id`، `user_id` في الطلب | من التوكن |
| الأسعار | `unit_price` و`item_type` من الواجهة | من السيرفر حصراً |
| النسب | PUT يسري فوراً | POST مع `effective_from` وتاريخ النسب |
| الحجز والدفع الأونلاين | لا يوجد | وحدتا 5 و 6 |
| الطابور | GET فقط مع أسماء المرضى | كل الأزرار + شاشة عامة بدون أسماء + SignalR |
| الحظر | لا يوجد | ban-status و unban بعربون |
| التحصيل والإيصال | لا يوجد | `POST /payments` + إيصال QR + توكن الدرج |
| الاسترجاع | بدون مبلغ أو طريقة | مبلغ، طريقة، موافقة، إيصال استرجاع |
| الوردية | إغلاق نقدي فقط ويعرض المتوقع للموظف | فتح، إغلاق أعمى حسب طريقة الدفع، مطابقة للمحاسب فقط |
| الوصفة | نص حر | مهيكلة + ملاحظات خاصة + طلبات أشعة منفصلة |
| المختبر والأشعة | endpoint واحد ورابط عام | قسمان منفصلان، نتائج مهيكلة وقيم حرجة، رفع presigned إلى MinIO |
| الدفع الآجل | لا يوجد | وحدة 14 |
| الصيدلية | مخزون (Phase 2) | صرف لمرة واحدة فقط (Phase 1) |
| الأوفلاين | مرضى فقط | Outbox عام لكل العمليات + كتل إيصالات للأجهزة |
| الوكيل المحلي | غير موثق | وحدة 16 |
| الأخطاء | غير موحدة | Problem Details + جدول رموز |
| صورة الطبيب | في الحجز العام فقط بدون آلية رفع | `photo_url` في كل قوائم الأطباء + رفع وحذف الصورة |
| الحجز والطابور | تصور عام | حجز هاتفي، تذكرة انتظار فورية، فاتورة كشفية عند الوصول، طوارئ وتخطٍ ومتأخر، شاشات انتظار بمفتاح، وأحداث مباشرة |
| الفروع والعيادات | عرض فقط | إضافة وتعديل وإيقاف الفروع والعيادات والمختبرات والأشعة والصيدليات |
| الإغلاق المؤقت | لا يوجد | إغلاق العيادات والمختبرات والأشعة والصيدليات لفترة، مع إلغاء الحجوزات وإعادة الفتح |
| القوائم المنسدلة | نصوص ثابتة | `/lookups`: أسباب الإغلاق والاختصاصات والعناوين الوظيفية يديرها المدير، و`job_title` للطبيب |
| المال (المرحلة 4) | تصور عام | سلة موحدة، تحصيل متعدد الطرق مع الرصيد، إيصالات و QR، توكن درج ES256، ورديات بإغلاق أعمى ومطابقة، فاتورة يدوية بخصم، استرجاع بحد وموافقة، عربون فك الحظر |
| الجزء الثاني (عقد معتمد) | تصور عام | عقد كامل للعيادة والمختبر والأشعة والصيدلية وتطبيق المريض والدفع الإلكتروني والإشعارات والأوفلاين، مع OTP وبوابة دفع ورسائل بوضع تجريبي |
| الجزء الثاني (مُنفّذ) | عقد معتمد | كل الأقسام مبنية ومختبرة. توضيحات بلا كسر: `source: "online"` لحجز التطبيق، عربون الحجز رصيد يُستخدم في السلة، قائمة العمل بلا تاريخ تعرض كل المفتوح، المعاينة ممكنة بعد إنهاء الزيارة، التقديم الذكي يدوي من الاستقبال، توقيع كتلة الإيصالات، و`queues` و`device_id` في اللقطة، ورموز أخطاء جديدة في الملحق (أ) |
| الإدارة والمال | تقارير عامة | لوحة المدير العام لكل الفروع، الإيراد حسب القسم والطريقة والفرع، أرباح الأطباء، الغياب، سجل التدقيق، الدفع الآجل والإعفاء، مصاريف الفروع (من الدرج أو الصندوق) والصافي بعد المصاريف |
| أموال الفروع | لا يوجد | الرصيد مسجل بفرعه، نقطة التحصيل على الوردية (`clinic_id`)، وتقرير تسويات الرصيد بين الفروع |
| إدارة الفروع | إضافة وتعديل وإيقاف | حالة الفرع (مفتوح، مغلق مؤقتاً بسبب، موقوف)، إغلاق الفرع كاملاً وإعادة فتحه، `overview` بما في الفرع وتنبيهات الإعداد، `/public/branches` والواجهة الرئيسية للفرع، إعدادات الفرع والإعدادات العامة، وإيقاف الفرع أو الطبيب لا يترك حجوزات معلقة |
| الجزء الثالث (إشعارات وطابور ونسخ احتياطي) | لا يوجد | إشعارات الإرجاع والرصيد، تذكير بالحضور المبكر، "اقترب دورك"، تنبيه "تفضل للدخول" المستمر مع "أنا قادم"، طابوري اليوم، دعوة الحضور المبكر و"في الطريق"، إنهاء واستدعاء التالي (`call_next`، `finish_visit`، `call_policy`، `queue.call_next_by`)، والنسخ الاحتياطي المجاني (القسم 21). كل الإضافات اختيارية بلا كسر، والترحيل 006 |
