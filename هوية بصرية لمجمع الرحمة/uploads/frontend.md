# 👨‍💻 دليل تطوير الفرونت إند (الإصدار v4.0 الشامل) - المطور علي محيبس
**Frontend Engineering Architecture & Guidelines - Al-Hawaraa Medical Complex**

---

أهلاً بك يا أخي علي محيبس في الفريق الترقوي لنظام مجمع الحوراء الطبي. هذا الملف هو مرجعك الفني والتنفيذي الشامل لبناء الواجهات والفرونت إند الخاص بالنظام بأعلى كفاءة وأفضل أداء متوافق مع قاعدة البيانات وعقود الـ APIs الإصدار v4.0.

---

## 1. التكنولوجيا المعتمدة للفرونت إند (Tech Stack)
* **Core Framework**: React.js / Vite (أو HTML5 PWA Single File Standard).
* **Styling Engine**: Tailwind CSS + Shadcn UI (باستخدام IBM Plex Sans Arabic و Space Grotesk للأرقام).
* **State Management**: Zustand / @tanstack/react-query (للـ Data Caching وإدارتها).
* **Offline Storage**: IndexedDB عبر مكتبة `Dexie.js` للتعامل مع البيانات المحلية.
* **RTL Support**: تفعيل `dir="rtl"` كخيار افتراضي في جذر الـ DOM مع استخدام Tailwind Logical Properties (`ms-`, `me-`, `ps-`, `pe-`).

---

## 2. إدارة المصادقة والصلاحيات (RBAC & Guarded Routes)
يجب تقييد عرض الشاشات والروابط بحسب الـ `role` القادم من توكن الجلسة `/api/v1/auth/login`:
* **Admin**: صلاحيات شاملة لكافة الأقسام والتقارير.
* **Doctor**: شاشة الطابور الخاص بالعيادة، والسجل الطبي (EMR) فقط.
* **Cashier / Receptionist**: شاشة حجز الطابور، الفوترة والقبض، والإغلاق الأعمى.
* **Pharmacist**: شاشة استقبال الوصفات وصرف الأدوية.
* **Lab Tech / Radiologist**: شاشة استقبال الفحوصات ورفع النتائج والتقارير.

---

## 3. قواعد التعامل مع المنطق المالي في الفرونت إند (CRITICAL)

### **أ. طريقة بناء فاتورة البنود (Line-Item Billing Dynamic Builder):**
عند فتح شاشة الدفع في الاستقبال، لا تقم بتجميع المبالغ وتطبيق نسبة مئوية واحدة! تطبيق الخوارزمية التالية داخل كود الواجهة:

```javascript
function calculateLineItem(item, doctor) {
  let doctorPercentage = 0;
  
  if (item.is_commissionable) {
    if (item.item_type === 'new_visit') {
      doctorPercentage = doctor.new_visit_commission_rate;
    } else if (item.item_type === 'follow_up') {
      doctorPercentage = doctor.followup_commission_rate;
    } else if (item.item_type === 'procedure') {
      doctorPercentage = item.custom_procedure_percentage || 50.00;
    }
  } else {
    // التحاليل والأشعة والصيدلية تذهب 100% للمجمع
    doctorPercentage = 0;
  }

  const doctorEarned = (item.unit_price * (doctorPercentage / 100));
  const complexEarned = item.unit_price - doctorEarned;

  return {
    unit_price: item.unit_price,
    applied_percentage: doctorPercentage,
    doctor_earned_amount: doctorEarned,
    complex_earned_amount: complexEarned
  };
}