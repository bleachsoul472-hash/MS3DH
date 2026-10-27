MS3DH TRIPE - طريقة تجهيز الحفظ المشترك

1) افتح Supabase > SQL Editor، والصق محتوى supabase-site-content.sql ثم Run.
2) في Supabase Settings > API انسخ Project URL ومفتاح service_role السري.
3) في Netlify > Site configuration > Environment variables أضف:
   SUPABASE_URL = رابط مشروع Supabase
   SUPABASE_SERVICE_ROLE_KEY = مفتاح service_role السري
   SITE_ADMIN_KEY = اختر مفتاح إدارة طويلًا وفريدًا (لا ترسله لأحد)
   KICK_CHANNEL = اسم قناة Kick (اختياري؛ يمكن تغييره من إدارة الموقع)
   OFFLINE_IMAGE_URL = رابط صورة عدم البث (اختياري)
   DISCORD_SUPPORT_WEBHOOK_URL = رابط Webhook الخاص بالدعم (اختياري)
4) ارفع محتويات هذه الحزمة إلى جذر مستودع GitHub المرتبط بـ Netlify، مع الاحتفاظ بمجلد netlify/functions.
5) بعد نشر Netlify بنجاح، افتح الموقع واضغط إدارة الموقع، واكتب قيمة SITE_ADMIN_KEY نفسها لتسجيل الدخول.
6) عدّل المحتوى واضغط حفظ التغييرات. ستظهر النسخة المشتركة للزوار على الأجهزة المختلفة.

الأمان:
- لا تضع SUPABASE_SERVICE_ROLE_KEY أو SITE_ADMIN_KEY داخل HTML أو GitHub.
- لا تشارك ملفًا يحتوي على هذه المفاتيح.
- الصور المرفوعة محليًا تُخزّن كبيانات ضمن المحتوى؛ للصور الكبيرة استخدم رابط صورة HTTPS عامًّا.
- حفظ التغييرات من لوحة الإدارة يحتاج نشر الوظيفة وإعداد Supabase أولًا.
