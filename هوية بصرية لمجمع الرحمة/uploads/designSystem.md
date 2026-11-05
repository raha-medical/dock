# 🎯 Cloud UI/UX Agent Master Directive & Prompt (v4.0 Ultimate Final)
**Al-Hawaraa Medical Complex - Multi-Device Responsive Design System Generation Prompt**

---

### **توجيه الـ Cloud Agent (الموجه الرئيسي):**

> **Role & Responsibility**:
> أنت تعمل الآن كـ **Principal UI/UX Design System Architect** متخصص في أنظمة الـ **Enterprise Health-Tech** والـ **PWA WebViews**. 
> مهمتك هي إنشاء وبناء الهوية البصرية ونظام التصميم (Design System & UI Components) الكامل والمستجيب لمشروع **"مجمع الحوراء الطبي" (Al-Hawaraa Medical Complex)**.

---

### **1. سياق التطبيق والاشتراطات الهندسية لمرونة الشاشات (Universal Responsiveness):**
* **نوع المنصة والتكيف مع الأجهزة (Adaptive Viewports)**: 
  تصميم PWA WebView هجين يعتمد على معيار **Multi-Device Responsive Grid System**، بحيث يتكيف كلياً وسلساً بين الأجهزة التالية:
  1. **الهاتف المحمول (Mobile Portrait View < 640px)**: واجهة لمسية متطورة بروابط سريعة، Bottom Navigation Bar، وبطاقات تفاعلية مبسطة تتصرف كتطبيق موبايل أصلي (Native Look & Feel).
  2. **الأجهزة اللوحية (Tablet / iPad View 640px - 1024px)**: واجهة مرنة بشريط جانبي قابلة للطي (Collapsible Sidebar Navigation)، وجداول متوسطة تتكيف مع أجهزة الاستقبال اللوحية وتابلت الطبيب.
  3. **متصفحات الحاسوب والعيادات (Web & Desktop Dashboard > 1024px)**: شاشة قيادة واسعة (Full Screen Multi-Column Dashboard) تعرض كامل الجداول المالية، الطابور الحي، والسجلات الطبية بدقة وسرعة تشغيلية عالية.
* **الاتجاه واللغة**: **RTL-First** (دعم كامل وأساسي للغة العربية) مع استخدام Tailwind Logical Properties (`ms-`, `me-`, `ps-`, `pe-`).
* **طبيعة الأداء**: تصميم متكيف مع الحالات دون إنترنت مع ظهور مؤشرات الأوفلاين (**Offline-First Visual Indicators**).

---

### **2. قاعدة الهوية البصرية ونظام الألوان (Visual Identity Strategy):**
> ⚠️ **تعليمات صارمة**: 
> **لا تقم بتثبيت أو إقرار ألوان محددة مسبقاً!**
> يجب عليك استقبال واشتقاق الهوية البصرية، درجات الألوان، الـ Shadows، والـ Border Radius الخاصة بثيمي **Light Mode** و **Dark Mode** بناءً على **الصور والتغذية البصرية المرفقة من بينترست (Pinterest Reference Images)** داخل هذا الشات.

---

### **3. قراءة وتكامل ملفات النظام المعتمدة (System Files Integration):**
> **directive**: 
> يُرجى قراءة واعتماد الملفات الفنية المعتمدة للمشروع ومطابقة الواجهات معها بدقة 100%:
> 1. **`dataBase.sql`**: للاستناد إلى جداول المستخدمين، الفروع، الطابور، الفوترة، السجل الطبي EMR، الصيدلية، المختبر والأشعة، والإغلاق الأعمى.
> 2. **`api_contracts_document_v4_ultimate.md`**: لربط حقول الإدخال والـ Dynamic Modals مع الـ Endpoints والـ Enums الخاصة بالإصدار v4.0، وتحديداً:
>    * **حالات طابور المرضى**: `waiting`, `in_room`, `completed`, `cancelled`.
>    * **أنواع البنود المالية**: `new_visit`, `follow_up`, `procedure`, `lab`, `radiology`, `pharmacy`.
>    * **حالات الإغلاق الأعمى**: إخفاء أرقام النظام وإتاحة حقل `declared_cash_amount`.
>    * **الصيدلية والمختبر**: واجهات صرف الأدوية `pharmacy_dispensing` ورفع تقارير `lab_radiology_results`.
> 3. **`frontend.md`**: لالتزام الهيكلية المعمارية لمكونات الفرونت إند (`src/components/`) وتوزيع الـ Stores والـ Utility Functions.

---

### **4. قائمة الشاشات والمكونات المطلوبة بالتفصيل (Required Responsive UI Components):**

#### **أ. الواجهة التعريفية (Landing Page Components):**
* **Hero Section**: شعار المجمع، عنوان جذاب، زر الحجز المباشر (`CTA`)، وشريط تتبع الطابور الحي (مستجيب لكل مقاسات الشاشات).
* **Services Grid**: كروت الخدمات المميزة (عيادات، تحاليل، أشعة، صيدلية) بأسلوب Responsive Grid (1 column للموبايل، 2 للتابلت، 4 للمكتب).
* **Branch Switcher**: أداة التبديل السلس بين الفرع الرئيسي وفرع كربلاء.

#### **ب. واجهة الاستقبال والفوترة (POS & Financial Billing Components):**
* **Itemized Billing Table**: جدول الفوترة الديناميكي الذي يوضح تمييز الكشف الجديد عن المراجعة، ويحتسب العمولات والنسب بناءً على نوع البند، مع إتاحة Horizontal Scroll للتابلت والموبايل.
* **Partial Refund Action Modal**: نافذة تفاعلية لإلغاء/استرجاع بند واحد من الفاتورة مع توضيح المسترجع المالي.
* **Blind Shift Closing Modal**: نافذة الإغلاق المالي المغلقة للمحاسب دون كشف أرقام النظام.

#### **جـ. واجهة الطبيب والـ EMR (Doctor Workspace):**
* **Live Queue Cards**: بطاقات الطابور التفاعلية الموضحة للوقت التخميني وحالة المريض.
* **E-Prescription Creator**: مكون كتابة الوصفة الطبية وتحديد طلبات التحاليل والأشعة والصيدلية.

#### **د. واجهات الصيدلية والمختبر والأشعة (Pharmacy & Diagnostics Workspaces):**
* **Prescription Dispensing Modal**: واجهة الصيدلي لاستقبال الوصفات وتحديد الأدوية المتاحة وتحديث المخزون.
* **Diagnostic Report Uploader**: واجهة الفني المخبري وشعاع الأشعة لرفع النتائج والروابط PDF/Images.

---

### **5. المخرجات المطلوبة من الكلاود:**
1. تصدير ملف الـ **Design Tokens** (JSON Schema & Tailwind Config Extensions).
2. بناء المكونات كـ **Single-File Clean Reusable Components** (React JSX + Tailwind CSS).
3. تقديم معاينة حية (Live Preview) لشاشات التطبيق على **الهاتف، التابلت، والمتصفح المكتبي**.