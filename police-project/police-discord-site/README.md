# بوابة الشرطة المرتبطة بديسكورد — Cloudflare Pages

مشروع بداية قابل للنشر: واجهة عربية متجاوبة، سجل أفراد قابل للبحث والتصفية، إدارة محتوى وإدارات من لوحة الإدارة، طلبات، تسجيل دخول إداري عبر Discord OAuth2، وقاعدة D1 مشتركة. توجد خدمة مزامنة مستقلة `sync-worker.js` لتحديث الأعضاء والرتب دوريًا.

> مهم: هذا قالب تأسيسي. يلزم ربط حساب Cloudflare وإدخال IDs والأسرار قبل أن تعمل المصادقة والمزامنة. لا تضع Bot Token في `index.html` أو أي ملف عام.

## 1) إنشاء قاعدة البيانات
1. افتح https://dash.cloudflare.com/ ثم **Workers & Pages → D1 SQL Database → Create database**.
2. سمها `police-portal-db` وانسخ Database ID.
3. افتح Console للقاعدة ونفذ كامل محتوى `schema.sql`.
4. في إعدادات مشروع Pages أضف D1 binding باسم `DB` واربط القاعدة. إذا تستخدم `wrangler.toml`، استبدل `REPLACE_WITH_YOUR_D1_DATABASE_ID` بالمعرف الحقيقي.

## 2) نشر الواجهة
1. ارفع محتويات هذا المجلد إلى مستودع GitHub.
2. في Cloudflare اختر **Workers & Pages → Create → Pages → Connect to Git**.
3. اختر المستودع. هذا مشروع HTML ثابت: Build command اتركه فارغًا، وBuild output directory اكتب `.`.
4. أضف متغيرات Pages التالية من **Settings → Variables and Secrets**:
   - `DISCORD_CLIENT_ID` — معرف تطبيق Discord.
   - `DISCORD_CLIENT_SECRET` — سر OAuth2 (Secret).
   - `DISCORD_REDIRECT_URI` — `https://YOUR-PROJECT.pages.dev/api/auth/callback`.
   - `SESSION_SECRET` — سلسلة عشوائية طويلة جدًا (Secret).
   - `ADMIN_DISCORD_IDS` — Discord User ID للمشرفين، وافصل عدة معرفات بفاصلة.
5. أعد النشر بعد إضافة المتغيرات والـ D1 binding.

## 3) إعداد Discord OAuth2
1. افتح https://discord.com/developers/applications وأنشئ Application.
2. من OAuth2 أضف Redirect URL المطابق تمامًا للمتغير `DISCORD_REDIRECT_URI`.
3. ضع Client ID وClient Secret في Cloudflare Secrets فقط.
4. احصل على Discord User ID لحساب المشرف، وفعّل Developer Mode في Discord لنسخ User ID، ثم ضعه في `ADMIN_DISCORD_IDS`.

## 4) مزامنة الأعضاء تلقائيًا
Pages ليست عملية Bot Gateway دائمة. لهذا القالب يستخدم Worker مجدولًا يقرأ أعضاء السيرفر عبر Discord REST كل 5 دقائق.
1. من Discord Developer Portal → Bot أنشئ/انسخ Bot Token، وفعل **Server Members Intent**. أضف البوت إلى السيرفر بصلاحيات قراءة الأعضاء المناسبة.
2. أنشئ Worker مستقل في Cloudflare باسم `police-discord-sync` وانشر `sync-worker.js` كمصدره. في إعدادات Worker أضف D1 binding اسمه `DB` إلى نفس قاعدة البيانات.
3. أضف Secrets/Variables إلى Worker:
   - `DISCORD_BOT_TOKEN` (Secret)
   - `DISCORD_GUILD_ID`
   - `RANK_ROLE_IDS` — معرفات رتب الشرطة مفصولة بفواصل، من الأعلى للأدنى.
   - `DEPARTMENT_ROLE_IDS` — معرفات رتب الإدارات مفصولة بفواصل.
4. اضبط Trigger مجدولًا `*/5 * * * *` (كل 5 دقائق) ثم شغّل Worker يدويًا/انتظر أول دورة.

## 5) تخصيص الرتب والإدارات
- سجل الأفراد يعرض الأعضاء الذين لديهم أي رتبة في `RANK_ROLE_IDS` أو `DEPARTMENT_ROLE_IDS` أو غيرها؛ ولعرض الشرطة فقط، عدّل `sync-worker.js` ليتجاوز العضو إذا لم يكن لديه أي رتبة شرطة.
- الرتبة المعروضة هي أول Role ID مطابق حسب ترتيب `RANK_ROLE_IDS`.
- لوحة الإدارة تضيف الإدارات ووصفها وربط Role ID اختياري. لإظهار عدد أفراد صحيح حسب كل إدارة، اجعل `DEPARTMENT_ROLE_IDS` متوافقًا مع Role IDs التي تستخدمها.
- من لوحة الإدارة تستطيع تعديل اسم الموقع ووصفه وحذف/إضافة الإدارات ومراجعة الطلبات.

## حدود الخطة المجانية
- Pages: حتى 500 عملية build شهريًا، 20,000 ملف بالموقع، 25 MiB لكل ملف. طلبات الملفات الثابتة مجانية وغير محدودة.
- Workers/Pages Functions Free: 100,000 طلب يوميًا، مع حد وقت CPU منخفض لكل طلب.
- D1 Free: حتى 10 قواعد، 500 MB لكل قاعدة، مع حدود يومية للقراءة والكتابة (راجع الوثائق الحالية).
- Cron triggers: حتى 5 على الخطة المجانية للحساب.
- إذا تجاوزت حصة API أو D1، قد تتوقف المزامنة أو بعض عمليات الإدارة مؤقتًا. هذه حدود مجانية وليست موارد غير محدودة.

## ملاحظات أمان ونواقص مقصودة
- لا تستخدم هذا القالب قبل إعداد الأسرار وصلاحيات Discord.
- OAuth الحالي يمنح لوحة الإدارة فقط لمعرفات `ADMIN_DISCORD_IDS`، وتُحمى الجلسة بتوقيع HMAC وCookie HttpOnly/Secure.
- المزامنة المجدولة هي استعلام دوري كل 5 دقائق، وليست لحظية تمامًا.
- أضف حماية من الإساءة/معدل الطلبات للطلبات العامة قبل فتح الموقع للجميع.
- لا تعرض بيانات خاصة أو سجلات تأديبية علنًا؛ أضف سياسات صلاحيات منفصلة إذا احتجت ذلك.

## وثائق رسمية
- https://developers.cloudflare.com/pages/
- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/d1/platform/limits/
- https://discord.com/developers/docs/resources/guild
