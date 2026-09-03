# رأس المال | Ras ALmal (Business Empire Tycoon)

🌐 **رابط اللعبة المباشر (Live App):** [https://ras-almal.vercel.app](https://ras-almal.vercel.app)

محاكي اقتصادي واستثماري متكامل باللغة العربية مع دعم كامل للاتجاه من اليمين لليسار (RTL) وتزامن حي مع قاعدة البيانات السحابية (Firebase Firestore) ولوحة تحكم وإدارة شاملة.

---

## 📁 هيكلية ملفات المشروع (Project Files)

1. **[index.html](file:///C:/Users/khale/.gemini/antigravity-ide/scratch/foolos-man-tycoon/index.html)**: واجهة اللعبة الأساسية المستجيبة (Dashboard) مع تصميم زجاجي داكن وتنسيق Tailwind CSS.
2. **[app.css](file:///C:/Users/khale/.gemini/antigravity-ide/scratch/foolos-man-tycoon/app.css)**: ملف الأنماط المخصصة، خطوط Google (Cairo & Outfit)، وتأثيرات الصعود العائم والنبض.
3. **[db.js](file:///C:/Users/khale/.gemini/antigravity-ide/scratch/foolos-man-tycoon/db.js)**: جسر البيانات للتعامل مع الذاكرة المحلية (localStorage) وتوليد اللاعبين الوهميين، والاتصال الحي بـ Firebase Firestore.
4. **[game.js](file:///C:/Users/khale/.gemini/antigravity-ide/scratch/foolos-man-tycoon/game.js)**: محرك المحاكاة الرياضي لإجراء الحسابات المالية، عقود العمل، مرونة أسعار الشركات، تذبذب البورصة، والسجن.
5. **[ui.js](file:///C:/Users/khale/.gemini/antigravity-ide/scratch/foolos-man-tycoon/ui.js)**: موجه الواجهة لإدارة التبويبات، ورسم رسومات البورصة البيانية SVG، وإشعارات التنبيه (Toasts)، وألعاب الكازينو (Crash & Slots).

---

## 🚀 تشغيل اللعبة محلياً (How to Run)

نظراً لأن اللعبة تقوم بتحميل وحدات Firebase الخارجية عند ربطها بالسحابة، يُنصح بتشغيلها عبر خادم محلي (Web Server) بدلاً من فتح ملف HTML مباشرة.

### الخيار 1: باستخدام Python (سهل وسريع)
افتح موجه الأوامر (PowerShell/CMD) في مجلد اللعبة واكتب:
```powershell
python -m http.server 8000
```
ثم افتح المتصفح وتصفح الرابط: `http://localhost:8000`

### الخيار 2: باستخدام Node.js
ثبّت خادم مبسط وقم بتشغيله:
```bash
npm install -g http-server
http-server -p 8000
```

---

## ☁️ تهيئة وتكوين خادم Firebase Firestore

لإدراج اللعبة في شبكة الإنترنت وتفعيل التنافس على قائمة "توب الأغنياء" وتطبيق التحويلات المالية الحقيقية بين اللاعبين:

1. اذهب إلى [Firebase Console](https://console.firebase.google.com) وافتح مشروع `ras-almal`.
2. داخل لوحة تحكم المشروع، أضف تطبيق ويب (Web App `</>`) واحصل على كود التكوين (Firebase Configuration JSON). سيبدو على هذا النحو:
   ```json
   {
     "apiKey": "AIzaSyC34_3asZIiVxm4vARBBmRIC6FeUbAcrT0",
     "authDomain": "ras-almal.firebaseapp.com",
     "projectId": "ras-almal",
     "storageBucket": "ras-almal.firebasestorage.app",
     "messagingSenderId": "1062903984803",
     "appId": "1:1062903984803:web:5bf2eaea27cb593d238516"
   }
   ```
3. من القائمة الجانبية في Firebase، اختر **Firestore Database** واضغط على **Create Database** (أنشئ قاعدة البيانات).
4. اذهب إلى تبويب **Rules** (القواعد) والصق القواعد الأمنية التالية لتوفير التزامن الآمن للاعبين:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /players/{username} {
         allow read, write: if true;
       }
       match /transfers/{transferId} {
         allow read, write: if true;
       }
     }
   }
   ```
5. انشر القواعد بالضغط على **Publish**.
6. افتح واجهة اللعبة، وانتقل لعلامة تبويب **التزامن السحابي**، وألصق كود الـ JSON الخاص بك في المربع المخصص واضغط **حفظ المفاتيح وبدء التزامن**.

---

## 🧮 الخوارزميات والمعايير المالية المستخدمة

* **الفائدة المركبة البنكية (Bank Compounding)**:
  $$\text{رصيد البنك الجديد} = \text{الرصيد السابق} \times (1 + 0.00005)$$
  حيث تضاف الفائدة تلقائياً كل 3 ثوانٍ (tick) بما يعادل تقريباً 6% سنوياً.
* **مرونة الأسعار للطلب (Price Elasticity in Startups)**:
  عند رفع سعر مبيعات عربة القهوة أو شركة التقنية عن السعر المثالي المقترح، يتراجع حجم الطلب والمبيعات تدريجياً لضمان ضرورة الإدارة الحكيمة للموارد وتجنب الجشع التجاري.
* **تذبذب الأسهم العشوائي (Stock Random Walk)**:
  تسير أسعار الأسهم وفقاً لنظرية السير العشوائي مع إضافة معامل تصحيح مركزي (Mean Reversion) يجذب الأسعار دائماً نحو السعر العادل للشركة لمنع تضخم السهم اللانهائي أو انهياره للصفر.
