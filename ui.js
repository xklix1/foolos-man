/**
 * Ras ALmal Tycoon (رأس المال)
 * UI Controller (ui.js)
 * Manages rendering, tab views, SVG charts, and interactive casino controls
 */

// Admin identity is determined at runtime from Firestore (isAdmin flag) — no hardcoded credentials.

const UIController = (() => {
  console.log('[UI] Controller Loaded (v=107)');
  const CLIENT_PAGE_START_TIME = Date.now();
  window.CLIENT_PAGE_LOAD_TS = CLIENT_PAGE_START_TIME;
  let activeTab ='dashboard';
  let tickIntervalId = null;

  // Translation System (New)
  const currentLang = localStorage.getItem('game_lang') ||'ar';
  window.currentLang = currentLang;

  // Set layout direction on load
  document.documentElement.dir = currentLang ==='en' ?'ltr' :'rtl';
  if (currentLang ==='en') {
    document.documentElement.lang ='en';
  }

  const translationDict = {
    // Nav / Sidebar"حسابي":"My Account","المهن والوظائف":"Careers & Jobs","إدارة الأعمال":"Businesses","البنك والتحويلات":"Banking & Wire","ممتلكاتي والعقارات":"Real Estate","البورصة والأسهم":"Stock Market","مصلحة الضرائب":"Tax Department","المتجر والمستودع":"VIP Shop & Inventory","المزادات والصفقات الخاصة":"Auctions & Special","السوق السوداء":"Black Market","كازينو التسلية":"Casino & Slots","توب الأغنياء":"Leaderboard","خروج":"Logout","القائمة":"Menu","الدليل":"Guide","الإدارة":"Admin","الإصدار V1 • الإطلاق الرسمي":"Version V1 • Official Launch","الإصدار 1":"Version V1","الإصدار V1.01":"Version V1","الإصدار V2":"Version V1","الإصدار V2.5":"Version V1","خوادم الأونلاين نشطة":"Online Servers Active","جاهز للإقلاع":"Ready for takeoff","المحفظة النشطة":"Active Profile","سيولة الكاش":"Cash Balance","حساب البنك":"Bank Account","التدفق اللحظي":"Passive Cashflow","إجمالي الثروة":"Net Worth","من الصفر إلى عرش المليارات • محاكي إمبراطورية المال والاستثمار":"From Scratch to Billions • Business Empire Tycoon","محفظتك المحفوظة والجاهزة للمتابعة":"Your Saved Wallet Profile","تسجيل الدخول للمحفظة":"Login to Wallet","رأس المال • Ras ALmal":"Ras ALmal Tycoon","أدخل اسم مستخدم فريد ورمز سري لتأسيس محفظتك وحفظ أرباحك السحابية.":"Enter username & PIN to manage your wallet and save progress.","تسجيل الدخول":"Login","إنشاء حساب جديد":"Register","اسم المستخدم (بالأحرف أو الأرقام)":"Username (letters & numbers)","الرقم السري للمحفظة (PIN)":"PIN Code (numbers)","دخول وتزامن الحساب":"Login & Sync","متابعة الإمبراطورية":"Continue Empire","استكمال إدارتك للأموال والمشاريع":"Resume managing funds & business","بدء رحلة جديدة":"Start New Journey","تأسيس محفظة والانطلاق من الصفر":"Create profile & launch from scratch","تسجيل الدخول لمحفظة سابقة":"Login to existing wallet","استعادة حسابك المحفوظ بكلمة المرور (PIN)":"Restore saved wallet via PIN","عرش الأثرياء":"Wealthiest Leaderboard","دليل الملياردير":"Billionaire Guide","الإعدادات":"Settings","إعدادات اللعبة والصوت":"Game & Sound Settings","تخصيص التجربة والمؤثرات الصوتية والبصرية":"Customize audio & visual preferences","المؤثرات الصوتية (Sound FX)":"Sound FX","أصوات النقر والربح والكازينو والتنبيهات":"Click sounds, earnings, casino, and alerts","الموسيقى المحيطية (Ambient Sound)":"Ambient Sound / Synth","موسيقى هادئة سينمائية لأجواء اللعبة":"Quiet cinematic music for game atmosphere","تأثيرات الإضاءة والنيون (Glow FX)":"Glow & Visual FX","تأثير التوهج والفلورسنت (Glow FX)":"Glow & Visual FX","توهج الذهب والجزيئات المتحركة":"Glow details and animated particles","تجربة نغمة الصوت":"Test Sound Tone","حفظ التفضيلات":"Save Preferences","قاعة الشرف وعرش الأثرياء":"Hall of Fame & Leaderboard","أعلى أصحاب الثروات في سيرفر رأس المال (Ras ALmal) المباشر":"Top billionaires on the live Ras ALmal server","دليل الملياردير الإمبراطوري":"Billionaire Imperial Guide","أسرار الهيمنة وصناعة الثروة من الصفر حتى قمة عرش أثرياء رأس المال":"Secrets of wealth and dominance from scratch to the throne of Ras ALmal"," الدليل الإمبراطوري الشامل (المفصل)":" Detailed Billionaire Guide"," الدليل السريع والمختصر":" Compact Quick Guide","الإصدار الشامل ⭐":"Imperial Edition ⭐","إنشاء محفظة جديدة وبدء اللعب":"Create Profile & Play","الرجوع للقائمة الرئيسية":"Return to Menu","فهمت القواعد! انطلق الآن":"Got the Rules! Start Playing"," يمكنك الرجوع للدليل في أي وقت من القائمة أو شريط اللعبة":" You can open this guide at any time from the main menu or HUD","تغيير اللغة / Change Language":"اللغة: العربية","EN":"العربية",
    // Toast titles & messages & game status terms"تهانينا":"Congratulations","تم ترقيتك لوظيفة:":"You have been promoted to:","خطأ الترقية":"Promotion Error","نجاح التأسيس":"Establishment Successful","تم افتتاح مشروع":"Successfully opened"," بنجاح!":"!","فشل المشروع":"Project Failure","عقود عقارية":"Real Estate Contracts","تم شراء عقار":"Successfully purchased property"," بنجاح وإضافته لمحفظتك.":" and added it to your portfolio.","بيع كلي":"Full Liquidation","تمت بيع وتسييل كامل الأسهم":"Successfully sold and liquidated all shares"," سهم) بقيمة":" shares) for","فشل البيع":"Sale Failed","خطأ رهان":"Bet Error","ربح ملكي!":"Royal Win!","صبت التخمين":"You guessed correctly","التاج الملكي":"Royal Crown","الدرع الدفاعي":"Defense Shield"," كسبت":" won","بونص سلسلة الفوز:":"Win streak bonus:","خسارة الجولة":"Round Lost","لسوء الحظ، استقرت العملة على":"Unfortunately, the coin landed on","التاج":"Heads","الدرع":"Tails"," خسرت":" lost","تحطم الصاروخ":"Rocket Crashed","انفجر الصاروخ عند مضاعف":"Rocket exploded at multiplier","خسرت رهانك":"You lost your bet","عملية سحب ناجحة":"Cashout Successful","تم سحب أرباحك بقيمة":"Your profits were cashed out at"," بمضاعف":" at multiplier","فاتورة متجر":"Store Bill","تم شراء":"Successfully purchased"," ودفع القيمة النقود.":" and paid the cash value.","رصيد معلق":"Insufficient Balance","لا تملك أي أسهم في هذه الشركة لبيعها.":"You do not own any shares in this company to sell.","يرجى تحديد مبلغ رهان صحيح.":"Please enter a valid bet amount.","جاكبوت كاسح!":"Jackpot!"," مبروك! حصلت على الجاكبوت الذهبي الأقصى! ربحت":" Congrats! You hit the golden jackpot! You won","فوز الآلة":"Slots Win","ربحت":"You won","خسرت":"You lost","حظ أوفر":"Better Luck Next Time","خطأ الآلة":"Slots Error","فوز بلاك جاك":"Blackjack Win","تعادل":"Push","خسارة رهان":"Loss","بلاك جاك طبيعي! ربحت":"Natural Blackjack! You won","تجاوز الموزع! ربحت":"Dealer Bust! You won","تفوقت على الموزع! ربحت":"You beat the dealer! You won","تعادل بمجموع":"Push at score","! تم احتسابه فوزاً لصالحك (عضوية VIP)":"! counted as a win (VIP Benefit)","تعادل (Push) بمجموع":"Push at score","؛ تم استرداد الرهان.":"; bet refunded.","تجاوزت الـ 21 (Bust)! خسرت الرهان":"You went over 21 (Bust)! You lost the bet","تغلّب الموزع عليك! خسرت الرهان":"Dealer beat you! You lost the bet","تم التسجيل بنجاح":"Registered Successfully","تم تسجيل اسمك للمزايدة الحية بنجاح.":"Your name has been registered for the live auction.","فشل التسجيل":"Registration Failed","رصيد غير كافي":"Insufficient Funds","لا تملك رصيداً كافياً لتقديم هذا العرض.":"You do not have enough funds to place this bid.","تمت المزايدة":"Bid Placed","لقد قدمت عرض مزايدة أعلى بنجاح!":"You placed a higher bid successfully!","فشل المزايدة":"Bid Failed","لوحة العمل والاستثمار اليومي":"Daily Work & Investment Board","انقر للعمل، أسس مشاريعك الحرة، ودع الأرباح تصب في محفظتك تلقائياً.":"Click to work, build businesses, and accumulate passive income directly.","العمل بنوبة اعتيادية":"Perform Regular Shift","نوبة إضافية مضاعفة (x2.5 راتب + x3 خبرة)":"Double Overtime Shift (x2.5 Pay, x3 XP)","لوحة التحكم والإشراف":"Admin Dashboard","إصدار النظام":"System Version","نوع التخزين":"Storage Type","تحديث الإحصائيات الحية":"Refresh Stats","اللعبة في وضع الصيانة":"Game Under Maintenance","تخضع اللعبة حالياً لأعمال تحديث وصيانة طارئة. يرجى المحاولة لاحقاً.":"The game is currently under maintenance. Please try again later.","حسناً":"OK","الخوادم رهن الصيانة الفنية!":"Servers Under Maintenance!","تخضع اللعبة حالياً لأعمال تحديث وصيانة طارئة من قبل الإدارة لتحسين الأداء وتأمين الحسابات. يرجى الانتظار والمحاولة لاحقاً.":"The game is currently undergoing maintenance. Please try again later.","إعادة فحص حالة الخادم":"Re-check Server Status","بوابة دخول الإدارة والمشرفين (Admin Portal)":"Admin Portal Portal",

    // Jobs"عامل باليومية":"Daily Laborer","محاسب صندوق":"Cashier","محاسب مالي قانوني":"Certified Accountant","مدير فرع":"Branch Manager","مدير تنفيذي للمجموعة":"Group CEO","رئيس مجلس الإدارة":"Chairman","مستشار اقتصادي ووزير سابق":"Economic Advisor & Ex-Minister","محافظ البنك المركزي":"Central Bank Governor","رئيس صندوق الاستثمار السيادي":"Sovereign Fund President","إمبراطور كبار المستثمرين":"Emperor of Investors",

    // Businesses"عربة القهوة الشعبية":"Street Coffee Cart","سلسلة سوبرماركت البقالة":"Grocery Supermarket Chain","شركة النقل والشحن البري":"Land Shipping & Logistics","مصنع الملابس المنسوجة":"Woven Clothing Factory","مجموعة سلسلة المطاعم الفاخرة":"Luxury Restaurant Chain","شركة البرمجيات والتقنية":"Software & Tech Company","شركة الاتصالات والشبكات":"Telecom & Networks","مصنع البتروكيماويات والغاز":"Petrochemicals & Gas Plant","شركة الملاحة والتنقيب عن الذهب":"Navigation & Gold Mining","مؤسسة استكشاف وتعدين الفضاء":"Space Mining Corporation",

    // Assets"شقة سكنية متوسطة":"Standard Apartment","فيلا سكنية بحديقة":"Residential Villa","مبنى إداري تجاري":"Commercial Office Building","فندق سياحي فاخر":"Luxury Tourist Hotel","منتجع شاطئي استوائي":"Tropical Beach Resort","يخت ملكي فاخر خاص":"Giant Royal Yacht","ناطحة سحاب استثمارية":"Investment Skyscraper","جزيرة خاصة مشفرة":"Private Encrypted Island","مجمع قنوات السويس اللوجستي":"Suez Canal Logistics Hub","المحطة المدارية الفضائية":"Orbit Space Station",

    // Stocks"البنك التجاري الدولي":"Commercial International Bank","الشرقية للدخان":"Eastern Tobacco Company","المصرية للاتصالات":"Telecom Egypt","فوري للمدفوعات الإلكترونية":"Fawry Payments","صندوق الاستثمار التقني البديل":"Alternative Tech Fund","مؤشر البيتكوين والأصول الرقمية":"Bitcoin Index (Crypto)","صندوق سبائك الذهب الخالص":"Pure Gold Bullion Fund","صندوق الذكاء الاصطناعي العالمي":"Global AI Index Fund",

    // Black Market"تهريب سجائر":"Cigarettes Smuggling","أجهزة إلكترونية":"Electronics Smuggling","تسريب بيانات":"Intelligence Data Leak","غسيل أموال سويسري":"Swiss Laundering Hub","اختراق كريبتو":"Crypto Hacking","تهريب الآثار":"Antiques Smuggling","سطو الماس":"Grand Diamond Heist","تهريب اليورانيوم":"Uranium Smuggling","تكنولوجيا دفاعية":"Defense Tech Smuggling","قرصنة البنوك":"Central Bank Cyber Heist","أقمار صناعية":"Satellite Network Hack","عملية العرّاب":"Operation Godfather","تهريب بضائع وسيجار جمركي فاخر":"Cigarettes Smuggling","تهريب حاوية أجهزة إلكترونية حديثة":"Electronics Smuggling","صفقة تسريب سيرفرات وبيانات استخباراتية":"Intelligence Data Leak","مركز غسيل الأموال السويسري":"Swiss Money Laundering Hub","اختراق منصات رقمية وغسيل عملات مشفرة":"Crypto Hacking","تهريب آثار ومخطوطات نادرة لمزادات سرية":"Antiques Smuggling","عملية السطو الكبرى على خزائن الماس الدولية":"Grand Diamond Heist","تهريب اليورانيوم المخصب الدولي":"Uranium Smuggling","صفقة تكنولوجيا دفاعية وشفرات رادار مسربة":"Defense Tech Smuggling","قرصنة واختراق البنوك المركزية":"Central Bank Cyber Heist","السيطرة على شبكة أقمار صناعية وتشفيرها":"Satellite Network Hack","عملية العراب: السيطرة على كارتيل التجارة العالمي":"Operation Godfather",

    // Shop Items"جهاز تشويش رادارات الشرطة":"Police Radar Jammer","جواز سفر دبلوماسي مزور":"Fake Diplomatic Passport","المحامي الدولي الكبير":"Premium International Lawyer","الحقيبة الدبلوماسية المؤمنة":"Secured Diplomatic Bag","القلم الذهبي لكتابة العقود":"Golden Pen (XP Boost)","معالج الكوانتم الخارق للبيانات":"Quantum CPU (Biz Boost)","بطاقة العضوية الماسية للبنك":"Diamond Banking Card","بطاقة حظ الكازينو الذهبية":"Golden Casino VIP Pass","ساعة كورنوس لتسريع الزمن":"Cronos Time Accelerator","ترخيص الإدارة الذاتية والمساعدة":"Auto AFK Manager License","القلم الذهبي للمدراء":"Golden Pen for Managers","توكيل محامٍ دولي قدير":"Hire Premium International Lawyer","مشروب الطاقة والتركيز الفائق":"Super Energy & Focus Drink","درع الإعفاء والملاذ الضريبي":"Tax Exemption Shield","ماسح البورصة والتداول الذكي":"Smart Stock Scanner","بطاقة VIP لكازينو الحظ":"Lucky Casino VIP Pass","معالج الحوسبة الكمومية (Quantum Core)":"Quantum Computing Core (Quantum Core)","عضوية النادي الماسي للبنوك الدولية":"International Banks Diamond Club Membership","يزيد خبرتك الوظيفية XP بنسبة +35% لتسريع الترقيات. ينتهي مفعوله بعد دقيقتين.":"Increases job XP gain by +35% to speed up promotions. Expires in 2 minutes.","يخفض خطورة القبض في صفقات السوق المحظورة بنسبة -18% لمدة 4 دقائق.":"Decreases capture risk in black market deals by -18% for 4 minutes.","يمنحك نشاطاً فائقاً ويزيد راتب نوبات العمل بنسبة +60% لمدة 90 ثانية.":"Grants super energy and increases shift salary by +60% for 90 seconds.","يمنحك خصماً قدره 15% على ترقيات الشركات ويخفض ضريبة الثروة بنسبة 50% لمدة 12 ساعة.":"Grants a 15% discount on franchise upgrades and cuts wealth tax by 50% for 12 hours.","يخفف أثر الهبوط والتصحيحات العكسية لأسهمك بنسبة 40% لمدة 3 دقائق.":"Reduces stock drops and corrections impact by 40% for 3 minutes.","ترفع نسبة الفوز في الكازينو وعجلة الحظ بنسبة +15%. تنتهي وتدمر صلاحيتها بعد 300 ثانية.":"Raises casino and fortune wheel win rate by +15%. Expires and self-destructs in 300 seconds.","يضاعف أرباح وتدفقات كافة مشاريعك وشركاتك بنسبة +50% لمدة 6 دقائق.":"Boosts profits and cashflow of all businesses by +50% for 6 minutes.","ترفع فوائد الودائع البنكية وتخفض ضرائب الثروة بنسبة 50% لمدة 10 دقائق.":"Raises bank deposit interest and cuts wealth tax by 50% for 10 minutes.",

    // General Words"رصيد البنك:":"Bank Balance:","السيولة النقدية:":"Cash Balance:","العائد المتوقع:":"Expected Yield:","التكلفة الاستثمارية:":"Investment Cost:","شراء وتملك العقار":"Purchase Property","الراتب المضمون:":"Guaranteed Pay:","العائد من الخبرة:":"Experience Gain:","الترقية والتعيين بالوظيفة":"Apply for Promotion","الرتبة الحالية":"Current Rank","مغلق":"Locked","توقيع وتنفيذ العملية":"Sign & Execute","تفاصيل العملية":"Deal Details","تاريخ إنشاء الحساب:":"Account Created:","التدفق اللحظي الإجمالي:":"Gross Passive Flow:","الاستقطاع الضريبي اللحظي:":"Periodic Tax:","صافي التدفق (الفرق):":"Net Flow (Diff):","إحصائيات الخادم الحية":"Live Server Statistics","المستخدمين المسجلين":"Registered Users","إجمالي ثروة السيرفر":"Total Server Wealth","المساجين حالياً":"Jailed Players","الحسابات المحظورة":"Banned Players",

    // Additional Panel Headers & Navigation"الشركات القابضة والمشاريع العملاقة":"Mega Corporations & Holding Projects","شركة الاستيراد والتصدير":"Import & Export Trading Co.","مجمع الصناعات وسلاسل الإمداد":"Industrial Supply Chain Empire","سوق الاستحواذ والشركات المتعثرة":"Distressed Asset Acquisition Market","صالة المزاد العلني المباشر":"Live Public Auctions Hall","الصناعات":"Industries","المزادات":"Auctions","التجارة":"Trade","الشركات":"Corporations","السيارات":"Cars","التهريب":"Smuggling","الكازينو":"Casino","الضرائب":"Taxes","المتجر":"VIP Shop","العقارات":"Real Estate","البورصة":"Stocks","البنك":"Bank","الوظائف":"Jobs","المشاريع":"Businesses",

    // Dashboard terms"كشف حساب المحفظة المفصل":"Detailed Portfolio Statement","النقد المتوفر (الكاش)":"Available Liquid Cash","رصيد حساب الادخار (البنك)":"Bank Savings Balance","أموال مشبوهة (غير مشروعة)":"Black Market Dirty Funds","القيمة الصافية للثروة":"Net Worth Total","التدفق بالساعة":"Hourly Cashflow","التدفق بالساعة:":"Hourly Cashflow:","كشف الحساب":"Statement","كشف":"Statement","الكاش":"Cash","الثروة":"Net Worth","مضاعف السيرفر نشط!":"Server Boost Active!","تنويه هام ️":"Important Notice ️","اسم الحساب":"Account Name","الرتبة الاجتماعية":"Social Rank","الخبرة الكلية المتراكمة":"Accumulated Total XP","شرح الصفحة":"Page Guide","سيولة نقدية شرعية ونظيفة للشراء والاستثمار.":"Legitimate cash ready for purchases and investments.","تراكم فائدة مركبة تلقائية بمرور الوقت لكل دقيقة.":"Automatic compound interest accumulating over time.","أرباح السوق السوداء التي تحتاج لغسيل مالي لإيداعها بالبنك.":"Black market profits that require money laundering before bank deposit.","المجموع الكلي: كاش + بنك + أموال مشبوهة + عقارات + أسهم.":"Total: Cash + Bank + Dirty Cash + Real Estate + Stocks.","نشط (تجميع مستمر)":"Active (Collecting)","متوقف":"Inactive","تجديد ترخيص الإدارة الذاتية (12 ساعة)":"Renew AFK License (12 Hours)","المهام اليومية":"Daily Quests","المهام اليومية المنجزة":"Completed Daily Quests","فتح صندوق المكافأة الكبرى":"Claim Grand Daily Chest","استلام":"Claim","مكتمل":"Completed","متبقي":"Remaining","الوقت المتبقي":"Time Left",

    // Bank"إدارة حساب الادخار والتحويلات":"Savings & Transfers Management","أودع أموالك في البنك لتحميها وتحصل على فائدة مركبة بمعدل 0.005% لكل دورة تيك.":"Deposit money in the bank to protect it and earn compound interest.","السيولة النقدية المتوفرة":"Available Liquid Cash","رصيد الادخار البنكي":"Bank Savings Balance","المبلغ المطلوب إيداعه / سحبه":"Amount to Deposit / Withdraw","أودع 25%":"Deposit 25%","أودع 50%":"Deposit 50%","أودع 100%":"Deposit 100%","إيداع نقدي بالبنك":"Deposit Cash","سحب نقدي من البنك":"Withdraw Cash","سحب 25%":"Withdraw 25%","سحب 50%":"Withdraw 50%","سحب 100%":"Withdraw 100%","تحويل بنكي للاعب آخر":"Transfer to Another Player","اسم اللاعب المستلم":"Recipient Username","المبلغ المراد تحويله":"Amount to Transfer","إرسال الحوالة البنكية":"Send Bank Wire","القروض البنكية والائتمان":"Bank Loans & Credit Facilities","طلب قرض جديد":"Request New Loan","سداد القرض الحالي":"Repay Current Loan","أقصى حد للقرض:":"Maximum Loan Limit:","القرض النشط:":"Active Loan:","المبلغ المستحق:":"Due Amount:","المهلة المتبقية:":"Remaining Time:","سداد 50%":"Repay 50%","سداد كامل":"Repay All","أصول مقفلة في الصناديق الاستثمارية":"Locked Investment Funds Assets","سجل التحويلات والحوالات الأخيرة":"Recent Wire Transfers History",

    // Stocks"صالة تداول البورصة والأسهم الحية":"Live Stock Trading Hall","بورصة عالمية موحدة لجميع اللاعبين (جلسات M15 موحدة ومطابقة بدقة 100%).":"Global Unified Stock Market (100% Identical M15 Sessions for All Players).","إغلاق الشمعة وتحديث الأسعار:":"Candle Close & Price Update:","جلسة M15 موحدة":"Unified M15 Session","شريط الأخبار الاقتصادي:":"Economic News Ticker:","الأسهم المملوكة:":"Owned Shares:","متوسط سعر الشراء:":"Avg Buy Price:","قيمة الأسهم الكلية:":"Total Shares Value:","ربح/خسارة المحفظة:":"Portfolio Profit/Loss:","سقف تملك السهم:":"Max Holding Limit:","شراء أسهم":"Buy Shares","بيع أسهم":"Sell Shares","بيع كل الأسهم":"Sell All Shares","شراء 25%":"Buy 25%","شراء 50%":"Buy 50%","شراء أقصى":"Buy Max","بيع 25%":"Sell 25%","بيع 50%":"Sell 50%","بيع الكل":"Sell All",

    // Taxes"مصلحة الضرائب والمالية العامة (Tax Authority)":"Tax Authority & Public Finance","إدارة الوعاء الضريبي، نسب الاستقطاع للثروات الكبرى، وتفعيل الدروع الضريبية القانونية":"Tax base management, wealth bracket deductions, and legal tax shields","الرقم الضريبي للممول:":"Taxpayer ID:","ممتثل ضريبياً":"Tax Compliant","متأخرات ضريبية ️":"Tax Arrears ️","الوعاء الضريبي للثروة":"Taxable Wealth Base","إجمالي الضرائب المسددة":"Total Taxes Paid","درع الإعفاء الضريبي (Shield)":"Tax Exemption Shield","شراء وتفعيل الدرع الضريبي":"Purchase Tax Exemption Shield","تجديد وتمديد الدرع الضريبي":"Renew Tax Exemption Shield","تقديم الإقرار والتسوية":"Submit Tax Return & Settle","دفع الضرائب المستحقة":"Pay Due Taxes",

    // Leaderboard"عرش الأثرياء (توب 10)":"Wealthiest Billionaires (Top 10)","جدول الترتيب العام للمتصدرين (أفضل 10 مستثمرين)":"Overall Leaderboard Ranking (Top 10 Investors)","تحديث تلقائي كل ساعة موحد لجميع اللاعبين":"Hourly Unified Auto-Refresh for All Players","الترتيب":"Rank","اللاعب":"Player","اللقب":"Title","صافي الثروة":"Net Worth","أنت (حسابك)":"You (Your Account)",

    // Casino"رمي العملة الملكية":"Royal Coin Flip","صاروخ المضاعفات":"Multiplier Rocket Crash","آلة السلوتس الذهبية":"Golden Slots Machine","طاولة البلاك جاك 21":"Blackjack 21 Table","سباق الخيول الملكي":"Royal Horse Racing","رهان":"Bet","المبلغ:":"Amount:","سحب الأرباح":"Cash Out","تدوير":"Spin","طلب ورقة":"Hit","توقف":"Stand","مضاعفة":"Double","تقسيم":"Split","رمي العملة":"Coin Flip","الصاروخ":"Rocket Crash","السلوتس":"Slots","البلاك جاك":"Blackjack","عجلة الحظ":"Fortune Wheel","الروليت":"Roulette","تحديد الرهان":"Set Bet","بدء الجولة":"Start Round","سحب الأرباح فوراً":"Cash Out Now",

    // Common Actions & Measurements"إيداع":"Deposit","سحب":"Withdraw","تحويل":"Transfer","سداد":"Repay","شراء":"Buy","بيع":"Sell","ترقية":"Upgrade","توظيف":"Hire","تسريح":"Lay off","تأكيد":"Confirm","إلغاء":"Cancel","إغلاق":"Close","حفظ":"Save","تعديل":"Edit","حذف":"Delete","سهم":"shares","عمال":"workers","وحدة":"units","دورة":"cycle","ساعة":"hour","ثانية":"second","دقيقة":"minute","يوم":"day","جنيه":"EGP","ج.م":"EGP","جنيه/ساعة":"EGP/hr","جنيه/دورة":"EGP/cycle","جنيه/وحدة":"EGP/unit","جنيه/ثانية":"EGP/sec","جنيه/س":"EGP/hr",

    // Cars & Fleet"السيارات الفارهة والأسطول الملكي":"Luxury Fleet & Royal Garage","السيارات الفارهة":"Luxury Cars","تأجير":"Rent","إلغاء التأجير":"Cancel Rental","قيادة":"Drive","إلغاء القيادة":"Cancel Drive","مؤجرة":"Rented","نشطة":"Active","المرأب":"Garage","بدء تأجير السيارة":"Start Car Rental","إيقاف التأجير":"Stop Rental",

    // Real Estate"مملوك:":"Owned:","القيمة السوقية الحالية:":"Current Market Value:","عائد الإيجار السلبي:":"Passive Rental Yield:","قيمة التسييل الفوري (85%):":"Immediate Liquidation (85%):","شراء وحدة إضافية":"Buy Additional Unit","تسييل وبيع وحدة":"Liquidate & Sell Unit",

    // Jobs"الوظيفة الحالية":"Current Job","الراتب الثابت:":"Base Salary:","العائد من الخبرة:":"XP Reward:","الخبرة المطلوبة:":"XP Required:","أنت تمارس هذه المهنة":"You hold this career","التحاق بهذه الوظيفة":"Apply for this job","مغلق (تحتاج لخبرة)":"Locked (XP needed)",

    // Businesses"تكلفة التأسيس:":"Establish Cost:","العائد التقريبي الأساسي:":"Approx. Base Yield:","تأسيس المشروع واستثمار رأس المال":"Establish Business & Invest Capital","سعر بيع الوحدة:":"Unit Selling Price:","العمال الحاليين:":"Current Workers:","ترقية المشروع":"Upgrade Business","توظيف عامل":"Hire Worker","تسريح عامل":"Fire Worker","شراء ترخيص الامتياز التجاري (Franchise)":"Buy Franchise License","إطلاق حملة تسويقية كبرى":"Launch Marketing Campaign",

    // Taxes"الشريحة الأولى (المبتدئين)":"First Bracket (Beginners)","الشريحة الفضية (المستثمر المتوسط)":"Silver Bracket (Mid Investor)","شريحة كبار الممولين":"Major Taxpayers Bracket","شريحة حيتان المال والمليارديرات":"Whales & Billionaires Bracket","شريحتك الحالية":"Current Bracket","شريحتك الحالية":"Current Bracket","غير خاضع":"Exempt","تقديم الإقرار الضريبي الطوعي السنوي":"Annual Voluntary Tax Return","تقديم الإقرار والتسوية":"Submit Tax Return & Settle",

    // Auctions"تقديم عرض مزايدة أعلى":"Place Higher Bid","شراء فوري مباشر":"Instant Buyout","المزايد الحالي:":"Current Bidder:","العرض الحالي:":"Current Bid:","الشراء الفوري:":"Buyout Price:",

    // Trade & Industry"سجل الصفقات وعقود التوريد الدولية":"International Trade Contracts Log","شحن الصفقة":"Ship Order","تحصيل الأرباح":"Collect Profits","ترقية المستودع":"Upgrade Warehouse","سعة المستودع:":"Warehouse Capacity:","الأرباح المعلقة:":"Pending Profits:","سلسلة الصناعات الثقيلة والإنتاج":"Heavy Industries Supply Chain",

    // Social & Profile"متصل الآن":"Online","غير متصل":"Offline","إضافة صديق":"Add Friend","صديق بالفعل":"Already Friends","حظر اللاعب":"Block Player","عرض عقد وظيفي":"Send Job Offer","دعوة شراكة":"Invite Partner","الملف الشخصي":"Player Profile","الأوسمة والتشريفات":"Honors & Badges","أنت (حسابك)":"You (Your Account)"
  };

  // ─────────────────────────────────────────────
  //  SMART COMPACT CURRENCY FORMATTER & LOCALIZER
  // ─────────────────────────────────────────────
  function getCurrencySymbol() {
    return (window.currentLang ==='en') ?'EGP' :'جنيه';
  }

  function formatCompactNumber(num) {
    if (num === null || num === undefined || isNaN(num)) return'0';
    const val = Number(num);
    const sign = val < 0 ?'-' :'';
    const abs = Math.abs(val);

    if (abs < 10000) {
      return sign + Math.floor(abs).toLocaleString('en-US');
    } else if (abs < 1000000) {
      const k = abs / 1000;
      return sign + (k >= 100 ? k.toFixed(0) : k.toFixed(1)).replace(/\.0$/,'') +'K';
    } else if (abs < 1000000000) {
      const m = abs / 1000000;
      return sign + (m >= 100 ? m.toFixed(1) : m.toFixed(2)).replace(/\.00$/,'').replace(/(\.[1-9])0$/,'$1') +'M';
    } else if (abs < 1000000000000) {
      const b = abs / 1000000000;
      return sign + (b >= 100 ? b.toFixed(1) : b.toFixed(2)).replace(/\.00$/,'').replace(/(\.[1-9])0$/,'$1') +'B';
    } else if (abs < 1000000000000000) {
      const t = abs / 1000000000000;
      return sign + (t >= 100 ? t.toFixed(1) : t.toFixed(2)).replace(/\.00$/,'').replace(/(\.[1-9])0$/,'$1') +'T';
    } else {
      const q = abs / 1000000000000000;
      return sign + q.toFixed(2).replace(/\.00$/,'') +'Q';
    }
  }

  function formatFullCurrency(num) {
    const sym = getCurrencySymbol();
    if (num === null || num === undefined || isNaN(num)) return`0 ${sym}`;
    return Number(num).toLocaleString('en-US') +'' + sym;
  }

  function translateDOM(root = document.body) {
    if (!root) return;
    const isEn = (window.currentLang ==='en');

    // Recursively walk text nodes
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while (node = walker.nextNode()) {
      let val = node.nodeValue;
      if (!val) continue;

      if (isEn) {
        if (val.includes('جنيه/ساعة') || val.includes('جنيه/س')) {
          val = val.replaceAll(/جنيه\s*\/\s*(ساعة|س)/g,'EGP/hr');
        }
        if (val.includes('جنيه/دورة')) {
          val = val.replaceAll('جنيه/دورة','EGP/cycle');
        }
        if (val.includes('جنيه/وحدة')) {
          val = val.replaceAll('جنيه/وحدة','EGP/unit');
        }
        if (val.includes('جنيه/ثانية')) {
          val = val.replaceAll('جنيه/ثانية','EGP/sec');
        }
        if (val.includes('جنيه')) {
          val = val.replaceAll('جنيه','EGP');
        }
        if (val.includes('ج.م')) {
          val = val.replaceAll('ج.م','EGP');
        }
        const trimmed = val.trim();
        if (trimmed && translationDict[trimmed]) {
          val = val.replace(trimmed, translationDict[trimmed]);
        } else if (trimmed && /[\u0600-\u06FF]/.test(val)) {
          for (const [arKey, enVal] of Object.entries(translationDict)) {
            if (val.includes(arKey)) {
              val = val.replaceAll(arKey, enVal);
            }
          }
        }
      } else {
        // Arabic mode: ensure all rogue EGP occurrences are converted to جنيه
        if (val.includes('EGP/ساعة') || val.includes('EGP / ساعة') || val.includes('EGP/hr') || val.includes('EGP / hr')) {
          val = val.replaceAll(/EGP\s*\/\s*(ساعة|hr|س)/gi,'جنيه/ساعة');
        }
        if (val.includes('EGP/دورة') || val.includes('EGP / دورة') || val.includes('EGP/cycle') || val.includes('EGP / cycle')) {
          val = val.replaceAll(/EGP\s*\/\s*(دورة|cycle)/gi,'جنيه/دورة');
        }
        if (val.includes('EGP/وحدة') || val.includes('EGP / وحدة') || val.includes('EGP/unit') || val.includes('EGP / unit')) {
          val = val.replaceAll(/EGP\s*\/\s*(وحدة|unit)/gi,'جنيه/وحدة');
        }
        if (val.includes('EGP/ثانية') || val.includes('EGP / ثانية') || val.includes('EGP/sec') || val.includes('EGP / sec')) {
          val = val.replaceAll(/EGP\s*\/\s*(ثانية|sec)/gi,'جنيه/ثانية');
        }
        if (val.includes('EGP/س') || val.includes('EGP / س')) {
          val = val.replaceAll(/EGP\s*\/\s*س/gi,'جنيه/س');
        }
        if (val.includes('EGP')) {
          val = val.replaceAll('EGP','جنيه');
        }
      }

      if (node.nodeValue !== val) {
        node.nodeValue = val;
      }
    }

    // Translate input placeholders, titles, values
    const elements = root.querySelectorAll('[placeholder], [title], input[type="button"], input[type="submit"]');
    elements.forEach(el => {
      const ph = el.getAttribute('placeholder');
      if (ph) {
        let newPh = ph;
        if (isEn) {
          if (translationDict[ph.trim()]) newPh = translationDict[ph.trim()];
          else if (newPh.includes('جنيه')) newPh = newPh.replaceAll('جنيه','EGP');
        } else {
          if (newPh.includes('EGP')) newPh = newPh.replaceAll('EGP','جنيه');
        }
        if (newPh !== ph) el.setAttribute('placeholder', newPh);
      }

      const title = el.getAttribute('title');
      if (title) {
        let newTitle = title;
        if (isEn) {
          if (translationDict[title.trim()]) newTitle = translationDict[title.trim()];
          else if (newTitle.includes('جنيه')) newTitle = newTitle.replaceAll('جنيه','EGP');
        } else {
          if (newTitle.includes('EGP')) newTitle = newTitle.replaceAll('EGP','جنيه');
        }
        if (newTitle !== title) el.setAttribute('title', newTitle);
      }
    });
  }

  // Work shift cooldown state (2.5 seconds)
  let workCooldownActive = false;
  let workCooldownTimer = null;
  const WORK_COOLDOWN_MS = 2500;

  // Overtime shift cooldown state (20 seconds)
  let overtimeCooldownActive = false;
  let overtimeCooldownTimer = null;
  const OVERTIME_COOLDOWN_MS = 20000;

  // Sound FX & Audio System State
  let audioCtx = null;
  let sfxEnabled = localStorage.getItem('rasalmal_sfx_enabled') !=='false';
  let musicEnabled = localStorage.getItem('rasalmal_music_enabled') ==='true';
  let glowEnabled = localStorage.getItem('rasalmal_glow_enabled') !=='false';
  let notificationsEnabled = localStorage.getItem('rasalmal_notifications_enabled') !=='false';
  let coinFlipStreak = 0;
  let ambientOscillator = null;
  let ambientGainNode = null;
  let openSettingsModal = () => {};
  let closeSettingsModal = () => {};

  function applyGlowSetting(enabled) {
    if (typeof document !=='undefined' && document.body) {
      if (enabled) {
        document.body.classList.remove('no-glow');
      } else {
        document.body.classList.add('no-glow');
      }
    }
  }

  function getAudioCtx() {
    if (!audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        audioCtx = new AudioCtx();
      }
    }
    if (audioCtx && audioCtx.state ==='suspended') {
      audioCtx.resume().catch(() => { });
    }
    return audioCtx;
  }

  // Bulletproof Web Audio unlocker for mobile devices (iOS Safari, Android Chrome)
  function _unlockAudioEngine() {
    const ctx = getAudioCtx();
    if (!ctx) return;
    if (ctx.state ==='suspended') {
      ctx.resume().catch(() => { });
    }
    // Play a silent 1-sample buffer to force hardware out of power-save / suspended state
    try {
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
    } catch (e) { }

    if (ctx.state ==='running') {
      const events = ['touchstart','touchend','click','pointerdown','keydown'];
      events.forEach(evt => {
        document.removeEventListener(evt, _unlockAudioEngine, true);
        window.removeEventListener(evt, _unlockAudioEngine, true);
      });
    }
  }

  const _userGestureEvents = ['touchstart','touchend','click','pointerdown','keydown'];
  _userGestureEvents.forEach(evt => {
    document.addEventListener(evt, _unlockAudioEngine, { capture: true, passive: true });
    window.addEventListener(evt, _unlockAudioEngine, { capture: true, passive: true });
  });

  // Re-resume audio when returning from background / phone lock screen
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && audioCtx && audioCtx.state ==='suspended') {
      audioCtx.resume().catch(() => { });
    }
  });

  // ─────────────────────────────────────────────
  //  TOP NOTIFICATIONS (TOAST ENGINE)
  // ─────────────────────────────────────────────
  // ─────────────────────────────────────────────
  //  TOP NOTIFICATIONS (TOAST ENGINE)
  // ─────────────────────────────────────────────
  function showToast(title, message, type ='info', duration = 2400) {
    if (typeof title ==='string') title = title.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/gu,'').trim();
    if (typeof message ==='string') message = message.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/gu,'').trim();
    if (!notificationsEnabled && type !=='error') return;
    const container = document.getElementById('toast-container');
    if (!container) return;

    // Trigger corresponding audio chime
    if (sfxEnabled) {
      if (type ==='success') playMenuSound('success');
      else if (type ==='error') playMenuSound('error');
      else if (type ==='warning') playMenuSound('back');
      else playMenuSound('click');
    }

    // Dynamic translation & currency adjustment
    if (window.currentLang ==='en') {
      if (translationDict[title]) title = translationDict[title];
      if (translationDict[message]) {
        message = translationDict[message];
      } else if (message) {
        for (const [arKey, enVal] of Object.entries(translationDict)) {
          if (message.includes(arKey)) {
            message = message.replaceAll(arKey, enVal);
          }
        }
      }
      if (title) title = title.replaceAll('جنيه','EGP').replaceAll('ج.م','EGP');
      if (message) message = message.replaceAll('جنيه','EGP').replaceAll('ج.م','EGP');
    } else {
      if (title) title = title.replaceAll('EGP','جنيه');
      if (message) message = message.replaceAll('EGP','جنيه');
    }

    // Cap maximum visible toasts to 2 to prevent screen clutter on mobile
    while (container.children.length >= 2) {
      container.lastElementChild?.remove();
    }

    const toast = document.createElement('div');
    toast.className ='pointer-events-auto w-full flex items-center gap-2.5 p-2 sm:p-2.5 px-3 rounded-xl border shadow-xl backdrop-blur-xl transition-all duration-300 transform -translate-y-3 opacity-0 cursor-pointer select-none';

    let borderColor ='border-sky-500/50 shadow-sky-500/10';
    let bgColor ='bg-slate-950/95';
    let iconHtml ='<i class="fa-solid fa-circle-info text-sky-400 text-sm"></i>';
    let titleColor ='text-sky-400';

    if (type ==='success') {
      borderColor ='border-emerald-500/50 shadow-emerald-500/10';
      iconHtml ='<i class="fa-solid fa-circle-check text-emerald-400 text-sm"></i>';
      titleColor ='text-emerald-400';
    } else if (type ==='error') {
      borderColor ='border-rose-500/50 shadow-rose-500/10';
      iconHtml ='<i class="fa-solid fa-circle-xmark text-rose-400 text-sm"></i>';
      titleColor ='text-rose-400';
    } else if (type ==='warning') {
      borderColor ='border-amber-500/50 shadow-amber-500/10';
      iconHtml ='<i class="fa-solid fa-triangle-exclamation text-amber-400 text-sm"></i>';
      titleColor ='text-amber-400';
    }

    borderColor.split(' ').filter(Boolean).forEach(c => toast.classList.add(c));
    bgColor.split(' ').filter(Boolean).forEach(c => toast.classList.add(c));

    toast.innerHTML =`
      <div class="shrink-0">${iconHtml}</div>
      <div class="flex-1 min-w-0">
        <h4 class="text-[11px] sm:text-xs font-black ${titleColor} leading-tight">${title || (window.currentLang ==='en' ?'System Notification' :'إشعار المنظومة')}</h4>
        ${message ?`<p class="text-[10px] sm:text-[11px] text-slate-300 leading-tight mt-0.5 break-words">${message}</p>` :''}
      </div>
      <button class="text-slate-500 hover:text-white transition text-xs shrink-0 px-1 py-0.5">
        <i class="fa-solid fa-xmark"></i>
      </button>`;

    if (typeof translateDOM ==='function') {
      translateDOM(toast);
    }

    let isDismissed = false;
    const dismiss = () => {
      if (isDismissed) return;
      isDismissed = true;
      toast.style.transform ='translateY(-10px) scale(0.96)';
      toast.style.opacity ='0';
      setTimeout(() => {
        if (toast.parentElement) toast.parentElement.removeChild(toast);
      }, 200);
    };

    toast.addEventListener('click', dismiss);
    setTimeout(dismiss, duration);

    container.prepend(toast);

    requestAnimationFrame(() => {
      toast.style.transform ='translateY(0)';
      toast.style.opacity ='1';
    });
  }

  function playMenuSound(type) {
    if (!sfxEnabled) return;
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      if (ctx.state ==='suspended') {
        ctx.resume().catch(() => { });
      }

      if (type ==='hover') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type ='sine';
        osc.frequency.setValueAtTime(1200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1600, ctx.currentTime + 0.035);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.035);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.035);
      } else if (type ==='click') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type ='triangle';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } else if (type ==='start') {
        const freqs = [440, 554.37, 659.25, 880];
        freqs.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type ='triangle';
          osc.frequency.setValueAtTime(f, ctx.currentTime + idx * 0.07);
          gain.gain.setValueAtTime(0.18, ctx.currentTime + idx * 0.07);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.07 + 0.28);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.07);
          osc.stop(ctx.currentTime + idx * 0.07 + 0.28);
        });
      } else if (type ==='success') {
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type ='triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.05);
          gain.gain.setValueAtTime(0.14, ctx.currentTime + idx * 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.05 + 0.2);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.05);
          osc.stop(ctx.currentTime + idx * 0.05 + 0.2);
        });
      } else if (type ==='error') {
        const freqs = [320, 220];
        freqs.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type ='sawtooth';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
          gain.gain.setValueAtTime(0.14, ctx.currentTime + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.16);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.08);
          osc.stop(ctx.currentTime + idx * 0.08 + 0.16);
        });
      } else if (type ==='back') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type ='sine';
        osc.frequency.setValueAtTime(520, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(260, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      } else if (type ==='modal_open') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type ='sine';
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } else if (type ==='modal_close') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type ='sine';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(300, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      }
    } catch (e) { }
  }

  function playCasinoSound(type) {
    if (!sfxEnabled) return;
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      if (ctx.state ==='suspended') {
        ctx.resume().catch(() => { });
      }

      if (type ==='coin') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type ='sine';
        osc.frequency.setValueAtTime(987.77, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1318.51, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else if (type ==='win') {
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type ='triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
          gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.25);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.08);
          osc.stop(ctx.currentTime + idx * 0.08 + 0.25);
        });
      } else if (type ==='jackpot') {
        const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type ='sawtooth';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.07);
          gain.gain.setValueAtTime(0.25, ctx.currentTime + idx * 0.07);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.07 + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.07);
          osc.stop(ctx.currentTime + idx * 0.07 + 0.35);
        });
      } else if (type ==='lose') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type ='sawtooth';
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(140, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else if (type ==='tick') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type ='sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      } else if (type ==='dice') {
        [0, 0.06, 0.12, 0.18].forEach(t => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type ='square';
          osc.frequency.setValueAtTime(300 + Math.random() * 200, ctx.currentTime + t);
          gain.gain.setValueAtTime(0.1, ctx.currentTime + t);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.04);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + t);
          osc.stop(ctx.currentTime + t + 0.04);
        });
      } else if (type ==='card') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type ='sine';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } else if (type ==='siren') {
        [0, 0.25, 0.5, 0.75].forEach((t, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type ='sawtooth';
          const freq = idx % 2 === 0 ? 880 : 660;
          osc.frequency.setValueAtTime(freq, ctx.currentTime + t);
          gain.gain.setValueAtTime(0.12, ctx.currentTime + t);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.22);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + t);
          osc.stop(ctx.currentTime + t + 0.22);
        });
      } else if (type ==='fail') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type ='sawtooth';
        osc.frequency.setValueAtTime(180, ctx.currentTime);
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch (e) { }
  }

  function setAmbientMusicState(enabled) {
    musicEnabled = enabled;
    localStorage.setItem('rasalmal_music_enabled', enabled ?'true' :'false');
    try {
      if (!enabled) {
        if (ambientOscillator) {
          ambientOscillator.stop();
          ambientOscillator.disconnect();
          ambientOscillator = null;
        }
        return;
      }
      const ctx = getAudioCtx();
      if (!ctx) return;
      if (ambientOscillator) return; // Already running

      ambientOscillator = ctx.createOscillator();
      ambientGainNode = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      ambientOscillator.type ='sine';
      ambientOscillator.frequency.setValueAtTime(110, ctx.currentTime); // A2 deep drone

      filter.type ='lowpass';
      filter.frequency.setValueAtTime(320, ctx.currentTime);

      ambientGainNode.gain.setValueAtTime(0.03, ctx.currentTime);

      ambientOscillator.connect(filter);
      filter.connect(ambientGainNode);
      ambientGainNode.connect(ctx.destination);
      ambientOscillator.start();
    } catch (e) { }
  }

  // Crash game state variables
  let crashBetAmount = 0;
  let crashMultiplier = 1.0;
  let crashLastMultiplier = 1.0;
  let crashState ='idle'; //'idle','running','cashed_out','crashed'
  let crashAnimationId = null;
  let crashStartTime = 0;

  // UI Setup & Bindings
  async function init() {
    applyGlowSetting(glowEnabled);
    setupStartMenu();
    setupAuthPanel();
    setupNavigation();
    setupEventListeners();
    setupAdminModal();

    translateDOM(document.body);
    if (window.currentLang ==='en') {
      document.querySelectorAll('.lang-ar-guide').forEach(el => el.classList.add('hidden'));
      document.querySelectorAll('.lang-en-guide').forEach(el => el.classList.remove('hidden'));
    } else {
      document.querySelectorAll('.lang-ar-guide').forEach(el => el.classList.remove('hidden'));
      document.querySelectorAll('.lang-en-guide').forEach(el => el.classList.add('hidden'));
    }

    // Refresh Start Menu player prestige card
    await refreshStartMenuCard();
  }

  // --- Start Menu Controller & Particle Generator ---
  function setupStartMenu() {
    initStartMenuParticles();

    // 1. Continue Button
    const continueBtn = document.getElementById('btn-menu-continue');
    if (continueBtn) {
      continueBtn.addEventListener('click', async () => {
        const isMaint = await checkMaintenanceMode();
        if (isMaint) return;
        const savedUser = localStorage.getItem('rasalmal_active_session_user');
        if (savedUser) {
          playMenuSound('start');
          await launchGameSession(savedUser);
        } else {
          showAuthModal('login');
        }
      });
    }

    // 2. New Game Button
    const newGameBtn = document.getElementById('btn-menu-newgame');
    if (newGameBtn) {
      newGameBtn.addEventListener('click', async () => {
        const isMaint = await checkMaintenanceMode();
        if (isMaint) return;
        playMenuSound('click');
        showAuthModal('register');
      });
    }

    // 3. Login / Switch Button
    const loginBtn = document.getElementById('btn-menu-login');
    if (loginBtn) {
      loginBtn.addEventListener('click', async () => {
        const isMaint = await checkMaintenanceMode();
        if (isMaint) return;
        playMenuSound('click');
        showAuthModal('login');
      });
    }

    const switchCardBtn = document.getElementById('btn-start-card-switch');
    if (switchCardBtn) {
      switchCardBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const isMaint = await checkMaintenanceMode();
        if (isMaint) return;
        playMenuSound('click');
        showAuthModal('login');
      });
    }

    // 4. Hall of Fame / Leaderboard Modal in Start Menu
    const menuLeaderboardBtn = document.getElementById('btn-menu-leaderboard');
    const startLeaderboardModal = document.getElementById('start-menu-leaderboard-modal');
    const closeLeaderboardBtn = document.getElementById('btn-close-menu-leaderboard');
    const refreshStartLdBtn = document.getElementById('btn-refresh-start-leaderboard');

    if (menuLeaderboardBtn && startLeaderboardModal) {
      menuLeaderboardBtn.addEventListener('click', () => {
        playMenuSound('modal_open');
        startLeaderboardModal.classList.remove('hidden');
        renderStartMenuLeaderboard();
      });
    }

    if (closeLeaderboardBtn && startLeaderboardModal) {
      closeLeaderboardBtn.addEventListener('click', () => {
        playMenuSound('modal_close');
        startLeaderboardModal.classList.add('hidden');
      });
    }

    if (refreshStartLdBtn) {
      refreshStartLdBtn.addEventListener('click', () => {
        playMenuSound('click');
        renderStartMenuLeaderboard(true);
      });
    }

    // 5. Tycoon Guide Modal (Dual-Mode: Detailed Master Guide & Compact Quick Guide)
    const menuGuideBtn = document.getElementById('btn-menu-guide');
    const inGameGuideBtn = document.getElementById('btn-ingame-guide');
    const inGameGuideMobileBtn = document.getElementById('btn-ingame-guide-mobile');
    const startGuideModal = document.getElementById('start-menu-guide-modal');
    const closeGuideBtn = document.getElementById('btn-close-menu-guide');
    const guidePlayBtn = document.getElementById('btn-guide-start-playing');

    const tabDetailedBtn = document.getElementById('btn-guide-tab-detailed');
    const tabCompactBtn = document.getElementById('btn-guide-tab-compact');
    const viewDetailed = document.getElementById('guide-view-detailed');
    const viewCompact = document.getElementById('guide-view-compact');

    const openGuideModal = () => {
      playMenuSound('modal_open');
      if (startGuideModal) startGuideModal.classList.remove('hidden');
    };

    if (menuGuideBtn) menuGuideBtn.addEventListener('click', openGuideModal);
    if (inGameGuideBtn) inGameGuideBtn.addEventListener('click', openGuideModal);
    if (inGameGuideMobileBtn) inGameGuideMobileBtn.addEventListener('click', openGuideModal);

    if (tabDetailedBtn && tabCompactBtn && viewDetailed && viewCompact) {
      tabDetailedBtn.addEventListener('click', () => {
        playMenuSound('click');
        viewDetailed.classList.remove('hidden');
        viewCompact.classList.add('hidden');
        tabDetailedBtn.className ='flex-1 py-2 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-500 to-amber-600 text-slate-950 shadow-md';
        tabCompactBtn.className ='flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800';
      });

      tabCompactBtn.addEventListener('click', () => {
        playMenuSound('click');
        viewCompact.classList.remove('hidden');
        viewDetailed.classList.add('hidden');
        tabCompactBtn.className ='flex-1 py-2 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md';
        tabDetailedBtn.className ='flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800';
      });
    }

    if (closeGuideBtn && startGuideModal) {
      closeGuideBtn.addEventListener('click', () => {
        playMenuSound('modal_close');
        startGuideModal.classList.add('hidden');
      });
    }

    if (guidePlayBtn && startGuideModal) {
      guidePlayBtn.addEventListener('click', () => {
        playMenuSound('click');
        startGuideModal.classList.add('hidden');
        const savedUser = localStorage.getItem('rasalmal_active_session_user');
        if (savedUser) {
          launchGameSession(savedUser);
        } else {
          showAuthModal('register');
        }
      });
    }

    // 6. Settings Modal in Start Menu
    const menuSettingsBtn = document.getElementById('btn-menu-settings');
    const startSettingsModal = document.getElementById('start-menu-settings-modal');
    const closeSettingsBtn = document.getElementById('btn-close-menu-settings');
    const saveSettingsBtn = document.getElementById('btn-save-settings');
    const testSoundBtn = document.getElementById('btn-settings-test-sound');
    const sfxToggle = document.getElementById('setting-sfx-toggle');
    const musicToggle = document.getElementById('setting-music-toggle');
    const glowToggle = document.getElementById('setting-glow-toggle');
    const notificationsToggle = document.getElementById('setting-notifications-toggle');
    const inGameSettingsBtn = document.getElementById('btn-ingame-settings');
    const inGameSettingsMobileBtn = document.getElementById('btn-ingame-settings-mobile');
    const menuSoundBtn = document.getElementById('btn-menu-sound-toggle');
    const menuSoundIcon = document.getElementById('menu-sound-icon');
    const fullscreenBtn = document.getElementById('btn-menu-fullscreen');

    applyGlowSetting(glowEnabled);

    if (sfxToggle) sfxToggle.checked = sfxEnabled;
    if (musicToggle) musicToggle.checked = musicEnabled;
    if (glowToggle) glowToggle.checked = glowEnabled;
    if (notificationsToggle) notificationsToggle.checked = notificationsEnabled;
    updateSoundIconState();

    openSettingsModal = () => {
      // Close mobile drawer if open
      const mobileDrawer = document.getElementById('mobile-nav-drawer');
      if (mobileDrawer) mobileDrawer.classList.add('hidden');

      playMenuSound('modal_open');
      if (sfxToggle) sfxToggle.checked = sfxEnabled;
      if (musicToggle) musicToggle.checked = musicEnabled;
      if (glowToggle) glowToggle.checked = glowEnabled;
      if (notificationsToggle) notificationsToggle.checked = notificationsEnabled;
      if (startSettingsModal) startSettingsModal.classList.remove('hidden');
    };

    closeSettingsModal = () => {
      playMenuSound('modal_close');
      if (startSettingsModal) startSettingsModal.classList.add('hidden');
    };

    if (menuSettingsBtn && startSettingsModal) {
      menuSettingsBtn.addEventListener('click', openSettingsModal);
    }
    if (inGameSettingsBtn && startSettingsModal) {
      inGameSettingsBtn.addEventListener('click', openSettingsModal);
    }
    if (inGameSettingsMobileBtn && startSettingsModal) {
      inGameSettingsMobileBtn.addEventListener('click', openSettingsModal);
    }

    if (closeSettingsBtn && startSettingsModal) {
      closeSettingsBtn.addEventListener('click', closeSettingsModal);
    }

    if (startSettingsModal) {
      startSettingsModal.addEventListener('click', (e) => {
        if (e.target === startSettingsModal) {
          closeSettingsModal();
        }
      });
    }

    // Live reactive toggles
    if (sfxToggle) {
      sfxToggle.addEventListener('change', () => {
        sfxEnabled = sfxToggle.checked;
        localStorage.setItem('rasalmal_sfx_enabled', sfxEnabled ?'true' :'false');
        updateSoundIconState();
        if (sfxEnabled) playMenuSound('click');
      });
    }

    if (musicToggle) {
      musicToggle.addEventListener('change', () => {
        setAmbientMusicState(musicToggle.checked);
      });
    }

    if (glowToggle) {
      glowToggle.addEventListener('change', () => {
        glowEnabled = glowToggle.checked;
        localStorage.setItem('rasalmal_glow_enabled', glowEnabled ?'true' :'false');
        applyGlowSetting(glowEnabled);
      });
    }

    if (notificationsToggle) {
      notificationsToggle.addEventListener('change', () => {
        notificationsEnabled = notificationsToggle.checked;
        localStorage.setItem('rasalmal_notifications_enabled', notificationsEnabled ?'true' :'false');
        if (notificationsEnabled) {
          showToast('تنبيهات النظام','تم تفعيل الإشعارات بنجاح.','info', 1800);
        }
      });
    }

    if (saveSettingsBtn && startSettingsModal) {
      saveSettingsBtn.addEventListener('click', () => {
        playMenuSound('click');
        sfxEnabled = sfxToggle ? sfxToggle.checked : sfxEnabled;
        localStorage.setItem('rasalmal_sfx_enabled', sfxEnabled ?'true' :'false');
        if (musicToggle) setAmbientMusicState(musicToggle.checked);
        glowEnabled = glowToggle ? glowToggle.checked : glowEnabled;
        localStorage.setItem('rasalmal_glow_enabled', glowEnabled ?'true' :'false');
        applyGlowSetting(glowEnabled);
        if (notificationsToggle) {
          notificationsEnabled = notificationsToggle.checked;
          localStorage.setItem('rasalmal_notifications_enabled', notificationsEnabled ?'true' :'false');
        }
        updateSoundIconState();
        closeSettingsModal();
        showToast('تم حفظ الإعدادات','تم تحديث تفضيلات الصوت والمؤثرات بنجاح.','success');
      });
    }

    if (testSoundBtn) {
      testSoundBtn.addEventListener('click', () => {
        try {
          const ctx = getAudioCtx();
          if (ctx && ctx.state ==='suspended') ctx.resume();
        } catch (e) {}
        const prev = sfxEnabled;
        sfxEnabled = true;
        playMenuSound('start');
        sfxEnabled = prev;
      });
    }

    if (menuSoundBtn) {
      menuSoundBtn.addEventListener('click', () => {
        sfxEnabled = !sfxEnabled;
        localStorage.setItem('rasalmal_sfx_enabled', sfxEnabled ?'true' :'false');
        if (sfxToggle) sfxToggle.checked = sfxEnabled;
        updateSoundIconState();
        if (sfxEnabled) playMenuSound('click');
      });
    }

    if (fullscreenBtn) {
      fullscreenBtn.addEventListener('click', () => {
        playMenuSound('click');
        toggleFullscreen();
      });
    }

    // Language Toggle Buttons Binding (New)
    const langToggleBtn = document.getElementById('btn-lang-toggle');
    if (langToggleBtn) {
      langToggleBtn.textContent = currentLang ==='ar' ?'EN' :'العربية';
      langToggleBtn.addEventListener('click', () => {
        playMenuSound('click');
        const nextLang = currentLang ==='ar' ?'en' :'ar';
        localStorage.setItem('game_lang', nextLang);
        location.reload();
      });
    }

    const langToggleIngameBtn = document.getElementById('btn-lang-toggle-ingame');
    if (langToggleIngameBtn) {
      langToggleIngameBtn.querySelector('span').textContent = currentLang ==='ar' ?'Language: English' :'اللغة: العربية';
      langToggleIngameBtn.addEventListener('click', () => {
        playMenuSound('click');
        const nextLang = currentLang ==='ar' ?'en' :'ar';
        localStorage.setItem('game_lang', nextLang);
        location.reload();
      });
    }

    const langToggleMobileBtn = document.getElementById('btn-lang-toggle-mobile');
    if (langToggleMobileBtn) {
      langToggleMobileBtn.querySelector('span').textContent = currentLang ==='ar' ?'EN' :'العربية';
      langToggleMobileBtn.addEventListener('click', () => {
        playMenuSound('click');
        const nextLang = currentLang ==='ar' ?'en' :'ar';
        localStorage.setItem('game_lang', nextLang);
        location.reload();
      });
    }

    // 7. In-game Return to Start Menu Buttons
    const openMenuSidebarBtn = document.getElementById('btn-open-start-menu');
    const openMenuMobileBtn = document.getElementById('btn-open-start-menu-mobile');

    if (openMenuSidebarBtn) {
      openMenuSidebarBtn.addEventListener('click', () => {
        playMenuSound('back');
        returnToStartMenu();
      });
    }

    if (openMenuMobileBtn) {
      openMenuMobileBtn.addEventListener('click', () => {
        playMenuSound('back');
        returnToStartMenu();
      });
    }

    // 8. Auth Back Buttons
    const authBackBtn = document.getElementById('btn-auth-back-to-menu');
    const authCancelBtn = document.getElementById('btn-auth-cancel-bottom');

    if (authBackBtn) {
      authBackBtn.addEventListener('click', () => {
        playMenuSound('back');
        closeAuthModal();
      });
    }
    if (authCancelBtn) {
      authCancelBtn.addEventListener('click', () => {
        playMenuSound('back');
        closeAuthModal();
      });
    }

    // Add sound triggers on all menu buttons
    document.querySelectorAll('.menu-btn-game, .menu-btn-sub, .start-menu-icon-btn').forEach(btn => {
      btn.addEventListener('mouseenter', () => playMenuSound('hover'));
    });

    // Global ESC handler
    window.addEventListener('keydown', (e) => {
      if (e.key ==='Escape') {
        const modals = [
          document.getElementById('start-menu-leaderboard-modal'),
          document.getElementById('start-menu-guide-modal'),
          document.getElementById('start-menu-settings-modal'),
          document.getElementById('auth-screen')
        ];
        let modalClosed = false;
        modals.forEach(m => {
          if (m && !m.classList.contains('hidden')) {
            m.classList.add('hidden');
            modalClosed = true;
          }
        });
        if (!modalClosed) {
          const startMenu = document.getElementById('start-menu-screen');
          const mainLayout = document.getElementById('main-game-layout');
          if (mainLayout && !mainLayout.classList.contains('hidden')) {
            returnToStartMenu();
          } else if (startMenu && !startMenu.classList.contains('hidden')) {
            const savedUser = localStorage.getItem('rasalmal_active_session_user');
            if (savedUser && GameEngine.state) {
              launchGameSession(savedUser);
            }
          }
        }
      }
    });
  }

  function initStartMenuParticles() {
    const container = document.getElementById('start-menu-particles');
    if (!container) return;
    container.innerHTML ='';
    const symbols = ['','','','','️','','',''];
    const particleCount = 18;

    for (let i = 0; i < particleCount; i++) {
      const p = document.createElement('div');
      p.className ='menu-particle';
      p.textContent = symbols[Math.floor(Math.random() * symbols.length)];
      p.style.left =`${Math.random() * 96}%`;
      p.style.fontSize =`${12 + Math.random() * 16}px`;
      p.style.animationDelay =`${Math.random() * 9}s`;
      p.style.animationDuration =`${7 + Math.random() * 7}s`;
      container.appendChild(p);
    }
  }

  function updateSoundIconState() {
    const icon = document.getElementById('menu-sound-icon');
    if (icon) {
      icon.className = sfxEnabled ?'fa-solid fa-volume-high text-sm' :'fa-solid fa-volume-xmark text-sm text-rose-400';
    }
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => { });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => { });
      }
    }
  }

  async function refreshStartMenuCard() {
    const savedUser = localStorage.getItem('rasalmal_active_session_user');
    const playerCard = document.getElementById('start-menu-player-card');
    const continueBtn = document.getElementById('btn-menu-continue');

    if (!savedUser) {
      if (playerCard) playerCard.classList.add('hidden');
      if (continueBtn) continueBtn.classList.add('hidden');
      return;
    }

    try {
      let state = GameEngine.state;
      if (!state || GameEngine.activeUsername !== savedUser) {
        state = await AppDB.getPlayerState(savedUser);
      }
      if (state) {
        const nameEl = document.getElementById('start-card-username');
        const titleEl = document.getElementById('start-card-title');
        const worthEl = document.getElementById('start-card-worth');
        const avatarEl = document.getElementById('start-card-avatar');

        if (nameEl) nameEl.textContent = savedUser;
        if (titleEl) titleEl.textContent = state.title ||'مستثمر صاعد';
        if (worthEl) worthEl.textContent =`${(state.netWorth || (state.cash + state.bank) || 0).toLocaleString()} EGP`;
        if (avatarEl) avatarEl.textContent = (savedUser.substring(0, 2)).toUpperCase();

        if (playerCard) playerCard.classList.remove('hidden');
        if (continueBtn) continueBtn.classList.remove('hidden');
      }
    } catch (err) {
      console.warn('[Start Menu] Failed to load cached player card:', err);
    }
  }

  async function launchGameSession(username) {
    try {
      // Check maintenance mode on session launch
      const isMaint = await checkMaintenanceMode();
      if (isMaint) return;

      const playerState = await GameEngine.loadUserSession(username);
      const canonicalUser = (playerState && playerState.username) ? playerState.username : username;
      localStorage.setItem('rasalmal_active_session_user', canonicalUser);

      window._sessionInitTimestamp = Date.now();
      window._processedTransferMailIds = new Set();
      const mainLayout = document.getElementById('main-game-layout');
      document.getElementById('start-menu-screen').classList.add('hidden');
      document.getElementById('auth-screen').classList.add('hidden');
      hideMaintenanceOverlay();
      if (mainLayout) {
        mainLayout.classList.remove('hidden');
        mainLayout.classList.add('flex');
      }
      setupRealTimeListeners(canonicalUser);
      AppDB.checkAndCreateDailyBackup(canonicalUser, GameEngine.state);
      startGameLoop();
      renderAll();
      showToast('أهلاً بعودتك',`تم استئناف جلسة الإمبراطور: ${canonicalUser}`,'success');

      // Check and display offline idle earnings with 12-Hour Manager context
      if (playerState && playerState.offlineReport) {
        const rep = playerState.offlineReport;
        const mins = Math.max(1, Math.round(rep.seconds / 60));
        setTimeout(() => {
          if (rep.earnings > 0) {
            showToast(' أرباح أثناء غيابك!',`جمعت إمبراطوريتك +${rep.earnings.toLocaleString()} EGP أثناء غيابك (${mins} دقيقة) بفضل ترخيص الإدارة الذاتية!`,'success');
          } else if (rep.expiredDuringAbsence) {
            showToast('️ تنبيه الإدارة الذاتية','انتهت صلاحية ترخيص الـ 12 ساعة أثناء غيابك! يرجى الضغط على زر التجديد لمواصلة جمع الأرباح عند الخروج.','warning');
          }
        }, 1200);
        delete playerState.offlineReport;
      }
    } catch (err) {
      showToast('خطأ في التحميل', err.message,'error');
      localStorage.removeItem('rasalmal_active_session_user');
      refreshStartMenuCard();
    }
  }

  function returnToStartMenu() {
    refreshStartMenuCard();
    document.getElementById('start-menu-screen').classList.remove('hidden');
    const mainLayout = document.getElementById('main-game-layout');
    if (mainLayout) {
      mainLayout.classList.add('hidden');
      mainLayout.classList.remove('flex');
    }
    document.getElementById('auth-screen').classList.add('hidden');
  }

  let currentAuthMode ='login'; // Shared state across auth triggers
  let isAuthSubmitting = false;

  function showAuthModal(mode ='login') {
    currentAuthMode = mode;
    const authScreen = document.getElementById('auth-screen');
    const authRegBtn = document.getElementById('auth-switch-reg');
    const authLoginBtn = document.getElementById('auth-switch-login');
    const authModeTitle = document.getElementById('auth-mode-title');
    const authActionBtn = document.getElementById('auth-action-text');

    if (mode ==='register') {
      if (authModeTitle) authModeTitle.textContent ='تسجيل حساب جديد';
      if (authActionBtn) authActionBtn.textContent ='إنشاء حساب وبدء اللعب';
      if (authRegBtn) authRegBtn.classList.add('border-yellow-500','text-yellow-500');
      if (authLoginBtn) authLoginBtn.classList.remove('border-yellow-500','text-yellow-500');
    } else {
      if (authModeTitle) authModeTitle.textContent ='تسجيل الدخول للمحفظة';
      if (authActionBtn) authActionBtn.textContent ='دخول وتزامن الحساب';
      if (authLoginBtn) authLoginBtn.classList.add('border-yellow-500','text-yellow-500');
      if (authRegBtn) authRegBtn.classList.remove('border-yellow-500','text-yellow-500');
    }

    if (authScreen) {
      authScreen.classList.remove('hidden');
      document.getElementById('start-menu-screen').classList.add('hidden');
    }
  }

  function closeAuthModal() {
    const authScreen = document.getElementById('auth-screen');
    if (authScreen) authScreen.classList.add('hidden');
    document.getElementById('start-menu-screen').classList.remove('hidden');
  }

  async function renderStartMenuLeaderboard(forceRefresh = false) {
    const tbody = document.getElementById('start-menu-leaderboard-rows');
    if (!tbody) return;
    tbody.innerHTML =`
      <tr>
        <td colspan="4" class="py-6 text-center text-slate-400">
          <i class="fa-solid fa-spinner animate-spin ml-2"></i>
          جاري جلب أحدث بيانات المتصدرين...
        </td>
      </tr>`;

    try {
      const players = await AppDB.getLeaderboard(forceRefresh);
      tbody.innerHTML ='';
      if (typeof updateHourlyLeaderboardTimerUI ==='function') updateHourlyLeaderboardTimerUI();

      if (!players || players.length === 0) {
        tbody.innerHTML =`<tr><td colspan="4" class="py-6 text-center text-slate-500">لا يوجد متصدرين مسجلين حالياً.</td></tr>`;
        return;
      }

      // Podium Top 3
      const top1 = players[0];
      const top2 = players[1];
      const top3 = players[2];

      if (top1) {
        document.getElementById('start-podium-name-1').textContent = top1.username;
        const w1 = document.getElementById('start-podium-worth-1');
        if (w1) {
          w1.textContent =`${formatCompactNumber(top1.netWorth || 0)} EGP`;
          w1.title =`${Number(top1.netWorth || 0).toLocaleString()} EGP`;
        }
      }
      if (top2) {
        document.getElementById('start-podium-name-2').textContent = top2.username;
        const w2 = document.getElementById('start-podium-worth-2');
        if (w2) {
          w2.textContent =`${formatCompactNumber(top2.netWorth || 0)} EGP`;
          w2.title =`${Number(top2.netWorth || 0).toLocaleString()} EGP`;
        }
      }
      if (top3) {
        document.getElementById('start-podium-name-3').textContent = top3.username;
        const w3 = document.getElementById('start-podium-worth-3');
        if (w3) {
          w3.textContent =`${formatCompactNumber(top3.netWorth || 0)} EGP`;
          w3.title =`${Number(top3.netWorth || 0).toLocaleString()} EGP`;
        }
      }

      // Rows
      players.slice(0, 15).forEach((p, idx) => {
        const tr = document.createElement('tr');
        const rank = idx + 1;
        const initials = (p.username ||'P').substring(0, 2).toUpperCase();
        tr.className =`transition duration-150 border-b border-slate-900/60 ${rank === 1 ?'bg-yellow-500/10' :'hover:bg-slate-900/50'}`;

        let rankBadge ='';
        if (rank === 1) {
          rankBadge =`<span class="w-6 h-6 rounded-lg bg-gradient-to-r from-yellow-500 to-amber-500 text-slate-950 font-black text-[10px] flex items-center justify-center shadow"><i class="fa-solid fa-crown text-[9px] mr-0.5"></i>1</span>`;
        } else if (rank === 2) {
          rankBadge =`<span class="w-6 h-6 rounded-lg bg-slate-700 border border-slate-500 text-slate-200 font-black text-[10px] flex items-center justify-center"><i class="fa-solid fa-medal text-[9px] mr-0.5"></i>2</span>`;
        } else if (rank === 3) {
          rankBadge =`<span class="w-6 h-6 rounded-lg bg-amber-950 border border-amber-700 text-amber-300 font-black text-[10px] flex items-center justify-center"><i class="fa-solid fa-medal text-[9px] mr-0.5"></i>3</span>`;
        } else {
          rankBadge =`<span class="text-slate-400 font-bold numbers-font text-xs">#${rank}</span>`;
        }

        tr.innerHTML =`
          <td class="py-2.5 pr-2 text-right">${rankBadge}</td>
          <td class="py-2.5">
            <div class="flex items-center gap-2">
              <div class="w-6 h-6 rounded bg-slate-800 border border-slate-700 text-[9px] font-black text-slate-300 flex items-center justify-center numbers-font">
                ${initials}
              </div>
              <span class="font-black ${rank === 1 ?'text-yellow-400 glow-gold' :'text-white'} text-xs truncate max-w-[110px] sm:max-w-none">${p.username}</span>
            </div>
          </td>
          <td class="py-2.5 text-slate-400">
            <span class="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-300 inline-block truncate max-w-[90px] sm:max-w-none">${p.title ||'مستثمر'}</span>
          </td>
          <td class="py-2.5 pl-2 text-left numbers-font font-black ${rank === 1 ?'text-yellow-400 text-xs glow-gold' :'text-emerald-400 text-xs'} whitespace-nowrap" title="${Number(p.netWorth || 0).toLocaleString()} EGP">
            ${formatCompactNumber(p.netWorth || 0)} EGP
          </td>`;
        tbody.appendChild(tr);
      });
    } catch (e) {
      tbody.innerHTML =`<tr><td colspan="4" class="py-6 text-center text-rose-400">تعذر تحميل المتصدرين. تحقق من اتصالك.</td></tr>`;
    }
  }

  function setupAuthPanel() {
    const authSubmitBtn = document.getElementById('auth-submit');
    const authRegBtn = document.getElementById('auth-switch-reg');
    const authLoginBtn = document.getElementById('auth-switch-login');
    const authModeTitle = document.getElementById('auth-mode-title');
    const authActionBtn = document.getElementById('auth-action-text');

    if (authRegBtn) {
      authRegBtn.addEventListener('click', () => {
        playMenuSound('click');
        currentAuthMode ='register';
        if (authModeTitle) authModeTitle.textContent ='تسجيل حساب جديد';
        if (authActionBtn) authActionBtn.textContent ='إنشاء حساب وبدء اللعب';
        authRegBtn.classList.add('border-yellow-500','text-yellow-500');
        authLoginBtn.classList.remove('border-yellow-500','text-yellow-500');
      });
    }

    if (authLoginBtn) {
      authLoginBtn.addEventListener('click', () => {
        playMenuSound('click');
        currentAuthMode ='login';
        if (authModeTitle) authModeTitle.textContent ='تسجيل الدخول للمحفظة';
        if (authActionBtn) authActionBtn.textContent ='دخول وتزامن الحساب';
        authLoginBtn.classList.add('border-yellow-500','text-yellow-500');
        authRegBtn.classList.remove('border-yellow-500','text-yellow-500');
      });
    }

    if (authSubmitBtn) {
      authSubmitBtn.addEventListener('click', async () => {
        if (isAuthSubmitting) return; // Prevent concurrent duplicate submissions

        const usernameInput = document.getElementById('auth-username').value.trim();
        const pinInput = document.getElementById('auth-pin').value.trim();

        if (!usernameInput || !pinInput) {
          showToast('خطأ','يرجى ملء جميع الحقول للمتابعة.','error');
          playMenuSound('back');
          return;
        }

        try {
          isAuthSubmitting = true;
          setAuthLoading(true);



          let playerState;

          let canonicalUser = usernameInput;
          if (currentAuthMode ==='register') {
            await AppDB.registerPlayer(usernameInput, pinInput);
            playerState = await GameEngine.loadUserSession(usernameInput);
            localStorage.setItem('rasalmal_active_session_user', usernameInput);
            showToast('نجاح','تم تسجيل حسابك الجديد بنجاح! مرحباً بك.','success');
          } else {
            const loggedUser = await AppDB.loginPlayer(usernameInput, pinInput);
            canonicalUser = (loggedUser && loggedUser.username) ? loggedUser.username : usernameInput;
            playerState = await GameEngine.loadUserSession(canonicalUser, loggedUser);
            localStorage.setItem('rasalmal_active_session_user', canonicalUser);
            showToast('أهلاً بك',`تم تحميل بيانات الحساب: ${canonicalUser}`,'success');
          }

          playMenuSound('start');

          // Hide auth screen, start menu & maintenance overlay, show game
          hideMaintenanceOverlay();
          document.getElementById('auth-screen').classList.add('hidden');
          document.getElementById('start-menu-screen').classList.add('hidden');
          const mainLayout = document.getElementById('main-game-layout');
          if (mainLayout) {
            mainLayout.classList.remove('hidden');
            mainLayout.classList.add('flex');
          }

          setupRealTimeListeners(canonicalUser);

          startGameLoop();
          renderAll();

          // Check and display offline idle earnings with 12-Hour Manager context
          if (playerState && playerState.offlineReport) {
            const rep = playerState.offlineReport;
            const mins = Math.max(1, Math.round(rep.seconds / 60));
            setTimeout(() => {
              if (rep.earnings > 0) {
                showToast(' أرباح أثناء غيابك!',`جمعت إمبراطوريتك +${rep.earnings.toLocaleString()} EGP أثناء غيابك (${mins} دقيقة) بفضل ترخيص الإدارة الذاتية!`,'success');
              } else if (rep.expiredDuringAbsence) {
                showToast('️ تنبيه الإدارة الذاتية','انتهت صلاحية ترخيص الـ 12 ساعة أثناء غيابك! يرجى الضغط على زر التجديد لمواصلة جمع الأرباح عند الخروج.','warning');
              }
            }, 1200);
            delete playerState.offlineReport;
          }
        } catch (err) {
          showToast('فشل التحقق', err.message,'error');
          playMenuSound('back');
        } finally {
          isAuthSubmitting = false;
          setAuthLoading(false);
        }
      });
    }
  }

  function setAuthLoading(loading) {
    const btn = document.getElementById('auth-submit');
    const text = document.getElementById('auth-action-text');
    const spinner = document.getElementById('auth-spinner');
    if (loading) {
      btn.disabled = true;
      text.classList.add('hidden');
      spinner.classList.remove('hidden');
    } else {
      btn.disabled = false;
      text.classList.remove('hidden');
      spinner.classList.add('hidden');
    }
  }

  // --- Navigation Controls & Mobile Drawer ---
  function openMobileNav() {
    const drawer = document.getElementById('mobile-nav-drawer');
    if (!drawer) return;
    drawer.classList.remove('hidden');
    void drawer.offsetWidth;
    drawer.classList.add('open');
    document.body.classList.add('overflow-hidden');
  }

  function closeMobileNav() {
    const drawer = document.getElementById('mobile-nav-drawer');
    if (!drawer || !drawer.classList.contains('open')) return;
    drawer.classList.remove('open');
    document.body.classList.remove('overflow-hidden');
    setTimeout(() => {
      if (!drawer.classList.contains('open')) {
        drawer.classList.add('hidden');
      }
    }, 280);
  }

  function setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-tab-btn');
    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-tab');
        switchTab(target);
      });
    });

    // Mobile Drawer Triggers
    const btnToggle = document.getElementById('btn-mobile-nav-toggle');
    if (btnToggle) {
      btnToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        openMobileNav();
      });
    }

    const btnClose = document.getElementById('btn-close-mobile-nav');
    if (btnClose) {
      btnClose.addEventListener('click', (e) => {
        e.stopPropagation();
        closeMobileNav();
      });
    }

    const backdrop = document.getElementById('mobile-nav-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', closeMobileNav);
    }

    // Top-up store modal triggers (desktop & mobile)
    const btnDesktopTopup = document.getElementById('btn-desktop-topup-store');
    if (btnDesktopTopup) {
      btnDesktopTopup.addEventListener('click', (e) => {
        e.preventDefault();
        openTopupModal();
      });
    }

    const btnMobileTopup = document.getElementById('btn-mobile-topup-store');
    if (btnMobileTopup) {
      btnMobileTopup.addEventListener('click', (e) => {
        e.preventDefault();
        closeMobileNav();
        openTopupModal();
      });
    }
  }

  function switchTab(tabId) {
    if (activeTab !== tabId) {
      playMenuSound('click');
    }
    activeTab = tabId;

    // Smoothly close mobile side drawer if open
    closeMobileNav();

    if (tabId ==='bank') {
      fetchAndRenderTransferRequests(true);
      loadTransferHistory(true);
    } else if (tabId ==='store') {
      GameEngine.syncItemsConfig().then(() => {
        renderStore();
      });
    } else if (tabId ==='auctions') {
      fetchAndRenderAuctions();
      renderAcquisitionMarket();
    } else if (tabId ==='corporations') {
      renderCorporationsTab();
    } else if (tabId ==='trade') {
      renderTradePanel();
    } else if (tabId ==='industry') {
      renderIndustryPanel();
    }

    // Immediate toggle of jail-overlay based on selected tab
    const jailOverlay = document.getElementById('jail-overlay');
    if (jailOverlay) {
      const state = GameEngine.state;
      const isBlackMarketTab = (tabId ==='blackmarket' || tabId ==='smuggling');
      if (state && state.jailTimer > 0 && isBlackMarketTab) {
        jailOverlay.classList.remove('hidden');
        const countdownEl = document.getElementById('jail-countdown');
        if (countdownEl) countdownEl.textContent = state.jailTimer;
      } else {
        jailOverlay.classList.add('hidden');
      }
    }

    // Update active class styles in buttons
    const navButtons = document.querySelectorAll('.nav-tab-btn');
    navButtons.forEach(btn => {
      const btnTab = btn.getAttribute('data-tab');
      if (btnTab === tabId) {
        btn.classList.add('text-yellow-500','glass-panel-active','border-b-2','border-yellow-500');
        btn.classList.remove('text-slate-400');
      } else {
        btn.classList.remove('text-yellow-500','glass-panel-active','border-b-2','border-yellow-500');
        btn.classList.add('text-slate-400');
      }
    });

    // Toggle panels visibility
    const panels = document.querySelectorAll('.game-panel');
    panels.forEach(panel => {
      const panelId = panel.getAttribute('id');
      if (panelId ===`panel-${tabId}`) {
        panel.classList.remove('hidden');
      } else {
        panel.classList.add('hidden');
      }
    });

    // Reset scroll position to top for the new tab
    const mainEl = document.querySelector('.desktop-content');
    if (mainEl) {
      mainEl.scrollTop = 0;
    }
    window.scrollTo(0, 0);

    if (tabId ==='careers') {
      checkAndOpenRiddleVerification();
    }

    // Render tab-specific elements
    renderAll();
  }

  // --- Core Game Loops (Continuous 1.0s real-time profit tracking) ---
  let visibilityListenerAttached = false;

  function startGameLoop() {
    if (tickIntervalId) clearInterval(tickIntervalId);

    // Setup tab focus/visibility listener for instant catch-up
    if (!visibilityListenerAttached) {
      visibilityListenerAttached = true;
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && GameEngine.activeUsername) {
          renderAll();
        }
      });
      window.addEventListener('focus', () => {
        if (GameEngine.activeUsername) {
          renderAll();
        }
      });
    }

    tickIntervalId = setInterval(() => {
      const updates = GameEngine.processTick();
      if (!updates) return;

      // Handle Jail lockouts overlay (Strictly isolated to Black Market & Smuggling tabs)
      const state = GameEngine.state;
      const jailOverlay = document.getElementById('jail-overlay');
      const isBlackMarketTab = (activeTab ==='blackmarket' || activeTab ==='smuggling');
      if (state && state.jailTimer > 0 && isBlackMarketTab) {
        jailOverlay.classList.remove('hidden');
        const countdownEl = document.getElementById('jail-countdown');
        if (countdownEl) countdownEl.textContent = state.jailTimer;
      } else if (jailOverlay) {
        jailOverlay.classList.add('hidden');
      }

      // Bind legal exit and close buttons from jail overlay
      const jailExitBtn = document.getElementById('btn-jail-exit-to-legal');
      const jailCloseXBtn = document.getElementById('btn-jail-close-x');
      const doExitJailOverlay = () => {
        if (jailOverlay) jailOverlay.classList.add('hidden');
        switchTab('dashboard');
      };
      if (jailExitBtn && !jailExitBtn._bound) {
        jailExitBtn._bound = true;
        jailExitBtn.addEventListener('click', doExitJailOverlay);
      }
      if (jailCloseXBtn && !jailCloseXBtn._bound) {
        jailCloseXBtn._bound = true;
        jailCloseXBtn.addEventListener('click', doExitJailOverlay);
      }

      // Handle Police Raid overlay
      const raidOverlay = document.getElementById('police-raid-overlay');
      if (state && state.raidActive) {
        if (raidOverlay && raidOverlay.classList.contains('hidden')) {
          raidOverlay.classList.remove('hidden');
          playCasinoSound('siren');
        }
        const dirtyEl = document.getElementById('raid-dirty-cash');
        const bribeEl = document.getElementById('raid-bribe-cost');
        const escapeEl = document.getElementById('raid-escape-chance');
        if (dirtyEl) dirtyEl.textContent =`${(state.dirtyCash || 0).toLocaleString()} EGP`;
        if (bribeEl) bribeEl.textContent =`${(state.raidBribeCost || 0).toLocaleString()} EGP`;
        if (escapeEl) escapeEl.textContent =`${state.raidEscapeChance || 0}%`;
      } else if (raidOverlay) {
        raidOverlay.classList.add('hidden');
      }

      if (updates.jailFree) {
        showToast('العدالة','انتهت مدة محكوميتك. تم الإفراج عنك ويمكنك مزاولة نشاطك!','success');
      }

      // Display passive profit float triggers (lightweight)
      if (updates.businessProfitGained > 0 || updates.rentGained > 0) {
        const totalPassive = updates.businessProfitGained + updates.rentGained;
        showPassiveGainFloat(`+${totalPassive.toLocaleString()}`);
      }

      // Toast alert for bank interest
      if (updates.bankInterestGained > 0) {
        console.log(`Interest compound gained: +${updates.bankInterestGained}`);
      }

      // Toast alert for investments maturing
      if (updates.investmentsMatured && updates.investmentsMatured.length > 0) {
        updates.investmentsMatured.forEach(inv => {
          showToast('استثمار ناضج',`اكتمل استثمار"${inv.name}". الأرباح الإجمالية المستلمة: ${inv.payout.toLocaleString()} EGP.`,'success');
        });
      }

      // Toast alert for loan default
      if (updates.loanDefaulted) {
        showToast('تعثر مصرفي ️','انتهت مهلة سداد القرض! تم تجميد حسابك البنكي وتطبيق غرامة تأخير دورية 3%.','error');
      }

      // Toast alert for loan penalty
      if (updates.loanPenaltyApplied) {
        showToast('غرامة تأخير مصرفية ️',`تم تطبيق غرامة تأخير +${updates.loanPenaltyApplied.penalty.toLocaleString()} EGP على القرض لعدم السداد!`,'error');
      }

      // Toast alert for supplies exhaustion
      if (updates.suppliesExhausted && updates.suppliesExhausted.length > 0) {
        updates.suppliesExhausted.forEach(bName => {
          showToast('نفاد البضاعة',`نفدت بضاعة ومستلزمات مشروع"${bName}" وتوقف الإنتاج بالكامل! قم بتوريد شحنة جديدة لإعادة التشغيل.`,'warning');
        });
      }

      // Handle random Tip Events
      if (updates.tipEvent) {
        showToast(updates.tipEvent.title, updates.tipEvent.message, updates.tipEvent.gain > 0 ?'success' :'error');
      }

      // Handle Dynamic Stock Market Events
      if (updates.marketEvent) {
        showToast(updates.marketEvent.title, updates.marketEvent.desc, updates.marketEvent.toastType ||'info');
        const ticker = document.getElementById('stock-market-news-ticker');
        if (ticker) {
          ticker.textContent =`${updates.marketEvent.title}: ${updates.marketEvent.desc}`;
          ticker.classList.add('text-yellow-400');
        }
      }

      // Handle Unified 15-min Candlestick Stock Movement
      if (updates.stockMovement) {
        if (activeTab ==='stocks') {
          renderStocks(true);
        }
        showToast('جلسة البورصة M15','أُغلقت شمعة التداول السابقة وتم تحديث أسعار الأسهم موحداً لجميع اللاعبين!','info');
      }

      // Handle Trade Arrivals and Deliveries
      if (updates.tradeImportsArrived && updates.tradeImportsArrived.length > 0) {
        updates.tradeImportsArrived.forEach(item => {
          showToast('وصول شحنة استيراد!',`وصلت شحنة ${item.name} (${item.qty} وحدة) وتم تخزينها في المستودع بنجاح!`,'success');
        });
        if (activeTab ==='trade') renderTradePanel();
      }

      if (updates.tradeExportsDelivered && updates.tradeExportsDelivered.length > 0) {
        updates.tradeExportsDelivered.forEach(item => {
          showToast('وصول شحنة تصدير للعميل! ️',`وصلت شحنة ${item.name} إلى ${item.buyerName}. يمكنك الآن تحصيل أرباح الصفقة بقيمة ${item.payout.toLocaleString()} EGP!`,'success');
        });
        if (activeTab ==='trade') renderTradePanel();
      }

      // Fast in-place numerical updates on every tick without DOM destruction
      renderStatsBar();

      if (activeTab ==='dashboard') renderDashboard();
      else if (activeTab ==='bank') updateBankInDOM();
      else if (activeTab ==='business') updateBusinessesInDOM();
      else if (activeTab ==='assets') updateAssetsInDOM();
      else if (activeTab ==='stocks') updateStockPricesInDOM();
      else if (activeTab ==='taxes') renderTaxesTab();
      else if (activeTab ==='blackmarket') updateBlackMarketCooldownsInDOM();
      else if (activeTab ==='trade') updateTradeShipmentsInDOM();
      else if (activeTab ==='industry') updateIndustryStockInDOM();

      // Real-time live update for cashflow breakdown modal if open
      const cfModal = document.getElementById('cashflow-breakdown-modal');
      if (cfModal && !cfModal.classList.contains('hidden')) {
        renderCashflowBreakdown();
      }

      // Real-time live update for daily quests modal if open
      const dqModal = document.getElementById('daily-quests-modal');
      if (dqModal && !dqModal.classList.contains('hidden')) {
        renderDailyQuests();
      }

      checkAndClaimDividends();

      // V2: Check and auto-activate pending live auctions from cache
      if (window.lastLiveAuctionsCache) {
        window.lastLiveAuctionsCache.forEach(auc => {
          if (auc.status ==='pending') {
            checkAndStartAuction(auc);
          }
        });
      }

      // V2: Refresh live auctions timer tick in real-time
      if (activeTab ==='auctions' && window.lastLiveAuctionsCache) {
        renderLiveAuctions(window.lastLiveAuctionsCache);
      }
    }, 1000);
  }

  // --- Dynamic Stats Bars Rendering ---
  function renderStatsBar() {
    const s = GameEngine.state;
    if (!GameEngine.activeUsername || !s) return;

    const username = GameEngine.activeUsername;
    const isAdmin = Boolean(s.isAdmin);

    const isFb = Boolean(s.facebookVerified || (s.badges && s.badges.includes('facebook')));

    const customBadge = s.customBadge ||'';
    const badgeHtml = customBadge ?`<span class="vip-custom-badge ml-1 inline-block drop-shadow-sm" title="${s.badgeTitle ||'عضو VIP'}">${customBadge}</span>` :'';

    // Desktop stats
    const uEl = document.getElementById('stat-username');
    if (uEl) {
      uEl.innerHTML = badgeHtml + username;
      uEl.classList.add('cursor-pointer','hover:underline');
      uEl.title ='اضغط لعرض ملفك الشخصي وأوسمتك';
      uEl.onclick = () => openPlayerProfileCard(username);
    }
    const fbEl = document.getElementById('stat-fb-badge');
    if (fbEl) {
      if (isFb) fbEl.classList.remove('hidden');
      else fbEl.classList.add('hidden');
    }
    const tEl = document.getElementById('stat-title');
    if (tEl) tEl.textContent = s.title;

    const cEl = document.getElementById('stat-cash');
    if (cEl) {
      cEl.textContent = formatCompactNumber(s.cash);
      cEl.title = formatFullCurrency(s.cash);
    }
    const bEl = document.getElementById('stat-bank');
    if (bEl) {
      bEl.textContent = formatCompactNumber(s.bank);
      bEl.title = formatFullCurrency(s.bank);
    }
    const nEl = document.getElementById('stat-networth');
    if (nEl) {
      nEl.textContent = formatCompactNumber(s.netWorth);
      nEl.title = formatFullCurrency(s.netWorth);
    }

    // Hourly Cashflow Rate (Smooth live distribution)
    const cashflow = GameEngine.calculatePassiveIncomePerHour ? GameEngine.calculatePassiveIncomePerHour() : (GameEngine.calculatePassiveIncomePerSecond ? (GameEngine.calculatePassiveIncomePerSecond() * 3600) : 0);
    const cfEl = document.getElementById('stat-cashflow');
    if (cfEl) {
      cfEl.textContent =`+${formatCompactNumber(cashflow)}`;
      cfEl.title =`+${formatFullCurrency(cashflow)}`;
    }

    // Mobile stats
    const umEl = document.getElementById('stat-username-mobile');
    if (umEl) {
      umEl.innerHTML = badgeHtml + username;
      umEl.classList.add('cursor-pointer','hover:underline');
      umEl.title ='اضغط لعرض ملفك الشخصي وأوسمتك';
      umEl.onclick = () => openPlayerProfileCard(username);
    }
    const fbmEl = document.getElementById('stat-fb-badge-mobile');
    if (fbmEl) {
      if (isFb) fbmEl.classList.remove('hidden');
      else fbmEl.classList.add('hidden');
    }
    const tmEl = document.getElementById('stat-title-mobile');
    if (tmEl) tmEl.textContent = s.title;

    const cmEl = document.getElementById('stat-cash-mobile');
    if (cmEl) {
      cmEl.textContent = formatCompactNumber(s.cash);
      cmEl.title = formatFullCurrency(s.cash);
    }
    const bmEl = document.getElementById('stat-bank-mobile');
    if (bmEl) {
      bmEl.textContent = formatCompactNumber(s.bank);
      bmEl.title = formatFullCurrency(s.bank);
    }
    const nmEl = document.getElementById('stat-networth-mobile');
    if (nmEl) {
      nmEl.textContent = formatCompactNumber(s.netWorth);
      nmEl.title = formatFullCurrency(s.netWorth);
    }

    const cfmEl = document.getElementById('stat-cashflow-mobile');
    if (cfmEl) {
      cfmEl.textContent =`+${formatCompactNumber(cashflow)}`;
      cfmEl.title =`+${formatFullCurrency(cashflow)}`;
    }

    // Update Facebook Reward Button State
    updateFacebookButtonUI();

    // Show/Hide Admin Buttons
    const adminBtn = document.getElementById('btn-admin-panel-trigger');
    if (adminBtn) {
      if (isAdmin) adminBtn.classList.remove('hidden');
      else adminBtn.classList.add('hidden');
    }
    const adminBtnMobile = document.getElementById('btn-admin-panel-trigger-mobile');
    if (adminBtnMobile) {
      if (isAdmin) adminBtnMobile.classList.remove('hidden');
      else adminBtnMobile.classList.add('hidden');
    }
    const adminBtnFab = document.getElementById('btn-admin-panel-trigger-fab');
    if (adminBtnFab) {
      if (isAdmin) adminBtnFab.classList.remove('hidden');
      else adminBtnFab.classList.add('hidden');
    }
    const adminChatControls = document.getElementById('admin-chat-controls');
    if (adminChatControls) {
      if (isAdmin) adminChatControls.classList.remove('hidden');
      else adminChatControls.classList.add('hidden');
    }
  }

  // --- General Render Manager ---
  function renderAll() {
    renderStatsBar();
    switch (activeTab) {
      case'dashboard':
        renderDashboard();
        break;
      case'careers':
        renderCareers();
        break;
      case'business':
        renderBusinesses();
        break;
      case'bank':
        renderBank();
        break;
      case'assets':
        renderAssets();
        break;
      case'stocks':
        renderStocks();
        break;
      case'taxes':
        renderTaxesTab();
        break;
      case'store':
        renderStore();
        break;
      case'auctions':
        renderAuctionsTab();
        break;
      case'blackmarket':
        renderBlackMarket();
        break;
      case'casino':
        renderCasino();
        break;
      case'leaderboard':
        renderLeaderboard();
        break;
      case'trade':
        renderTradePanel();
        break;
      case'industry':
        renderIndustryPanel();
        break;
    }
    translateDOM(document.body);
  }

  // --- Tab 1: Dashboard Panel ---
  function renderDashboard() {
    const s = GameEngine.state;
    if (!s) return;

    const sym = getCurrencySymbol();

    document.getElementById('dash-uid').textContent = GameEngine.activeUsername;
    document.getElementById('dash-title').textContent = s.title;
    document.getElementById('dash-xp').textContent = s.xp.toLocaleString();
    // In My Account (حسابي), display full amount prominently, with compact badge if large
    const dashCashEl = document.getElementById('dash-cash');
    if (dashCashEl) {
      if (s.cash >= 1000000) {
        dashCashEl.innerHTML =`<span class="break-all">${s.cash.toLocaleString()} ${sym}</span> <span class="text-xs text-yellow-400 font-bold ml-1 bg-yellow-500/10 px-2 py-0.5 rounded-lg border border-yellow-500/20 inline-block numbers-font">(${formatCompactNumber(s.cash)})</span>`;
      } else {
        dashCashEl.textContent = s.cash.toLocaleString() +'' + sym;
      }
    }

    const dashBankEl = document.getElementById('dash-bank');
    if (dashBankEl) {
      if (s.bank >= 1000000) {
        dashBankEl.innerHTML =`<span class="break-all">${s.bank.toLocaleString()} ${sym}</span> <span class="text-xs text-emerald-400 font-bold ml-1 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20 inline-block numbers-font">(${formatCompactNumber(s.bank)})</span>`;
      } else {
        dashBankEl.textContent = s.bank.toLocaleString() +'' + sym;
      }
    }

    const dashDirtyEl = document.getElementById('dash-dirty-cash');
    if (dashDirtyEl) {
      const dirty = s.dirtyCash || 0;
      if (dirty >= 1000000) {
        dashDirtyEl.innerHTML =`<span class="break-all">${dirty.toLocaleString()} ${sym}</span> <span class="text-xs text-rose-400 font-bold ml-1 bg-rose-500/10 px-2 py-0.5 rounded-lg border border-rose-500/20 inline-block numbers-font">(${formatCompactNumber(dirty)})</span>`;
      } else {
        dashDirtyEl.textContent = dirty.toLocaleString() +'' + sym;
      }
    }

    const dashWorthEl = document.getElementById('dash-worth');
    if (dashWorthEl) {
      if (s.netWorth >= 1000000) {
        dashWorthEl.innerHTML =`<span class="break-all">${s.netWorth.toLocaleString()} ${sym}</span> <span class="text-xs text-amber-300 font-bold ml-1 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20 inline-block numbers-font">(${formatCompactNumber(s.netWorth)})</span>`;
      } else {
        dashWorthEl.textContent = s.netWorth.toLocaleString() +'' + sym;
      }
    }

    // 12-Hour AFK Auto-Manager Status & Countdown
    const badgeEl = document.getElementById('afk-manager-status-badge');
    const barEl = document.getElementById('afk-manager-progress-bar');
    const timeEl = document.getElementById('afk-manager-time-left');
    const btnTextEl = document.getElementById('btn-renew-afk-text');

    const now = Date.now();
    const expiry = s.afkManagerExpiresAt || 0;
    const remainingMs = Math.max(0, expiry - now);

    if (remainingMs > 0) {
      const totalSec = Math.floor(remainingMs / 1000);
      const hours = Math.floor(totalSec / 3600);
      const mins = Math.floor((totalSec % 3600) / 60);
      const secs = totalSec % 60;
      const formatted =`${hours.toString().padStart(2,'0')}:${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;
      const pct = Math.min(100, Math.max(2, Math.round((remainingMs / (12 * 3600 * 1000)) * 100)));

      if (badgeEl) {
        badgeEl.innerHTML =`<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>نشط (تجميع مستمر)`;
        badgeEl.className ='text-[10px] px-2.5 py-0.5 rounded-full font-black border bg-emerald-500/20 text-emerald-300 border-emerald-500/30 flex items-center gap-1';
      }
      if (barEl) {
        barEl.style.width =`${pct}%`;
        barEl.className ='bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-500';
      }
      if (timeEl) {
        timeEl.textContent =`${formatted} متبقية`;
        timeEl.className ='numbers-font text-xs font-bold text-emerald-400';
      }
      if (btnTextEl) {
        btnTextEl.textContent ='تمديد وردية الإدارة (12 ساعة)';
      }
    } else {
      if (badgeEl) {
        badgeEl.innerHTML =`<span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span>متوقف (يلزم التفعيل)`;
        badgeEl.className ='text-[10px] px-2.5 py-0.5 rounded-full font-black border bg-rose-500/20 text-rose-300 border-rose-500/30 flex items-center gap-1';
      }
      if (barEl) {
        barEl.style.width ='0%';
        barEl.className ='bg-rose-500 h-full transition-all duration-500';
      }
      if (timeEl) {
        timeEl.textContent ='منتهي (انتهت الـ 12 ساعة)';
        timeEl.className ='numbers-font text-xs font-bold text-rose-400';
      }
      if (btnTextEl) {
        btnTextEl.textContent ='تفعيل وردية الإدارة (12 ساعة)';
      }
    }

    // Update inventory quick badges
    const desktopBadge = document.getElementById('desktop-inventory-count-badge');
    const mobileBadge = document.getElementById('mobile-inventory-count-badge');
    if (desktopBadge || mobileBadge) {
      const inv = s.inventory || {};
      const totalInvCount = Object.keys(inv).reduce((sum, k) => sum + (Number(inv[k]) || 0), 0);
      if (desktopBadge) desktopBadge.textContent =`${totalInvCount}`;
      if (mobileBadge) {
        mobileBadge.textContent = totalInvCount;
        mobileBadge.classList.toggle('hidden', totalInvCount === 0);
      }
    }

    renderDailyQuests();
  }

  // --- Tab 2: Careers Panel ---
  function renderCareers() {
    const s = GameEngine.state;
    const container = document.getElementById('careers-list');
    container.innerHTML ='';

    Object.keys(GameEngine.JOBS).forEach(id => {
      const job = GameEngine.JOBS[id];
      const isCurrent = s.jobId === id;
      const isUnlocked = s.xp >= job.xpNeeded;

      const card = document.createElement('div');
      card.className =`glass-panel p-4 rounded-xl flex flex-col justify-between items-start border ${isCurrent ?'border-yellow-500 bg-yellow-950/20' :'border-slate-800'}`;

      const translatedJobName = window.currentLang ==='en' ? (translationDict[job.name] || job.name) : job.name;

      card.innerHTML =`
        <div class="w-full flex justify-between items-center mb-2">
          <h4 class="text-lg font-bold text-white">${translatedJobName}</h4>
          ${isCurrent ?`<span class="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-500 rounded border border-yellow-500/30">${window.currentLang ==='en' ?'Current Job' :'الوظيفة الحالية'}</span>` :''}
        </div>
          <div class="text-sm text-slate-400 space-y-1 mb-4 w-full">
          <div class="flex justify-between"><span>${window.currentLang ==='en' ?'Base Salary:' :'الراتب الثابت:'}</span><span class="numbers-font text-emerald-400 font-semibold">+${job.salary} EGP / ${window.currentLang ==='en' ?'cycle' :'دورة'}</span></div>
          <div class="flex justify-between"><span>${window.currentLang ==='en' ?'XP Reward:' :'العائد من الخبرة:'}</span><span class="numbers-font text-blue-400">+${job.xpReward} XP</span></div>
          <div class="flex justify-between"><span>${window.currentLang ==='en' ?'XP Required:' :'الخبرة المطلوبة:'}</span><span class="numbers-font">${job.xpNeeded} XP</span></div>
        </div>
        <button 
          data-job-id="${id}"
          class="w-full py-2 rounded-lg font-bold transition duration-300 text-sm ${isCurrent
          ?'bg-slate-700 text-slate-300 cursor-not-allowed'
          : isUnlocked
            ?'bg-yellow-500 hover:bg-yellow-600 text-slate-950'
            :'bg-slate-800 text-slate-500 cursor-not-allowed'
        }"
          ${isCurrent || !isUnlocked ?'disabled' :''}
        >
          ${isCurrent ? (window.currentLang ==='en' ?'You are in this career' :'أنت تمارس هذه المهنة') : isUnlocked ? (window.currentLang ==='en' ?'Apply to this job' :'التحاق بهذه الوظيفة') : (window.currentLang ==='en' ?'Locked (XP needed)' :`مغلق (تحتاج لخبرة)`)}
        </button>`;

      // Apply Promotion Action
      if (!isCurrent && isUnlocked) {
        card.querySelector('button').addEventListener('click', () => {
          try {
            GameEngine.promoteJob(id);
            showToast('تهانينا',`تم ترقيتك لوظيفة: ${job.name}`,'success');
            renderAll();
          } catch (err) {
            showToast('خطأ الترقية', err.message,'error');
          }
        });
      }

      container.appendChild(card);
    });
  }

  // --- Tab 3: Business Tycoon Panel (High-Performance In-Place Updates) ---
  let lastBizLevels = {};

  function renderBusinesses(force = false) {
    const s = GameEngine.state;
    const container = document.getElementById('businesses-list');
    if (!container) return;

    let needsRebuild = force || container.children.length === 0;
    if (!needsRebuild) {
      for (const key of Object.keys(GameEngine.BUSINESSES)) {
        const currentLevel = (s.businesses[key] && s.businesses[key].level) || 0;
        if (lastBizLevels[key] !== currentLevel) {
          needsRebuild = true;
          break;
        }
      }
    }

    if (!needsRebuild) {
      updateBusinessesInDOM();
      return;
    }

    container.innerHTML ='';
    lastBizLevels = {};

    Object.keys(GameEngine.BUSINESSES).forEach(key => {
      const biz = GameEngine.BUSINESSES[key];
      const bizState = s.businesses[key] || { level: 0, price: biz.optimumPrice, workers: 0 };
      const isOwned = bizState.level > 0;
      lastBizLevels[key] = bizState.level;

      const card = document.createElement('div');
      card.id =`biz-card-${key}`;
      card.className =`glass-panel p-5 rounded-xl border border-slate-800 flex flex-col justify-between ${isOwned ?'pulse-border-gold bg-slate-900/40' :''}`;

      if (!isOwned) {
        // Render Purchase Form
        const translatedBizName = window.currentLang ==='en' ? (translationDict[biz.name] || biz.name) : biz.name;
        card.innerHTML =`
          <div class="mb-4">
            <h4 class="text-lg font-bold text-slate-300">${translatedBizName}</h4>
            <p class="text-xs text-slate-500 mt-1">${window.currentLang ==='en' ?'Purchase a business to start generating automatic profits and hire workers.' :'شراء مشروع تجاري والبدء بجني الأرباح تلقائياً وتوظيف العمالة.'}</p>
          </div>
          <div class="text-sm text-slate-400 space-y-1 mb-6">
            <div class="flex justify-between"><span>${window.currentLang ==='en' ?'Establish Cost:' :'تكلفة التأسيس:'}</span><span class="numbers-font text-yellow-500 font-semibold">${biz.cost.toLocaleString()} EGP</span></div>
            <div class="flex justify-between"><span>${window.currentLang ==='en' ?'Approx. Base Yield:' :'العائد التقريبي الأساسي:'}</span><span class="numbers-font text-emerald-400">~${biz.baseDemand * (biz.optimumPrice - biz.costOfGoods)} EGP / ${window.currentLang ==='en' ?'cycle' :'دورة'}</span></div>
          </div>
          <button class="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition duration-300">
            ${window.currentLang ==='en' ?'Establish Business & Invest Capital' :'تأسيس المشروع واستثمار رأس المال'}
          </button>`;
        card.querySelector('button').addEventListener('click', () => {
          try {
            GameEngine.purchaseBusiness(key);
            showToast('نجاح التأسيس',`تم افتتاح مشروع"${biz.name}" بنجاح!`,'success');
            renderBusinesses(true);
            renderStatsBar();
          } catch (err) {
            showToast('فشل المشروع', err.message,'error');
          }
        });
      } else {
        const nextUpgradeCost = Math.floor(biz.cost * Math.pow(1.75, bizState.level));
        const workerHireCost = Math.floor(biz.cost * 0.15 * (1 + (bizState.workers || 0)));
        const campaignCost = Math.floor(biz.cost * 0.25);
        const marketingActive = (bizState.marketingTicks && bizState.marketingTicks > 0);
        const marketingSecRemaining = marketingActive ? bizState.marketingTicks * 3 : 0;

        const bizCalc = GameEngine.calculateSingleBusinessProfit ? GameEngine.calculateSingleBusinessProfit(key, bizState) : {
          opt: biz.optimumPrice,
          price: bizState.price || biz.optimumPrice,
          actualCostOfGoods: biz.costOfGoods,
          demand: biz.baseDemand,
          margin: (bizState.price || biz.optimumPrice) - biz.costOfGoods,
          ownerProfit: 0,
          workerPayroll: 0
        };
        const opt = bizCalc.opt;
        const price = bizCalc.price;
        const actualCostOfGoods = bizCalc.actualCostOfGoods;
        const estimatedDemand = bizCalc.demand;
        const profitMargin = bizCalc.margin;
        const profitPerTick = bizCalc.ownerProfit;
        const workerPayroll = bizCalc.workerPayroll;

        const hasSupplies = Boolean(bizCalc.hasSupplies);
        const suppliesTicks = bizCalc.suppliesTicks || 0;
        const suppliesMins = Math.floor(suppliesTicks / 60);
        const supplyCost = Math.max(80, Math.floor(biz.cost * 0.04 * Math.pow(1.15, (bizState.level || 1) - 1)));

        const translatedBizName = window.currentLang ==='en' ? (translationDict[biz.name] || biz.name) : biz.name;
        card.innerHTML =`
          <div class="flex justify-between items-center mb-3">
            <h4 class="text-lg font-bold text-white">${translatedBizName}</h4>
            <span id="biz-level-badge-${key}" class="text-xs px-2.5 py-0.5 ${bizState.isFranchise ?'bg-amber-500/20 text-amber-400 border-amber-500/30' :'bg-yellow-500/20 text-yellow-500 border-yellow-500/30'} rounded border font-bold">
              ${bizState.isFranchise ? (window.currentLang ==='en' ?'Franchise Brand' :'علامة تجارية') :`${window.currentLang ==='en' ?'Level' :'المستوى'} ${bizState.level}`}
            </span>
          </div>
          
          <div class="text-xs text-slate-400 space-y-1 mb-4 border-b border-slate-800 pb-3">
            <div class="flex justify-between"><span>${window.currentLang ==='en' ?'Current Employees:' :'العمالة الحالية:'}</span><span id="biz-workers-${key}" class="numbers-font text-white font-bold">${bizState.workers || 0} ${window.currentLang ==='en' ?'workers' :'عمال'} (${window.currentLang ==='en' ?'wages' :'أجور'}: -${workerPayroll} EGP/${window.currentLang ==='en' ?'cycle' :'دورة'})</span></div>
            <div class="flex justify-between"><span>${window.currentLang ==='en' ?'Material/Operation Cost:' :'تكلفة المواد/التشغيل:'}</span><span id="biz-cog-${key}" class="numbers-font text-rose-400">${actualCostOfGoods} EGP/${window.currentLang ==='en' ?'unit' :'وحدة'}</span></div>
            <div class="flex justify-between"><span>${window.currentLang ==='en' ?'Current Expected Demand:' :'الطلب الحالي المتوقع:'}</span><span id="biz-demand-${key}" class="numbers-font text-sky-400 font-bold">${estimatedDemand} ${window.currentLang ==='en' ?'units/cycle' :'وحدة/دورة'} ${marketingActive ?`<span class="text-yellow-400 font-bold">(${window.currentLang ==='en' ?'+40% Promo' :'+40% ترويج'})</span>` :''}</span></div>
            <div class="flex justify-between"><span>${window.currentLang ==='en' ?'Unit Profit Margin:' :'هامش ربح الوحدة:'}</span><span id="biz-margin-${key}" class="numbers-font ${profitMargin >= 0 ?'text-teal-400' :'text-rose-400'} font-bold">${profitMargin} EGP</span></div>
            <div class="flex justify-between"><span>${window.currentLang ==='en' ?'Actual Net Return:' :'العائد الصافي الفعلي:'}</span><span id="biz-profit-${key}" class="numbers-font text-emerald-400 font-bold">+${profitPerTick.toLocaleString()} EGP / ${window.currentLang ==='en' ?'cycle' :'دورة'} ${bizState.isFranchise ?`<span class="text-amber-400 text-[10px] font-black">(${window.currentLang ==='en' ?'+25% Brand' :'+25% براند'})</span>` :''}</span></div>
          </div>

          <div class="mb-3">
            <div class="flex justify-between text-xs text-slate-400 mb-1">
              <span>${window.currentLang ==='en' ?'Adjust Product Price:' :'تعديل سعر المنتج:'}</span>
              <span class="numbers-font font-bold text-yellow-500"><span id="price-val-${key}">${price}</span> EGP (${window.currentLang ==='en' ?'Optimum' :'المثالي'}: ${opt} EGP)</span>
            </div>
            <input 
              type="range" 
              min="${Math.max(1, Math.floor(actualCostOfGoods))}" 
              max="${Math.floor(opt * 3)}" 
              value="${price}" 
              id="slider-${key}"
              class="w-full accent-yellow-500"
            />
          </div>

          <!-- Operating Supplies Status & Shipment Trigger -->
          <div id="biz-supply-box-${key}" class="mb-3 p-2 bg-slate-950/60 rounded-xl border ${hasSupplies ?'border-emerald-500/30' :'border-rose-500/50 bg-rose-950/20 animate-pulse'} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 transition-all">
            <div class="flex items-center gap-2">
              <span id="biz-supply-icon-${key}" class="text-sm">${hasSupplies ?'<i class="fa-solid fa-circle text-emerald-400 text-xs"></i>' :'<i class="fa-solid fa-circle text-rose-500 text-xs"></i>'}</span>
              <div>
                <div id="biz-supply-title-${key}" class="text-[11px] font-bold ${hasSupplies ?'text-white' :'text-rose-400 font-black'}">
                  ${hasSupplies ?'بضاعة وخامات متوفرة (كفاءة إنتاجية 125%)' :'المخزون نفد بالكامل! المشروع متوقف'}
                </div>
                <div id="biz-supply-time-${key}" class="text-[10px] ${hasSupplies ?'text-slate-400' :'text-rose-300 font-bold'}">
                  ${hasSupplies ?`متبقي: ${suppliesMins} دقيقة طاقة قصوى` :'الأرباح: 0 ج.م — يجب توريد بضاعة لإعادة تشغيل المشروع'}
                </div>
              </div>
            </div>
            <button id="btn-supply-${key}" class="w-full sm:w-auto px-3 py-1.5 ${hasSupplies ?'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white' :'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-lg shadow-emerald-500/30 animate-bounce'} rounded-lg text-xs font-black transition flex items-center justify-center gap-1 shadow shrink-0 cursor-pointer">
              <i class="fa-solid fa-box-open"></i>
              <span id="biz-supply-btn-text-${key}">توريد بضاعة (${supplyCost.toLocaleString()} EGP)</span>
            </button>
          </div>

          <!-- Marketing Campaign Trigger -->
          <div class="mb-3">
            <button id="btn-marketing-${key}" class="w-full py-1.5 ${marketingActive ?'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' :'bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 border-indigo-500/40'} border rounded-lg text-xs font-bold transition flex items-center justify-center gap-1">
               <span id="biz-mktg-text-${key}">${marketingActive ? (window.currentLang ==='en' ?`Active Ad Campaign (${marketingSecRemaining}s remaining)` :`حملة إعلانية نشطة (متبقي ${marketingSecRemaining}ث)`) : (window.currentLang ==='en' ?`Launch promo campaign (+40% demand) — ${campaignCost.toLocaleString()} EGP` :`إطلاق حملة ترويجية مكثفة (+40% مبيعات) — ${campaignCost.toLocaleString()} EGP`)}</span>
            </button>
          </div>

          <div class="grid grid-cols-2 gap-2 mt-2">
            ${bizState.isFranchise ?`
              <button disabled class="py-2 bg-amber-950/20 text-amber-500/50 border border-amber-500/10 rounded-lg text-xs font-bold cursor-not-allowed">
                ${window.currentLang ==='en' ?'Registered Brand' :'علامة مسجلة'}
              </button>` : bizState.level >= 10 ?`
              <button id="btn-upgrade-${key}" class="py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-black transition">
                ${window.currentLang ==='en' ?'Upgrade to Brand' :'ترقية لبراند'}<br><span id="biz-upgrade-cost-${key}" class="numbers-font text-[9px] opacity-80">${(biz.cost * 15).toLocaleString()} EGP</span>
              </button>` :`
              <button id="btn-upgrade-${key}" class="py-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 rounded-lg text-xs font-bold transition">
                ${window.currentLang ==='en' ?'Upgrade Level' :'ترقية المستوى'}<br><span id="biz-upgrade-cost-${key}" class="numbers-font text-[10px] opacity-75">${nextUpgradeCost.toLocaleString()} EGP</span>
              </button>`}
            <button id="btn-hire-${key}" class="py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold transition">
              ${window.currentLang ==='en' ?'Hire Worker' :'توظيف عمالة'}<br><span id="biz-hire-cost-${key}" class="numbers-font text-[10px] opacity-75">${workerHireCost.toLocaleString()} EGP</span>
            </button>
          </div>
          ${bizState.isFranchise ?`
            <button id="btn-sell-franchise-${key}" class="w-full mt-2 py-2 bg-amber-500/15 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-black transition flex items-center justify-center gap-1 shadow-md">
              <i class="fa-solid fa-right-from-bracket"></i> ${window.currentLang ==='en' ?'Sell Brand (Liquidate & Refund)' :'بيع العلامة التجارية (تصفية واسترداد مالي)'}
            </button>` : (bizState.workers && bizState.workers > 0) ?`
            <button id="btn-fire-${key}" class="w-full mt-2 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-xs transition">
              ${window.currentLang ==='en' ?'Lay off one employee' :'تسريح عامل واحد'}
            </button>` :''}`;

        // Bind Price Slider Changes
        const slider = card.querySelector(`#slider-${key}`);
        slider.addEventListener('input', (e) => {
          const val = parseInt(e.target.value);
          const pv = card.querySelector(`#price-val-${key}`);
          if (pv) pv.textContent = val;
          GameEngine.setBusinessPrice(key, val);
          updateBusinessesInDOM();
        });

        // Marketing Campaign Listener
        card.querySelector(`#btn-marketing-${key}`).addEventListener('click', () => {
          try {
            const res = GameEngine.launchMarketingCampaign(key);
            showToast('حملة ترويجية',`تم إطلاق حملة إعلانية مكثفة لمشروع"${biz.name}" بتكلفة ${res.cost.toLocaleString()} EGP!`,'success');
            renderBusinesses(true);
            renderStatsBar();
          } catch (err) {
            showToast('فشل الحملة', err.message,'error');
          }
        });

        // Operating Supplies Listener
        const btnSupply = card.querySelector(`#btn-supply-${key}`);
        if (btnSupply) {
          btnSupply.addEventListener('click', () => {
            try {
              const res = GameEngine.supplyBusiness(key);
              showToast('توريد ناجح',`تم توريد خامات وبضاعة لمشروع"${biz.name}" بتكلفة ${res.cost.toLocaleString()} EGP (+20 دقيقة كفاءة 125%)!`,'success');
              renderBusinesses(true);
              renderStatsBar();
            } catch (err) {
              showToast('تنبيه', err.message,'error');
            }
          });
        }

        // Upgrade action
        const btnUpgrade = card.querySelector(`#btn-upgrade-${key}`);
        if (btnUpgrade) {
          btnUpgrade.addEventListener('click', () => {
            try {
              if (bizState.level >= 10 && !bizState.isFranchise) {
                GameEngine.convertToFranchise(key);
                showToast('علامة تجارية',`تم تسجيل مشروع"${biz.name}" كعلامة تجارية مسجلة بنجاح!`,'success');
              } else {
                GameEngine.upgradeBusiness(key);
                showToast('ترقية ناجحة',`تم ترقية مشروع"${biz.name}" للمستوى التالي!`,'success');
              }
              renderBusinesses(true);
              renderStatsBar();
            } catch (err) {
              showToast('خطأ الترقية', err.message,'error');
            }
          });
        }

        // Sell Franchise action
        const btnSellFranchise = card.querySelector(`#btn-sell-franchise-${key}`);
        if (btnSellFranchise) {
          btnSellFranchise.addEventListener('click', () => {
            const payoutAmount = Math.floor(biz.cost * 45);
            if (!confirm(`هل أنت متأكد من رغبتك في بيع العلامة التجارية لـ"${biz.name}" بالكامل والخروج من المشروع؟ ستحصل على تعويض نقدي فوري قدره ${payoutAmount.toLocaleString()} EGP!`)) return;
            try {
              const res = GameEngine.sellFranchise(key);
              showToast('استراتيجية خروج',`تم بيع وتصفية علامة"${biz.name}" واستلام مبلغ ${res.payout.toLocaleString()} EGP بنجاح!`,'success');
              renderBusinesses(true);
              renderStatsBar();
            } catch (err) {
              showToast('خطأ التصفية', err.message,'error');
            }
          });
        }

        // Hire action
        card.querySelector(`#btn-hire-${key}`).addEventListener('click', () => {
          try {
            GameEngine.hireWorker(key);
            showToast('توظيف عمالة',`تم إضافة عامل جديد إلى"${biz.name}" لتسريع الإنتاج.`,'success');
            renderBusinesses(true);
            renderStatsBar();
          } catch (err) {
            showToast('خطأ التوظيف', err.message,'error');
          }
        });

        // Fire action
        if (bizState.workers > 0) {
          const fireBtn = card.querySelector(`#btn-fire-${key}`);
          if (fireBtn) {
            fireBtn.addEventListener('click', () => {
              try {
                GameEngine.fireWorker(key);
                showToast('تعديل عمالة',`تم تسريح عامل لتخفيض تكلفة الإنتاج لـ"${biz.name}".`,'info');
                renderBusinesses(true);
                renderStatsBar();
              } catch (err) {
                showToast('خطأ', err.message,'error');
              }
            });
          }
        }
      }

      container.appendChild(card);
    });
  }

  function updateBusinessesInDOM() {
    const s = GameEngine.state;
    const container = document.getElementById('businesses-list');
    if (!container || container.children.length === 0) return;

    Object.keys(GameEngine.BUSINESSES).forEach(key => {
      const biz = GameEngine.BUSINESSES[key];
      const bizState = s.businesses[key];
      if (!bizState || bizState.level <= 0) return;

      const bizCalc = GameEngine.calculateSingleBusinessProfit ? GameEngine.calculateSingleBusinessProfit(key, bizState) : {
        opt: biz.optimumPrice,
        price: bizState.price || biz.optimumPrice,
        actualCostOfGoods: biz.costOfGoods,
        demand: biz.baseDemand,
        margin: (bizState.price || biz.optimumPrice) - biz.costOfGoods,
        ownerProfit: 0,
        marketingActive: false
      };
      const actualCostOfGoods = bizCalc.actualCostOfGoods;
      const estimatedDemand = bizCalc.demand;
      const profitMargin = bizCalc.margin;
      const profitPerTick = bizCalc.ownerProfit;
      const marketingActive = bizCalc.marketingActive;

      const cogEl = document.getElementById(`biz-cog-${key}`);
      if (cogEl) cogEl.textContent =`${actualCostOfGoods} EGP/وحدة`;

      const demandEl = document.getElementById(`biz-demand-${key}`);
      if (demandEl) demandEl.innerHTML =`${estimatedDemand} وحدة/دورة ${marketingActive ?'<span class="text-yellow-400 font-bold">(+40% ترويج)</span>' :''}`;

      const marginEl = document.getElementById(`biz-margin-${key}`);
      if (marginEl) {
        marginEl.textContent =`${profitMargin} EGP`;
        marginEl.className =`numbers-font ${profitMargin >= 0 ?'text-teal-400' :'text-rose-400'} font-bold`;
      }

      const hasSupplies = Boolean(bizState.suppliesTicks && bizState.suppliesTicks > 0);
      const profitEl = document.getElementById(`biz-profit-${key}`);
      if (profitEl) {
        if (hasSupplies && profitPerTick > 0) {
          profitEl.textContent =`+${profitPerTick.toLocaleString()} EGP / دورة`;
          profitEl.className ="numbers-font text-xs font-black text-teal-400";
        } else {
          profitEl.innerHTML ='<span class="text-rose-400 font-black animate-pulse">متوقف (0 EGP) ️</span>';
        }
      }

      // Live Operating Supplies Countdown & UI update
      const supplyBox = document.getElementById(`biz-supply-box-${key}`);
      const supplyIcon = document.getElementById(`biz-supply-icon-${key}`);
      const supplyTitle = document.getElementById(`biz-supply-title-${key}`);
      const supplyTime = document.getElementById(`biz-supply-time-${key}`);

      if (supplyBox && supplyIcon && supplyTitle && supplyTime) {
        if (hasSupplies) {
          const ticks = bizState.suppliesTicks || 0;
          const mins = Math.floor(ticks / 60);
          const secs = ticks % 60;
          const timeStr =`${mins}:${secs.toString().padStart(2,'0')}`;
          supplyBox.className ="mb-3 p-2 bg-slate-950/60 rounded-xl border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 transition-all";
          supplyIcon.innerHTML ='<i class="fa-solid fa-circle text-emerald-400 text-xs"></i>';
          supplyTitle.className ="text-[11px] font-bold text-white";
          supplyTitle.textContent ="بضاعة وخامات متوفرة (كفاءة إنتاجية 125%)";
          supplyTime.className ="text-[10px] text-slate-400";
          supplyTime.textContent =`متبقي: ${timeStr} دقيقة حتى نفاد المخزون`;
        } else {
          supplyBox.className ="mb-3 p-2 bg-rose-950/30 rounded-xl border border-rose-500/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 transition-all animate-pulse";
          supplyIcon.innerHTML ='<i class="fa-solid fa-circle text-rose-500 text-xs"></i>';
          supplyTitle.className ="text-[11px] font-bold text-rose-400";
          supplyTitle.textContent ="المخزون نفد بالكامل! المشروع متوقف";
          supplyTime.className ="text-[10px] text-rose-300 font-bold";
          supplyTime.textContent ="الأرباح: 0 ج.م — يجب توريد بضاعة لإعادة تشغيل المشروع";
        }
      }

      const mktgTextEl = document.getElementById(`biz-mktg-text-${key}`);
      if (mktgTextEl) {
        const campaignCost = Math.floor(biz.cost * 0.25);
        const marketingSecRemaining = marketingActive ? bizState.marketingTicks * 3 : 0;
        mktgTextEl.textContent = marketingActive
          ?`حملة إعلانية نشطة (متبقي ${marketingSecRemaining}ث)`
          :`إطلاق حملة ترويجية مكثفة (+40% مبيعات) — ${campaignCost.toLocaleString()} EGP`;
      }
    });
  }

  // --- Tab 4: Bank & Wire Transfers Panel ---
  function formatInvestmentDuration(totalSeconds) {
    if (!totalSeconds || totalSeconds <= 0) return'جاهز للاستلام!';
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hrs > 0) return`${hrs}س ${mins}د ${secs}ث`;
    if (mins > 0) return`${mins}د ${secs}ث`;
    return`${secs} ثانية`;
  }

  function renderBank() {
    const s = GameEngine.state;

    // Display basic balances
    const bCash = document.getElementById('bank-cash');
    if (bCash) {
      bCash.textContent =`${formatCompactNumber(s.cash)} EGP`;
      bCash.title =`${s.cash.toLocaleString()} EGP`;
    }
    const bBal = document.getElementById('bank-balance');
    if (bBal) {
      bBal.textContent =`${formatCompactNumber(s.bank)} EGP`;
      bBal.title =`${s.bank.toLocaleString()} EGP`;
    }

    // Show locked investments in bank
    const invContainer = document.getElementById('investments-locked-list');
    if (!invContainer) return;
    invContainer.innerHTML ='';

    if (s.investments.length === 0) {
      invContainer.innerHTML =`
        <div class="text-center text-slate-500 text-sm py-4 border border-dashed border-slate-800 rounded-lg">
          لا يوجد أصول مقفلة حالياً في الصناديق الاستثمارية.
        </div>`;
    } else {
      s.investments.forEach((inv, idx) => {
        const remainingSec = inv.ticksRemaining || 0;
        const totalPayout = Math.floor(inv.investedAmount * (1 + inv.rate));

        const row = document.createElement('div');
        row.className ='glass-panel p-3 rounded-lg border border-slate-800 flex justify-between items-center text-sm';
        row.innerHTML =`
          <div>
            <h5 class="font-bold text-white">${inv.name}</h5>
            <p class="text-xs text-slate-400 mt-1">الرأس مال المودع: <span class="numbers-font">${inv.investedAmount.toLocaleString()} EGP</span></p>
          </div>
          <div class="text-left">
            <span class="text-emerald-400 font-bold numbers-font block">+${totalPayout.toLocaleString()} EGP</span>
            <span id="inv-sec-${idx}" class="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full border border-slate-700 numbers-font inline-block mt-1">متبقي: ${formatInvestmentDuration(remainingSec)}</span>
          </div>`;
        invContainer.appendChild(row);
      });
    }
    // Fetch and render transfer requests & bank history
    fetchAndRenderTransferRequests();
    loadTransferHistory();
  }

  function updateBankInDOM() {
    const s = GameEngine.state;
    const cashEl = document.getElementById('bank-cash');
    if (cashEl) {
      cashEl.textContent =`${formatCompactNumber(s.cash)} EGP`;
      cashEl.title =`${s.cash.toLocaleString()} EGP`;
    }
    const balEl = document.getElementById('bank-balance');
    if (balEl) {
      balEl.textContent =`${formatCompactNumber(s.bank)} EGP`;
      balEl.title =`${s.bank.toLocaleString()} EGP`;
    }

    // Update Loan Info
    const maxLoan = Math.max(10000, Math.floor(s.netWorth * 0.35));
    const maxLoanEl = document.getElementById('loan-max-limit');
    if (maxLoanEl) {
      maxLoanEl.textContent =`${formatCompactNumber(maxLoan)} EGP`;
      maxLoanEl.title =`${maxLoan.toLocaleString()} EGP`;
    }

    const activeLoanEl = document.getElementById('loan-active-amount');
    const dueLoanEl = document.getElementById('loan-due-amount');
    const loanTimeEl = document.getElementById('loan-time-left');
    const loanBadgeEl = document.getElementById('loan-status-badge');
    const dailyLoanRemEl = document.getElementById('loan-daily-remaining');

    const todayStr = (typeof GameEngine.getTodayDateString ==='function') ? GameEngine.getTodayDateString() :'';
    const dailyUsed = (s.dailyLoans && s.dailyLoans.date === todayStr) ? (s.dailyLoans.count || 0) : 0;
    const remainingLoans = Math.max(0, 2 - dailyUsed);

    if (dailyLoanRemEl) {
      dailyLoanRemEl.textContent =`${remainingLoans} / 2`;
      dailyLoanRemEl.className =`numbers-font font-black ${remainingLoans > 0 ?'text-amber-400' :'text-rose-500'}`;
    }

    if (s.activeLoan && s.activeLoan.amount > 0) {
      if (activeLoanEl) activeLoanEl.textContent =`${s.activeLoan.amount.toLocaleString()} EGP`;
      if (dueLoanEl) dueLoanEl.textContent =`${(s.activeLoan.totalDue || 0).toLocaleString()} EGP`;
      if (s.activeLoan.isDefaulted) {
        if (loanTimeEl) {
          loanTimeEl.textContent ='منتهي! (+3% غرامة تأخير دورية)';
          loanTimeEl.className ='numbers-font font-black text-rose-500 animate-pulse';
        }
        if (loanBadgeEl) {
          loanBadgeEl.textContent ='️ متعثر (الحساب مجمد)';
          loanBadgeEl.className ='text-[10px] px-2.5 py-0.5 bg-red-600/30 text-red-300 border border-red-500 rounded-full font-black animate-pulse';
        }
      } else {
        const remainingSec = Math.max(0, s.activeLoan.ticksRemaining || 0);
        const mins = Math.floor(remainingSec / 60);
        const secs = remainingSec % 60;
        if (loanTimeEl) {
          loanTimeEl.textContent =`${mins}:${secs.toString().padStart(2,'0')} دقيقة`;
          loanTimeEl.className ='numbers-font font-bold text-sky-400';
        }
        if (loanBadgeEl) {
          loanBadgeEl.textContent ='قرض نشط (يلزم السداد)';
          loanBadgeEl.className ='text-[10px] px-2.5 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-full font-bold';
        }
      }
    } else {
      if (activeLoanEl) activeLoanEl.textContent ='لا يوجد قرض';
      if (dueLoanEl) dueLoanEl.textContent ='0 EGP';
      if (loanTimeEl) {
        loanTimeEl.textContent ='--';
        loanTimeEl.className ='numbers-font font-bold text-sky-400';
      }
      if (loanBadgeEl) {
        if (remainingLoans <= 0) {
          loanBadgeEl.textContent ='استُنفد الحد اليومي (2/2)';
          loanBadgeEl.className ='text-[10px] px-2.5 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full font-bold';
        } else {
          loanBadgeEl.textContent ='مؤهل للاقتراض';
          loanBadgeEl.className ='text-[10px] px-2.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full font-bold';
        }
      }
    }

    if (s.investments && s.investments.length > 0) {
      s.investments.forEach((inv, idx) => {
        const secEl = document.getElementById(`inv-sec-${idx}`);
        if (secEl) {
          secEl.textContent =`متبقي: ${formatInvestmentDuration(inv.ticksRemaining || 0)}`;
        }
      });
    }
  }

  // --- Work Shift Cooldown Controller ---
  function startWorkCooldown(btn) {
    if (!btn) return;
    workCooldownActive = true;

    const originalHTML = btn.innerHTML;
    const originalClasses = btn.className;

    // Apply disabled visual state
    btn.disabled = true;
    btn.className = btn.className
      .replace(/bg-yellow-\d+/g,'bg-slate-700')
      .replace(/hover:bg-yellow-\d+/g,'')
      .replace(/text-slate-950/g,'text-slate-400');
    btn.style.opacity ='0.65';
    btn.style.cursor ='not-allowed';

    const hasCronos = GameEngine.state && GameEngine.state.inventory && GameEngine.state.inventory.cronos_gear > 0;
    
    let cooldownReduction = 0.0;
    if (hasCronos) cooldownReduction += 0.15;
    
    const activeCarId = GameEngine.state && GameEngine.state.activeCar;
    if (activeCarId ==='lambo') {
      cooldownReduction += 0.15;
    }
    
    const totalMs = Math.floor(WORK_COOLDOWN_MS * (1.0 - cooldownReduction));
    const tickMs = 50;
    let elapsed = 0;

    // Show countdown inside button
    function renderCountdown() {
      const remaining = Math.ceil((totalMs - elapsed) / 1000);
      const progress = elapsed / totalMs;
      const barWidth = Math.round(progress * 100);
      btn.innerHTML =`
        <span class="flex items-center justify-center gap-2 w-full">
          <svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
          <span>مهلة زمنية... ${remaining}ث</span>
        </span>
        <div class="absolute bottom-0 right-0 h-0.5 bg-yellow-500/60 transition-all duration-75 rounded-b-lg" style="width: ${barWidth}%; left: 0;"></div>`;
      btn.style.position ='relative';
      btn.style.overflow ='hidden';
    }

    renderCountdown();

    workCooldownTimer = setInterval(() => {
      elapsed += tickMs;
      renderCountdown();

      if (elapsed >= totalMs) {
        clearInterval(workCooldownTimer);
        workCooldownTimer = null;
        workCooldownActive = false;

        // Restore button
        btn.disabled = false;
        btn.innerHTML = originalHTML;
        btn.className = originalClasses;
        btn.style.opacity ='';
        btn.style.cursor ='';
        btn.style.position ='';
        btn.style.overflow ='';
      }
    }, tickMs);
  }

  // --- Overtime Shift Cooldown Controller (20s) ---
  function startOvertimeCooldown(btn) {
    if (!btn) return;
    overtimeCooldownActive = true;

    const originalHTML = btn.innerHTML;
    const originalClasses = btn.className;

    btn.disabled = true;
    btn.className = btn.className
      .replace(/bg-gradient-to-r\s+from-amber-600\s+to-orange-600/g,'bg-slate-700')
      .replace(/hover:from-amber-500\s+hover:to-orange-500/g,'')
      .replace(/text-slate-950/g,'text-slate-400');
    btn.style.opacity ='0.65';
    btn.style.cursor ='not-allowed';

    const hasCronos = GameEngine.state && GameEngine.state.inventory && GameEngine.state.inventory.cronos_gear > 0;
    let cooldownReduction = 0.0;
    if (hasCronos) cooldownReduction += 0.15;

    const activeCarId = GameEngine.state && GameEngine.state.activeCar;
    if (activeCarId ==='lambo') {
      cooldownReduction += 0.15;
    }

    const totalMs = Math.floor(OVERTIME_COOLDOWN_MS * (1.0 - cooldownReduction));
    const tickMs = 100;
    let elapsed = 0;

    function renderCountdown() {
      const remaining = Math.ceil((totalMs - elapsed) / 1000);
      const progress = elapsed / totalMs;
      const barWidth = Math.round(progress * 100);
      btn.innerHTML =`
        <span class="flex items-center justify-center gap-2 w-full">
          <svg class="w-4 h-4 animate-spin text-orange-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
          <span>مهلة الإضافي... ${remaining}ث</span>
        </span>
        <div class="absolute bottom-0 right-0 h-1 bg-orange-500/70 transition-all duration-100 rounded-b-lg" style="width: ${barWidth}%; left: 0;"></div>`;
      btn.style.position ='relative';
      btn.style.overflow ='hidden';
    }

    renderCountdown();

    overtimeCooldownTimer = setInterval(() => {
      elapsed += tickMs;
      renderCountdown();

      if (elapsed >= totalMs) {
        clearInterval(overtimeCooldownTimer);
        overtimeCooldownTimer = null;
        overtimeCooldownActive = false;

        btn.disabled = false;
        btn.innerHTML = originalHTML;
        btn.className = originalClasses;
        btn.style.opacity ='';
        btn.style.cursor ='';
        btn.style.position ='';
        btn.style.overflow ='';
      }
    }, tickMs);
  }

  function setupEventListeners() {
    // Maintenance Popup Modal Event Listeners (New)
    const maintPopup = document.getElementById('maintenance-popup-modal');
    const btnCloseMaintPopup = document.getElementById('btn-close-maintenance-popup');
    const btnConfirmMaintPopup = document.getElementById('btn-confirm-maintenance-popup');
    if (maintPopup) {
      if (btnCloseMaintPopup) {
        btnCloseMaintPopup.addEventListener('click', () => {
          maintPopup.classList.add('hidden');
        });
      }
      if (btnConfirmMaintPopup) {
        btnConfirmMaintPopup.addEventListener('click', () => {
          maintPopup.classList.add('hidden');
        });
      }
    }

    // Gift Code Redeem Listener (Player)
    const btnPlayerRedeemGift = document.getElementById('btn-player-redeem-gift');
    if (btnPlayerRedeemGift) {
      btnPlayerRedeemGift.addEventListener('click', async () => {
        const codeInput = document.getElementById('player-gift-code-input');
        if (!codeInput) return;
        const code = codeInput.value.trim();
        if (!code) {
          showToast('خطأ إدخال','يرجى إدخال رمز الكود أولاً.','error');
          return;
        }

        try {
          btnPlayerRedeemGift.disabled = true;
          btnPlayerRedeemGift.textContent ='جاري التحقق...';

          const result = await AppDB.redeemGiftCode(code, GameEngine.activeUsername);

          const rText = (result && result.rewardText) ? result.rewardText : (result && result.amount ?`${Number(result.amount).toLocaleString()} EGP كاش` : (typeof result ==='number' ?`${result.toLocaleString()} EGP كاش` :'مكافأة نقدية'));
          showToast('تم استرداد الهدية!',`تهانينا! حصلت على: ${rText}`,'success');
          playMenuSound('success');

          // Apply changes to local GameEngine.state immediately
          if (result && result.playerUpdates && result.playerUpdates.cash !== undefined) {
            GameEngine.state.cash = Number(result.playerUpdates.cash);
            GameEngine.state.netWorth = Number(result.playerUpdates.netWorth);
          } else if (result && result.amount) {
            GameEngine.state.cash = (Number(GameEngine.state.cash) || 0) + Number(result.amount);
            GameEngine.state.netWorth = (Number(GameEngine.state.netWorth) || 0) + Number(result.amount);
          } else if (typeof result ==='number') {
            GameEngine.state.cash = (Number(GameEngine.state.cash) || 0) + result;
            GameEngine.state.netWorth = (Number(GameEngine.state.netWorth) || 0) + result;
          }

          // Persist immediately to local storage and queue cloud save
          if (typeof AppDB.setEncryptedLocalState ==='function') {
            AppDB.setEncryptedLocalState(GameEngine.activeUsername, GameEngine.state);
          }
          if (typeof AppDB.savePlayerState ==='function') {
            AppDB.savePlayerState(GameEngine.activeUsername, GameEngine.state);
          }

          codeInput.value ='';
          renderAll();
        } catch (err) {
          showToast('فشل استرداد الكود', err.message,'error');
        } finally {
          btnPlayerRedeemGift.disabled = false;
          btnPlayerRedeemGift.innerHTML ='<i class="fa-solid fa-gift"></i> <span>استرداد الهدية</span>';
        }
      });
    }

    const logoutBtn = document.getElementById('btn-user-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        performLogout(true);
      });
    }
    const logoutBtnMobile = document.getElementById('btn-user-logout-mobile');
    if (logoutBtnMobile) {
      logoutBtnMobile.addEventListener('click', () => {
        performLogout(true);
      });
    }

    const adminTriggerMobile = document.getElementById('btn-admin-panel-trigger-mobile');
    const adminModal = document.getElementById('admin-panel-modal');
    if (adminTriggerMobile && adminModal) {
      adminTriggerMobile.addEventListener('click', () => {
        adminModal.classList.remove('hidden');
        switchAdminTab('stats');
      });
    }

    // Quick Bet Presets (Casino)
    const quickBetBtns = document.querySelectorAll('.btn-quick-bet');
    quickBetBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = btn.getAttribute('data-target');
        const input = document.getElementById(targetId);
        if (!input) return;

        const currentVal = parseInt(input.value) || 0;
        const addAmount = parseInt(btn.getAttribute('data-amount'));
        const action = btn.getAttribute('data-action');
        const userCash = GameEngine.state.cash || 0;

        if (!isNaN(addAmount)) {
          input.value = Math.max(100, Math.min(userCash, currentVal + addAmount));
        } else if (action ==='half') {
          input.value = Math.max(100, Math.floor(currentVal / 2));
        } else if (action ==='max') {
          input.value = Math.max(100, Math.min(userCash, 50000000));
        }

        // Add subtle tactile bump animation
        btn.classList.add('scale-90');
        setTimeout(() => btn.classList.remove('scale-90'), 150);
      });
    });

    const s = GameEngine.state;

    // Shift worker button click — with 1.5-second cooldown + floating reward particle
    const jobWorkBtn = document.getElementById('btn-perform-shift');
    if (jobWorkBtn) {
      jobWorkBtn.addEventListener('click', () => {
        if (workCooldownActive) return;
        try {
          const res = GameEngine.performJobShift();
          const boosts = [];
          if (res.isEnergyBoosted) boosts.push(' مشروب الطاقة +12.5%');
          if (res.isPenBoosted) boosts.push('️ القلم الذهبي +8% XP');
          const boostText = boosts.length > 0 ?` (${boosts.join(' +')})` :'';

          showPassiveGainFloat(`+${res.salary.toLocaleString()} EGP`);
          const remText = res.dailyRemaining !== undefined ? ` (متبقي ${res.dailyRemaining} نوبة)` : '';
          showToast('عمل نوبة',`كسبت +${res.salary.toLocaleString()} EGP و +${res.xp} خبرة${boostText}${remText}.`,'success');
          renderAll();
          startWorkCooldown(jobWorkBtn);
        } catch (err) {
          showToast('خطأ العمل', err.message,'error');
        }
      });
    }

    // Overtime Double Shift Button — with 20-second cooldown
    const overtimeWorkBtn = document.getElementById('btn-perform-overtime-shift');
    if (overtimeWorkBtn) {
      overtimeWorkBtn.addEventListener('click', () => {
        if (overtimeCooldownActive) return;
        try {
          const res = GameEngine.performOvertimeShift();
          const boosts = [];
          if (res.isEnergyBoosted) boosts.push(' مشروب الطاقة +12.5%');
          if (res.isPenBoosted) boosts.push('️ القلم الذهبي +8% XP');
          const boostText = boosts.length > 0 ?` (${boosts.join(' +')})` :'';

          showPassiveGainFloat(`+${res.earnedSalary.toLocaleString()} EGP`);
          showToast('نوبة عمل إضافية مضاعفة',`كسبت +${res.earnedSalary.toLocaleString()} EGP و +${res.earnedXp} خبرة مضاعفة${boostText}!`,'success');
          renderAll();
          startOvertimeCooldown(overtimeWorkBtn);
        } catch (err) {
          showToast('خطأ العمل الإضافي', err.message,'error');
        }
      });
    }

    // 12-Hour AFK Auto-Manager Renewal Button
    const renewAfkBtn = document.getElementById('btn-renew-afk-manager');
    if (renewAfkBtn) {
      renewAfkBtn.addEventListener('click', () => {
        try {
          const res = GameEngine.renewAfkManager();
          playMenuSound('success');
          showToast('تجديد وردية الإدارة','تم تفعيل ترخيص الإدارة الذاتية والأرباح أثناء الغياب لمدة 12 ساعة بنجاح!','success');
          renderAll();
        } catch (err) {
          showToast('خطأ التجديد', err.message,'error');
        }
      });
    }

    // Tax Authority Panel Buttons
    const buyTaxShieldBtn = document.getElementById('btn-tax-buy-shield');
    if (buyTaxShieldBtn) {
      buyTaxShieldBtn.addEventListener('click', () => {
        try {
          GameEngine.buyStoreItem('tax_shield');
          playMenuSound('success');
          showToast('الدرع الضريبي','تم شراء وتفعيل الدرع الضريبي بنجاح! تم خفض ضريبة الثروة بنسبة 75% وتفعيل خصم ترقية المشاريع.','success');
          renderAll();
        } catch (err) {
          showToast('فشل التفعيل', err.message,'error');
        }
      });
    }

    const fileTaxReturnBtn = document.getElementById('btn-file-tax-return');
    if (fileTaxReturnBtn) {
      fileTaxReturnBtn.addEventListener('click', () => {
        try {
          const res = GameEngine.fileTaxDeclaration();
          playMenuSound('success');
          showToast('إقرار ضريبي طوعي',`تم تقديم الإقرار الضريبي وتسوية ${res.cost.toLocaleString()} ج.م بنجاح (+${res.xpGain} XP).`,'success');
          renderAll();
        } catch (err) {
          showToast('فشل تقديم الإقرار', err.message,'error');
        }
      });
    }

    // Bank Actions (Depositing)
    const depositBtn = document.getElementById('btn-bank-deposit');
    if (depositBtn) {
      depositBtn.addEventListener('click', () => {
        const input = document.getElementById('bank-amount-input');
        const val = parseInt(input.value);
        try {
          if (!val || val <= 0) throw new Error("يرجى إدخال مبلغ صحيح للإيداع.");
          GameEngine.depositToBank(val);
          input.value ='';
          showToast('إيداع بنكي',`تم إيداع ${val.toLocaleString()} EGP بنجاح في حسابك البنكي.`,'success');
          renderAll();
        } catch (err) {
          showToast('فشل الإيداع', err.message,'error');
        }
      });
    }

    const withdrawBtn = document.getElementById('btn-bank-withdraw');
    if (withdrawBtn) {
      withdrawBtn.addEventListener('click', () => {
        const input = document.getElementById('bank-amount-input');
        const val = parseInt(input.value);
        try {
          if (!val || val <= 0) throw new Error("يرجى إدخال مبلغ صحيح للسحب.");
          GameEngine.withdrawFromBank(val);
          input.value ='';
          showToast('سحب بنكي',`تم سحب ${val.toLocaleString()} EGP نقدية بنجاح.`,'success');
          renderAll();
        } catch (err) {
          showToast('فشل السحب', err.message,'error');
        }
      });
    }

    // Bank Loan Request Action
    const takeLoanBtn = document.getElementById('btn-take-loan');
    if (takeLoanBtn) {
      takeLoanBtn.addEventListener('click', () => {
        const input = document.getElementById('bank-loan-input');
        const val = parseInt(input.value);
        try {
          if (!val || val <= 0) throw new Error("يرجى إدخال مبلغ صحيح للاقتراض.");
          const res = GameEngine.takeBankLoan(val);
          input.value ='';
          showToast('تمويل مصرفي',`تم صرف قرض فوري بقيمة ${res.amount.toLocaleString()} EGP وإيداعه في الكاش!`,'success');
          renderAll();
        } catch (err) {
          showToast('رفض القرض', err.message,'error');
        }
      });
    }

    // Bank Loan Repayment Action
    const repayLoanBtn = document.getElementById('btn-repay-loan');
    if (repayLoanBtn) {
      repayLoanBtn.addEventListener('click', () => {
        try {
          const res = GameEngine.repayBankLoan();
          showToast('سداد القرض',`تم سداد القرض بالكامل بقيمة ${res.repaid.toLocaleString()} EGP بنجاح وتصفية المستحقات!`,'success');
          renderAll();
        } catch (err) {
          showToast('فشل السداد', err.message,'error');
        }
      });
    }

    // Preset Percentage shortcuts
    const bankPresets = document.querySelectorAll('.bank-preset');
    bankPresets.forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-action');
        const pct = parseFloat(btn.getAttribute('data-pct'));
        const input = document.getElementById('bank-amount-input');

        if (action ==='deposit') {
          input.value = Math.floor(GameEngine.state.cash * pct);
        } else {
          input.value = Math.floor(GameEngine.state.bank * pct);
        }
      });
    });

    // Wire Transfer Form Actions
    document.getElementById('btn-wire-submit').addEventListener('click', async () => {
      const recipient = document.getElementById('wire-recipient-input').value.trim();
      const amount = parseInt(document.getElementById('wire-amount-input').value);
      const wireSubmitBtn = document.getElementById('btn-wire-submit');
      const btnText = document.getElementById('wire-btn-text');
      const btnSpinner = document.getElementById('wire-btn-spinner');

      try {
        if (!recipient || isNaN(amount) || amount <= 0) {
          throw new Error("يرجى تعبئة حقل المستلم ومبلغ التحويل بشكل صحيح.");
        }

        // Show spinner
        wireSubmitBtn.disabled = true;
        btnText.classList.add('hidden');
        btnSpinner.classList.remove('hidden');

        await AppDB.executeWireTransfer(GameEngine.activeUsername, recipient, amount);

        // Update local state immediately to prevent overwriting during auto-saves
        if (GameEngine.state) {
          GameEngine.state.cash = Math.max(0, GameEngine.state.cash - amount);
          GameEngine.state.netWorth = Math.max(0, GameEngine.state.netWorth - amount);
        }

        // Fetch latest state to ensure 100% synchronization
        const updatedState = await AppDB.getPlayerState(GameEngine.activeUsername);
        if (updatedState) {
          GameEngine.state.cash = updatedState.cash;
          GameEngine.state.bank = updatedState.bank;
          GameEngine.state.netWorth = updatedState.netWorth;
        }

        // Reset fields
        document.getElementById('wire-recipient-input').value ='';
        document.getElementById('wire-amount-input').value ='';

        showToast('حوالة صادرة',`تم تحويل مبلغ ${amount.toLocaleString()} EGP بنجاح إلى"${recipient}".`,'success');

        // Log transaction locally
        addTransferHistoryRow(recipient, amount);

        renderAll();
      } catch (err) {
        showToast('فشل التحويل', err.message,'error');
      } finally {
        wireSubmitBtn.disabled = false;
        btnText.classList.remove('hidden');
        btnSpinner.classList.add('hidden');
      }
    });

    // Wire History Refresh Button
    const refreshWireBtn = document.getElementById('btn-refresh-wire-history');
    if (refreshWireBtn) {
      refreshWireBtn.addEventListener('click', () => {
        loadTransferHistory(true);
        showToast('تحديث السجل','تم تحديث سجل الحوالات البنكية.','info');
      });
    }

    // Transfer Request Submission
    const btnRequestSubmit = document.getElementById('btn-request-submit');
    if (btnRequestSubmit) {
      btnRequestSubmit.addEventListener('click', async () => {
        const recipient = document.getElementById('request-recipient-input').value.trim();
        const amount = parseInt(document.getElementById('request-amount-input').value);
        const spinner = document.getElementById('request-btn-spinner');

        try {
          if (!recipient || isNaN(amount) || amount <= 0) {
            throw new Error("يرجى تعبئة حقل المستلم ومبلغ الطلب بشكل صحيح.");
          }

          btnRequestSubmit.disabled = true;
          if (spinner) spinner.classList.remove('hidden');

          await AppDB.createTransferRequest(GameEngine.activeUsername, recipient, amount);

          // Reset fields
          document.getElementById('request-recipient-input').value ='';
          document.getElementById('request-amount-input').value ='';

          showToast('طلب تحويل',`تم إرسال طلب التحويل بمبلغ ${amount.toLocaleString()} EGP إلى"${recipient}" بنجاح.`,'success');

          await fetchAndRenderTransferRequests(true);
        } catch (err) {
          showToast('فشل طلب التحويل', err.message,'error');
        } finally {
          btnRequestSubmit.disabled = false;
          if (spinner) spinner.classList.add('hidden');
        }
      });
    }

    // Toggle Transfer Requests Tabs
    const tabIncomingBtn = document.getElementById('btn-req-tab-incoming');
    const tabSentBtn = document.getElementById('btn-req-tab-sent');
    const incomingList = document.getElementById('incoming-requests-list');
    const sentList = document.getElementById('sent-requests-list');

    if (tabIncomingBtn && tabSentBtn) {
      tabIncomingBtn.addEventListener('click', () => {
        requestsTabActive ='incoming';
        tabIncomingBtn.classList.add('bg-yellow-500','text-slate-950');
        tabIncomingBtn.classList.remove('text-slate-400');
        tabSentBtn.classList.remove('bg-yellow-500','text-slate-950');
        tabSentBtn.classList.add('text-slate-400');
        if (incomingList) incomingList.classList.remove('hidden');
        if (sentList) sentList.classList.add('hidden');
      });

      tabSentBtn.addEventListener('click', () => {
        requestsTabActive ='sent';
        tabSentBtn.classList.add('bg-yellow-500','text-slate-950');
        tabSentBtn.classList.remove('text-slate-400');
        tabIncomingBtn.classList.remove('bg-yellow-500','text-slate-950');
        tabIncomingBtn.classList.add('text-slate-400');
        if (sentList) sentList.classList.remove('hidden');
        if (incomingList) incomingList.classList.add('hidden');
      });
    }

    // Investment purchase
    const invButtons = document.querySelectorAll('.btn-invest-start');
    invButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.getAttribute('data-type');
        const inputId =`invest-amount-${type}`;
        const amount = parseInt(document.getElementById(inputId).value);

        try {
          if (isNaN(amount) || amount <= 0) throw new Error("يرجى إدخال مبلغ استثمار صحيح.");
          GameEngine.startInvestment(type, amount);
          document.getElementById(inputId).value ='';
          showToast('استثمار مقفل',`تم قفل مبلغ الاستثمار في صندوق: ${GameEngine.INVESTMENTS[type].name}`,'success');
          renderAll();
        } catch (err) {
          showToast('فشل الاستثمار', err.message,'error');
        }
      });
    });

    // Quick-bet modifier buttons for all casino games
    document.querySelectorAll('.btn-quick-bet').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.target;
        const input = document.getElementById(targetId);
        if (!input) return;
        let current = parseInt(input.value) || 0;
        if (btn.dataset.amount) {
          input.value = current + parseInt(btn.dataset.amount);
        } else if (btn.dataset.action ==='half') {
          input.value = Math.max(100, Math.floor(current / 2));
        } else if (btn.dataset.action ==='max') {
          input.value = Math.max(100, Math.floor(GameEngine.state.cash));
        }
        playCasinoSound('tick');
      });
    });

    // Sound toggle button
    const soundToggleBtn = document.getElementById('btn-casino-sound-toggle');
    if (soundToggleBtn) {
      soundToggleBtn.addEventListener('click', () => {
        casinoSoundEnabled = !casinoSoundEnabled;
        localStorage.setItem('rasalmal_casino_sound', casinoSoundEnabled);
        soundToggleBtn.innerHTML = casinoSoundEnabled
          ?'<i class="fa-solid fa-volume-high"></i><span>المؤثرات الصوتية: مفعلة</span>'
          :'<i class="fa-solid fa-volume-xmark text-slate-500"></i><span class="text-slate-500">المؤثرات الصوتية: مكتومة</span>';
        if (casinoSoundEnabled) playCasinoSound('coin');
      });
    }

    // Casino Game 1: 3D Royal Coin Flip
    const coinFlipBtn = document.getElementById('btn-flip-coin');
    if (coinFlipBtn) {
      coinFlipBtn.addEventListener('click', () => {
        const betInput = document.getElementById('coin-bet-input');
        const choice = document.querySelector('input[name="coin-choice"]:checked').value;
        const bet = parseInt(betInput.value);

        try {
          // Play immediately: checks daily limit, 5% cash cap, 6s cooldown, and saves state to prevent save-scumming
          const res = GameEngine.playCoinFlip(bet, choice, coinFlipStreak);

          coinFlipBtn.disabled = true;
          playCasinoSound('coin');

          const coinVisual = document.getElementById('coin-visual-3d') || document.getElementById('coin-visual');
          if (coinVisual) {
            coinVisual.style.transition ='transform 0.45s cubic-bezier(0.2, 0.8, 0.3, 1)';
            coinVisual.style.transform ='rotateY(1800deg) scale(1.1)';
          }

          setTimeout(() => {
            try {
              const isTails = (res.side ==='tails');
              if (coinVisual) {
                coinVisual.style.transition ='transform 0.2s ease-out';
                coinVisual.style.transform = isTails ?'rotateY(1980deg) scale(1)' :'rotateY(1800deg) scale(1)';
              }

              const streakBadge = document.getElementById('coin-streak-badge');
              const isEn = (window.currentLang ==='en');
              const currency = isEn ?'EGP' :'ج.م';

              if (res.won) {
                coinFlipStreak = (coinFlipStreak || 0) + 1;
                playCasinoSound('win');
                if (streakBadge) {
                  streakBadge.textContent = isEn ?`Streak: ${coinFlipStreak}x` :`سلسلة الانتصارات: ${coinFlipStreak}x متتالية`;
                  streakBadge.className ='text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30 animate-pulse';
                }
                const multText = res.streakMultiplier > 1 ? (isEn ?` (Streak Bonus: ${res.streakMultiplier}x)` :` (بونص سلسلة الفوز: ${res.streakMultiplier}x)`) :'';
                const sideText = res.side ==='heads' ? (isEn ?'Crown' :'التاج الملكي') : (isEn ?'Shield' :'الدرع الدفاعي');
                showToast(
                  isEn ?'Royal Win!' :'ربح ملكي!',
                  isEn
                    ?`Guessed right (${sideText})!${multText} Net profit: +${res.profit.toLocaleString()} ${currency}.`
                    :`صبت التخمين (${sideText})!${multText} كسبت صافي +${res.profit.toLocaleString()} ${currency}.`,'success'
                );
              } else {
                coinFlipStreak = 0;
                playCasinoSound('lose');
                if (streakBadge) {
                  streakBadge.textContent = isEn ?'Streak: 0' :'سلسلة الانتصارات: 0';
                  streakBadge.className ='text-[10px] text-slate-500 font-bold bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800';
                }
                const sideText = res.side ==='heads' ? (isEn ?'Crown' :'التاج') : (isEn ?'Shield' :'الدرع');
                showToast(
                  isEn ?'Round Lost' :'خسارة الجولة',
                  isEn
                    ?`Landed on (${sideText}). Lost bet -${res.loss.toLocaleString()} ${currency}.`
                    :`استقرت العملة على (${sideText}). خسرت -${res.loss.toLocaleString()} ${currency}.`,'error'
                );
              }
              renderAll();
            } catch (e) {
              showToast(window.currentLang ==='en' ?'Bet Error' :'خطأ رهان', e.message,'error');
            } finally {
              coinFlipBtn.disabled = false;
            }
          }, 450);

        } catch (err) {
          showToast(window.currentLang ==='en' ?'Bet Error' :'خطأ رهان', err.message,'error');
        }
      });
    }

    // Casino Game 2: Golden Neon Slots Machine
    const slotsSpinBtn = document.getElementById('btn-slots-spin');
    if (slotsSpinBtn) {
      slotsSpinBtn.addEventListener('click', () => {
        const betInput = document.getElementById('slots-bet-input');
        const bet = parseInt(betInput.value);

        try {
          // Play immediately in engine to prevent save-scumming & validate rules
          const res = GameEngine.playSlots(bet);

          slotsSpinBtn.disabled = true;
          playCasinoSound('coin');

          const r1 = document.getElementById('slot-reel-1');
          const r2 = document.getElementById('slot-reel-2');
          const r3 = document.getElementById('slot-reel-3');

          r1.classList.add('slot-blur-spin');
          r2.classList.add('slot-blur-spin');
          r3.classList.add('slot-blur-spin');

          const tempIcons = ['CROWN','DIAMOND','GOLD','SACK','KEY'];
          const spinInterval = setInterval(() => {
            r1.innerHTML = getReelSymbolIcon(tempIcons[Math.floor(Math.random() * tempIcons.length)]);
            r2.innerHTML = getReelSymbolIcon(tempIcons[Math.floor(Math.random() * tempIcons.length)]);
            r3.innerHTML = getReelSymbolIcon(tempIcons[Math.floor(Math.random() * tempIcons.length)]);
          }, 45);

          setTimeout(() => {
            try {
              clearInterval(spinInterval);

              r1.classList.remove('slot-blur-spin');
              r1.innerHTML = getReelSymbolIcon(res.reels[0]);
              playCasinoSound('tick');

              setTimeout(() => {
                r2.classList.remove('slot-blur-spin');
                r2.innerHTML = getReelSymbolIcon(res.reels[1]);
                playCasinoSound('tick');

                setTimeout(() => {
                  r3.classList.remove('slot-blur-spin');
                  r3.innerHTML = getReelSymbolIcon(res.reels[2]);

                  const isEn = (window.currentLang ==='en');
                  const currency = isEn ?'EGP' :'ج.م';

                  if (res.won) {
                    if (res.isJackpot) {
                      playCasinoSound('jackpot');
                      showToast(
                        isEn ?'Mega Jackpot!' :'جاكبوت كاسح!',
                        isEn 
                          ?` Jackpot! Net profit: +${res.profit.toLocaleString()} ${currency}!` 
                          :` مبروك! حصلت على الجاكبوت الذهبي! ربحت صافي +${res.profit.toLocaleString()} ${currency}!`,'success'
                      );
                    } else {
                      playCasinoSound('win');
                      showToast(
                        isEn ?'Slots Win' :'فوز الآلة',
                        isEn
                          ?`${res.message} Net profit: +${res.profit.toLocaleString()} ${currency}!`
                          :`${res.message} ربحت صافي +${res.profit.toLocaleString()} ${currency}!`,'success'
                      );
                    }
                  } else {
                    playCasinoSound('lose');
                    showToast(
                      isEn ?'Better Luck' :'حظ أوفر',
                      isEn
                        ?`${res.message} Lost -${bet.toLocaleString()} ${currency}.`
                        :`${res.message} خسرت -${bet.toLocaleString()} ${currency}.`,'error'
                    );
                  }
                  renderAll();
                  slotsSpinBtn.disabled = false;
                }, 140);
              }, 140);

            } catch (e) {
              clearInterval(spinInterval);
              showToast(window.currentLang ==='en' ?'Machine Error' :'خطأ الآلة', e.message,'error');
              slotsSpinBtn.disabled = false;
            }
          }, 240);

        } catch (err) {
          showToast(window.currentLang ==='en' ?'Bet Error' :'خطأ رهان', err.message,'error');
        }
      });
    }

    // Casino Game 3: Rocket Crash Bet Handlers
    const crashStartBtn = document.getElementById('btn-crash-start');
    if (crashStartBtn) {
      crashStartBtn.addEventListener('click', () => {
        runCrashBet();
      });
    }

    const crashCashoutBtn = document.getElementById('btn-crash-cashout');
    if (crashCashoutBtn) {
      crashCashoutBtn.addEventListener('click', () => {
        cashoutCrash();
      });
    }

    // Casino Game 4: European Roulette Handler
    const rouletteBtn = document.getElementById('btn-roulette-spin');
    if (rouletteBtn) {
      rouletteBtn.addEventListener('click', () => {
        const betInput = document.getElementById('roulette-bet-input');
        const bet = parseInt(betInput.value);
        const choice = document.querySelector('input[name="roulette-choice"]:checked').value;
        const wheel = document.getElementById('roulette-wheel');
        const resNum = document.getElementById('roulette-result-num');

        try {
          // Play immediately in engine to prevent save-scumming & enforce limits
          const res = GameEngine.playRoulette(bet, choice);

          rouletteBtn.disabled = true;
          playCasinoSound('tick');
          wheel.style.transform =`rotate(${1800 + Math.floor(Math.random() * 360)}deg)`;
          wheel.style.transition ='all 0.6s cubic-bezier(0.15, 0.9, 0.25, 1)';

          setTimeout(() => {
            try {
              resNum.textContent = res.rolledNumber;

              const isEn = (window.currentLang ==='en');
              const currency = isEn ?'EGP' :'ج.م';
              const colorLabel = res.color ==='red' ? (isEn ?'Red' :'أحمر') : (res.color ==='black' ? (isEn ?'Black' :'أسود') : (isEn ?'Green Zero' :'الصفر الأخضر'));

              if (res.won) {
                playCasinoSound('win');
                showToast(
                  isEn ?'Roulette Win!' :'فوز الروليت!',
                  isEn
                    ?`Roulette landed on ${res.rolledNumber} (${colorLabel})! Net profit: +${res.profit.toLocaleString()} ${currency}!`
                    :`أصابت روليت الحظ رقم ${res.rolledNumber} (${colorLabel})! ربحت صافي +${res.profit.toLocaleString()} ${currency}!`,'success'
                );
              } else {
                playCasinoSound('lose');
                showToast(
                  isEn ?'Roulette Loss' :'خسارة الروليت',
                  isEn
                    ?`Wheel stopped at ${res.rolledNumber} (${colorLabel}). Lost -${bet.toLocaleString()} ${currency}.`
                    :`استقرت العجلة على رقم ${res.rolledNumber} (${colorLabel}). خسرت -${bet.toLocaleString()} ${currency}.`,'error'
                );
              }

              renderAll();
            } catch (e) {
              showToast(isEn ?'Roulette Error' :'خطأ روليت', e.message,'error');
            } finally {
              rouletteBtn.disabled = false;
              wheel.style.transform ='rotate(0deg)';
              wheel.style.transition ='none';
            }
          }, 600);

        } catch (err) {
          showToast(window.currentLang ==='en' ?'Bet Error' :'خطأ رهان', err.message,'error');
        }
      });
    }

    // Casino Game 5: Wheel of Fortune Handler
    const wheelBtn = document.getElementById('btn-wheel-spin');
    if (wheelBtn) {
      wheelBtn.addEventListener('click', () => {
        const betInput = document.getElementById('wheel-bet-input');
        const bet = parseInt(betInput.value);
        const wheelVis = document.getElementById('wheel-of-fortune-visual');
        const resText = document.getElementById('wheel-multiplier-result');

        try {
          // Play immediately in engine to prevent save-scumming & enforce limits
          const res = GameEngine.playWheelOfFortune(bet);

          wheelBtn.disabled = true;
          playCasinoSound('tick');
          wheelVis.style.transform =`rotate(${1440 + Math.floor(Math.random() * 360)}deg)`;
          wheelVis.style.transition ='all 0.6s cubic-bezier(0.25, 1, 0.3, 1)';

          setTimeout(() => {
            try {
              resText.textContent =`${res.multiplier}x`;
              const isEn = (window.currentLang ==='en');
              const currency = isEn ?'EGP' :'ج.م';

              if (res.won) {
                playCasinoSound(res.multiplier >= 5.0 ?'jackpot' :'win');
                showToast(
                  isEn ?'Wheel Win!' :'ضربة عجلة الحظ!',
                  isEn
                    ?`Landed on ${res.multiplier}x! Net profit: +${res.profit.toLocaleString()} ${currency}.`
                    :`حصلت على مضاعف ${res.multiplier}x! ربحت صافي +${res.profit.toLocaleString()} ${currency}.`,'success'
                );
              } else if (res.isPush) {
                showToast(
                  isEn ?'Bet Refunded' :'استرداد الرهان',
                  isEn ?`Landed on 1.0x. Bet refunded.` :`حصلت على 1.0x واسترددت رهانك بالكامل.`,'info'
                );
              } else {
                playCasinoSound('lose');
                showToast(
                  isEn ?'Wheel Loss' :'خسارة العجلة',
                  isEn
                    ?`Wheel stopped at ${res.multiplier}x. Lost -${bet.toLocaleString()} ${currency}.`
                    :`توقفت العجلة عند مضاعف ${res.multiplier}x. خسرت -${bet.toLocaleString()} ${currency}.`,'error'
                );
              }

              renderAll();
            } catch (e) {
              showToast(isEn ?'Wheel Error' :'خطأ العجلة', e.message,'error');
            } finally {
              wheelBtn.disabled = false;
              wheelVis.style.transform ='rotate(0deg)';
              wheelVis.style.transition ='none';
            }
          }, 600);

        } catch (err) {
          showToast(window.currentLang ==='en' ?'Bet Error' :'خطأ رهان', err.message,'error');
        }
      });
    }

    // Casino Game 6: Lucky Royale Dice Handler
    const diceRollBtn = document.getElementById('btn-dice-roll');
    if (diceRollBtn) {
      diceRollBtn.addEventListener('click', () => {
        const betInput = document.getElementById('dice-bet-input');
        const bet = parseInt(betInput.value);
        const choice = document.querySelector('input[name="dice-choice"]:checked').value;
        const d1 = document.getElementById('dice-visual-1');
        const d2 = document.getElementById('dice-visual-2');
        const sumDisplay = document.getElementById('dice-sum-display');

        try {
          // Play immediately in engine to prevent save-scumming & enforce limits
          const res = GameEngine.playDice(bet, choice);

          diceRollBtn.disabled = true;
          playCasinoSound('dice');

          d1.classList.add('dice-rolling');
          d2.classList.add('dice-rolling');

          setTimeout(() => {
            try {
              d1.classList.remove('dice-rolling');
              d2.classList.remove('dice-rolling');

              d1.innerHTML = getDicePipIcon(res.die1 || res.d1);
              d2.innerHTML = getDicePipIcon(res.die2 || res.d2);
              if (sumDisplay) sumDisplay.textContent = res.sum;

              const isEn = (window.currentLang ==='en');
              const currency = isEn ?'EGP' :'ج.م';

              if (res.won) {
                playCasinoSound(res.multiplier >= 5 ?'jackpot' :'win');
                showToast(
                  isEn ?'Royale Dice Win!' :'فوز النرد الملكي!',
                  isEn
                    ?`${res.message} Net profit: +${res.profit.toLocaleString()} ${currency}!`
                    :`${res.message} ربحت صافي +${res.profit.toLocaleString()} ${currency}!`,'success'
                );
              } else {
                playCasinoSound('lose');
                showToast(
                  isEn ?'Dice Loss' :'خسارة النرد',
                  isEn
                    ?`${res.message} Lost -${res.loss.toLocaleString()} ${currency}.`
                    :`${res.message} خسرت -${res.loss.toLocaleString()} ${currency}.`,'error'
                );
              }

              renderAll();
            } catch (e) {
              showToast(isEn ?'Dice Error' :'خطأ النرد', e.message,'error');
            } finally {
              diceRollBtn.disabled = false;
            }
          }, 350);

        } catch (err) {
          showToast(window.currentLang ==='en' ?'Bet Error' :'خطأ رهان', err.message,'error');
        }
      });
    }

    // --- Casino Game 7: Royale Neon Blackjack ---
    let bjDeck = [];
    let bjPlayerHand = [];
    let bjDealerHand = [];
    let bjBet = 0;
    let bjActive = false;

    function getCardSuitSymbol(suit) {
      if (suit ==='H') return'️';
      if (suit ==='D') return'️';
      if (suit ==='C') return'️';
      if (suit ==='S') return'️';
      return suit;
    }

    function createDeck() {
      const suits = ['H','D','C','S'];
      const values = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
      const deck = [];
      for (let s of suits) {
        for (let v of values) {
          deck.push({ value: v, suit: s });
        }
      }
      return deck;
    }

    function shuffleDeck(deck) {
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
      return deck;
    }

    function getCardValue(card) {
      if (card.value ==='A') return 11;
      if (['K','Q','J'].includes(card.value)) return 10;
      return parseInt(card.value);
    }

    function calculateScore(hand) {
      let score = 0;
      let aces = 0;
      for (let card of hand) {
        score += getCardValue(card);
        if (card.value ==='A') aces++;
      }
      while (score > 21 && aces > 0) {
        score -= 10;
        aces--;
      }
      return score;
    }

    function formatCardHtml(card, hidden = false) {
      if (hidden) {
        return`<div class="w-10 h-14 rounded-lg bg-gradient-to-br from-indigo-950 to-purple-900 border border-indigo-500/50 flex items-center justify-center text-indigo-400 font-bold shadow shadow-indigo-500/20 animate-fade-in"><i class="fa-solid fa-square text-lg"></i></div>`;
      }
      const isRed = ['H','D'].includes(card.suit);
      const colorClass = isRed ?'text-rose-500 border-rose-500/30' :'text-slate-200 border-slate-700';
      return`<div class="w-10 h-14 rounded-lg bg-slate-900 border ${colorClass} flex flex-col justify-between p-1 shadow font-bold text-xs select-none animate-fade-in">
        <span class="text-[10px] leading-none self-start">${card.value}</span>
        <span class="text-base leading-none self-center">${getCardSuitSymbol(card.suit)}</span>
        <span class="text-[10px] leading-none self-end rotate-180">${card.value}</span>
      </div>`;
    }

    function updateBlackjackUI(dealerScoreHidden = true) {
      const pCardsContainer = document.getElementById('bj-player-cards');
      const dCardsContainer = document.getElementById('bj-dealer-cards');
      const pScoreDisplay = document.getElementById('bj-player-score');
      const dScoreDisplay = document.getElementById('bj-dealer-score');

      if (pCardsContainer) {
        pCardsContainer.innerHTML = bjPlayerHand.map(c => formatCardHtml(c)).join('');
      }
      if (dCardsContainer) {
        if (dealerScoreHidden) {
          dCardsContainer.innerHTML = formatCardHtml(bjDealerHand[0]) + formatCardHtml(null, true);
        } else {
          dCardsContainer.innerHTML = bjDealerHand.map(c => formatCardHtml(c)).join('');
        }
      }

      if (pScoreDisplay) pScoreDisplay.textContent = calculateScore(bjPlayerHand);
      if (dScoreDisplay) {
        if (dealerScoreHidden) {
          dScoreDisplay.textContent = getCardValue(bjDealerHand[0]);
        } else {
          dScoreDisplay.textContent = calculateScore(bjDealerHand);
        }
      }
    }

    const bjDealBtn = document.getElementById('btn-bj-deal');
    const bjHitBtn = document.getElementById('btn-bj-hit');
    const bjStandBtn = document.getElementById('btn-bj-stand');
    const bjDoubleBtn = document.getElementById('btn-bj-double');
    const bjActions = document.getElementById('bj-actions');
    const bjBetArea = document.getElementById('bj-bet-area');

    if (bjDealBtn) {
      bjDealBtn.addEventListener('click', () => {
        const betInput = document.getElementById('bj-bet-input');
        const bet = parseInt(betInput.value);

        try {
          // Check limits, 6s cooldown, daily cap, dynamic 5% cap, deduct cash & save state immediately
          GameEngine.checkCasinoAllowedAndDeduct(bet);
          bjBet = bet;
          bjActive = true;

          // Generate Deck and Deal
          bjDeck = shuffleDeck(createDeck());
          bjPlayerHand = [bjDeck.pop(), bjDeck.pop()];
          bjDealerHand = [bjDeck.pop(), bjDeck.pop()];

          playCasinoSound('card');
          updateBlackjackUI(true);

          bjDealBtn.classList.add('hidden');
          bjBetArea.classList.add('hidden');
          bjActions.classList.remove('hidden');

          // Check for initial player Blackjack
          const pScore = calculateScore(bjPlayerHand);
          if (pScore === 21) {
            endBlackjackRound('blackjack');
          } else {
            renderAll();
          }

        } catch (e) {
          showToast(window.currentLang ==='en' ?'Blackjack' :'بلاك جاك', e.message,'error');
        }
      });
    }

    if (bjHitBtn) {
      bjHitBtn.addEventListener('click', () => {
        if (!bjActive) return;
        bjPlayerHand.push(bjDeck.pop());
        playCasinoSound('card');
        updateBlackjackUI(true);

        const score = calculateScore(bjPlayerHand);
        if (score > 21) {
          endBlackjackRound('bust');
        } else if (score === 21) {
          bjStandBtn.click();
        }
      });
    }

    if (bjStandBtn) {
      bjStandBtn.addEventListener('click', () => {
        if (!bjActive) return;

        updateBlackjackUI(false);
        let dScore = calculateScore(bjDealerHand);

        const dealInterval = setInterval(() => {
          if (dScore < 17) {
            bjDealerHand.push(bjDeck.pop());
            playCasinoSound('card');
            updateBlackjackUI(false);
            dScore = calculateScore(bjDealerHand);
          } else {
            clearInterval(dealInterval);
            evaluateBlackjackResults();
          }
        }, 600);
      });
    }

    if (bjDoubleBtn) {
      bjDoubleBtn.addEventListener('click', () => {
        if (!bjActive) return;
        try {
          // Deduct matching bet for double down (skipCooldown=true since within active hand)
          GameEngine.checkCasinoAllowedAndDeduct(bjBet, true);
          bjBet *= 2;
          bjPlayerHand.push(bjDeck.pop());
          playCasinoSound('card');
          updateBlackjackUI(true);

          const score = calculateScore(bjPlayerHand);
          if (score > 21) {
            endBlackjackRound('bust');
          } else {
            bjStandBtn.click();
          }
        } catch (e) {
          showToast(window.currentLang ==='en' ?'Double Down' :'مضاعفة الرهان', e.message,'error');
        }
      });
    }

    function evaluateBlackjackResults() {
      const pScore = calculateScore(bjPlayerHand);
      const dScore = calculateScore(bjDealerHand);
      const hasVIP = GameEngine.state.inventory && GameEngine.state.inventory.vip_casino_pass > 0;

      if (dScore > 21) {
        endBlackjackRound('dealer_bust');
      } else if (pScore > dScore) {
        endBlackjackRound('win');
      } else if (pScore < dScore) {
        endBlackjackRound('lose');
      } else {
        if (hasVIP && [17, 18, 19].includes(pScore)) {
          endBlackjackRound('win_vip_push');
        } else {
          endBlackjackRound('push');
        }
      }
    }

    function endBlackjackRound(result) {
      bjActive = false;
      let multiplier = 0;
      let winText ='';
      let toastType ='success';
      let sound ='win';

      const isEn = (window.currentLang ==='en');
      const currency = isEn ?'EGP' :'ج.م';

      if (result ==='blackjack') {
        multiplier = 2.5; // Base 2.5x payout (+20% bonus applied via settleCasinoRound if VIP)
        sound ='jackpot';
      } else if (result ==='win' || result ==='dealer_bust' || result ==='win_vip_push') {
        multiplier = 2.0;
      } else if (result ==='push') {
        multiplier = 1.0;
        toastType ='info';
        sound ='tick';
      } else {
        multiplier = 0;
        toastType ='error';
        sound ='lose';
      }

      const grossPayout = Math.floor(bjBet * multiplier);
      const settlement = GameEngine.settleCasinoRound(bjBet, grossPayout,'بلاك جاك (Blackjack)');

      if (result ==='blackjack') {
        winText = isEn
          ?`Natural Blackjack! Net profit: +${settlement.profit.toLocaleString()} ${currency}.`
          :`بلاك جاك طبيعي! ربحت صافي +${settlement.profit.toLocaleString()} ${currency}.`;
      } else if (result ==='dealer_bust') {
        winText = isEn
          ?`Dealer Busted! Net profit: +${settlement.profit.toLocaleString()} ${currency}.`
          :`تجاوز الموزع! ربحت صافي +${settlement.profit.toLocaleString()} ${currency}.`;
      } else if (result ==='win_vip_push') {
        winText = isEn
          ?`Tie at ${calculateScore(bjPlayerHand)}! Awarded as win (VIP Perk) net: +${settlement.profit.toLocaleString()} ${currency}.`
          :`تعادل بمجموع ${calculateScore(bjPlayerHand)}! تم احتسابه فوزاً (ميزة VIP) صافي +${settlement.profit.toLocaleString()} ${currency}.`;
      } else if (result ==='win') {
        winText = isEn
          ?`Beat the Dealer! Net profit: +${settlement.profit.toLocaleString()} ${currency}.`
          :`تفوقت على الموزع! ربحت صافي +${settlement.profit.toLocaleString()} ${currency}.`;
      } else if (result ==='push') {
        winText = isEn
          ?`Push at ${calculateScore(bjPlayerHand)}. Bet refunded.`
          :`تعادل بمجموع ${calculateScore(bjPlayerHand)}؛ تم استرداد الرهان بالكامل.`;
      } else if (result ==='bust') {
        winText = isEn
          ?`Busted over 21! Lost bet -${bjBet.toLocaleString()} ${currency}.`
          :`تجاوزت الـ 21 (Bust)! خسرت الرهان -${bjBet.toLocaleString()} ${currency}.`;
      } else {
        winText = isEn
          ?`Dealer won. Lost bet -${bjBet.toLocaleString()} ${currency}.`
          :`تغلّب الموزع عليك! خسرت الرهان -${bjBet.toLocaleString()} ${currency}.`;
      }

      playCasinoSound(sound);
      showToast(
        result.includes('win') || result ==='blackjack' || result ==='dealer_bust' 
          ? (isEn ?'Blackjack Win' :'فوز بلاك جاك') 
          : (result ==='push' ? (isEn ?'Push' :'تعادل') : (isEn ?'Bet Lost' :'خسارة رهان')),
        winText,
        toastType
      );

      bjDealBtn.classList.remove('hidden');
      bjBetArea.classList.remove('hidden');
      bjActions.classList.add('hidden');

      updateBlackjackUI(false);
      renderAll();
    }

    // --- Police Raid overlay button actions ---
    const raidBribeBtn = document.getElementById('btn-raid-bribe');
    if (raidBribeBtn) {
      raidBribeBtn.addEventListener('click', async () => {
        try {
          raidBribeBtn.disabled = true;
          const res = GameEngine.resolveRaidBribe();
          playCasinoSound('success');
          showToast('تم دفع الرشوة',`تم تسوية الوضع بنجاح ودفع رشوة بقيمة ${res.bribeCost.toLocaleString()} EGP.`,'success');
          const overlay = document.getElementById('police-raid-overlay');
          if (overlay) overlay.classList.add('hidden');
          renderAll();
        } catch (e) {
          showToast('فشل الدفع', e.message,'error');
        } finally {
          raidBribeBtn.disabled = false;
        }
      });
    }

    const raidResistBtn = document.getElementById('btn-raid-resist');
    if (raidResistBtn) {
      raidResistBtn.addEventListener('click', async () => {
        try {
          raidResistBtn.disabled = true;
          const res = GameEngine.resolveRaidResist();
          const overlay = document.getElementById('police-raid-overlay');
          if (overlay) overlay.classList.add('hidden');

          if (res.success) {
            playCasinoSound('success');
            showToast('نجاح المقاومة!','نجحت في الإفلات من المداهمة الأمنية وتخفيض مستوى الملاحقة دون خسارة مليم واحد!','success');
          } else {
            playCasinoSound('fail');
            showToast('فشل المقاومة (سجن ومصادرة)',`ألقت الشرطة القبض عليك؛ تم مصادرة ${res.loss.toLocaleString()} EGP من كاشك القذر وسجنك لمدة 10 دقائق!`,'error');
          }
          renderAll();
        } catch (e) {
          showToast('خطأ مقاومة', e.message,'error');
        } finally {
          raidResistBtn.disabled = false;
        }
      });
    }

    // --- Unified Panel Help Modal Logic ---
    const HELP_CONTENT = {'panel-admin': {
        title:'لوحة التحكم والرقابة الإدارية',
        desc:`هذه هي محطة المراقبة والتحكم الشاملة الخاصة بمدير اللعبة (الآدمن):
        <br>• <strong>إدارة اللاعبين</strong>: ابحث عن اللاعبين واعرض بياناتهم التفصيلية (الأرصدة، الأصول، الشركات، والخبرة).
        <br>• <strong>فحص الحساب </strong>: استخدم أداة كشف الاحتيال المدمجة لتحليل المعاملات، الأرصدة، وخبرة اللاعب الحالية للكشف عن عمليات التلاعب أو الحقن غير القانوني.
        <br>• <strong>إجراءات إدارية</strong>: قم بحقن الأموال، تصفير الكروت، إرسال بث للجميع (Broadcast)، تنظيم وتفعيل المزادات والفعاليات المباشرة.`
      },'panel-dashboard': {
        title:'لوحة التحكم والعمل اليومي',
        desc:`هذه هي لوحة قيادتك المالية والتحكم اليومي:
        <br>• <strong>نوبة العمل العادية</strong>: تمنحك الراتب الأساسي لمهنتك الحالية ونقاط خبرة (XP).
        <br>• <strong>النوبة الإضافية (Overtime )</strong>: تمنحك <strong>2.5 ضعف الراتب + 3 أضعاف الخبرة (XP)</strong> ولكنها تزيد تعبك.
        <br>• <strong>رخصة العمل التلقائي (AFK Manager)</strong>: عند تفعيلها، تستمر شركاتك في جني أرباحها وتودعها في حسابك البنكي تلقائياً لمدة تصل إلى 12 ساعة وأنت خارج اللعبة.`
      },'panel-careers': {
        title:'الوظائف والمسار المهني',
        desc:`سلم الترقية وزيادة الدخل:
        <br>• تدرج من عامل باليومية إلى إمبراطور المستثمرين عبر 10 مراتب وظيفية.
        <br>• تحتاج إلى تجميع نقاط الخبرة المطلوبة (XP) والضغط على"ترقية وظيفية".
        <br>• تُضاف الرواتب تلقائياً إلى <strong>البنك</strong> لحمايتها من ضرائب السيولة.`
      },'panel-business': {
        title:'إمبراطورية التجارة وإدارة الأعمال',
        desc:`مصدر الأرباح اللحظية كل ثانية:
        <br>• يمكنك الاستثمار في 10 قطاعات مختلفة (قهوة، برمجيات، طيران، فضاء).
        <br>• قم بترقية مستوى الشركة لرفع طاقتها الاستيعابية، ووظف عمالة لمضاعفة الإنتاج.
        <br>• <strong>التسعير المرن</strong>: اضبط السعر المناسب؛ السعر المرتفع يقلل المبيعات، والسعر المنخفض يرفع المبيعات بهامش أقل.
        <br>• جميع أرباح الشركات تودع مباشرة في <strong>البنك</strong> لحمايتها.`
      },'panel-bank': {
        title:'البنك المركزي والادخار والتحويلات',
        desc:`حصنك المالي الآمن واستثمارك التلقائي:
        <br>• <strong>فائدة الادخار</strong>: تنمو ودائعك البنكية تلقائياً بفائدة مركبة بنسبة 0.0005% لكل ثانية (+5% إضافية عند قيادة رولز رويس Phantom).
        <br>• <strong>التحويلات المالية</strong>: أرسل الأموال لأي لاعب متواجد بالسيرفر فوراً وبشكل مباشر.
        <br>• <strong>القروض البنكية</strong>: خذ قرضاً لتمويل مشاريعك وسدده تدريجياً لتفادي عقوبات السجن الاقتصادي.`
      },'panel-assets': {
        title:'الأصول والعقارات والسيارات',
        desc:`تجميد الأرباح في أصول حقيقية:
        <br>• <strong>العقارات</strong>: اشترِ الفلل وناطحات السحاب والجزر لجني عوائد إيجار لحظية تضاف لحسابك.
        <br>• <strong>السيارات</strong>: امتلك السيارات الفارهة لركوبها أو تأجيرها للاعبين الآخرين لجني عائد دوري.
        <br>• الأصول العقارية والسيارات ترفع من <strong>صافي ثروتك (Net Worth)</strong> بشكل كبير.`
      },'panel-stocks': {
        title:'البورصة والمضاربة المالية',
        desc:`سوق الأسهم الحية:
        <br>• تداول في 8 أسهم وأصول مالية (CIB، فوري، بيتكوين، ذهب، إلخ).
        <br>• <strong>شريط الأخبار </strong>: راقب الأخبار؛ فالحدث الإيجابي يرفع السهم والسلبي يهبط به.
        <br>• <strong>توزيعات الأرباح</strong>: تحصل على عوائد أرباح دورية تلقائية لمجرد احتفاظك بالأسهم.`
      },'panel-taxes': {
        title:'مصلحة الضرائب والوعاء الضريبي',
        desc:`النظام المالي والضرائب:
        <br>• <strong>ضريبة الثروة</strong>: تفرض ضريبة تصاعدية إذا تخطت ثروتك 3 ملايين EGP.
        <br>• <strong>الدروع الضريبية</strong>: يمكنك شراء درع ضريبي من المتجر لحماية جزء من ثروتك وتقليل المبالغ المستقطعة تلقائياً.
        <br>• <strong>التهرب الضريبي</strong>: يؤدي لتصنيف حسابك غير ممتثل ويعرضك للغرامات الفورية.`
      },'panel-store': {
        title:'متجر كبار الشخصيات والحقيبة',
        desc:`المستلزمات ومقويات الكفاءة:
        <br>• اشترِ أغراض تعزز أدائك (القلم الذهبي لزيادة الـ XP، معالج الكوانتم لرفع أرباح شركاتك +12.5%، تذكرة VIP الكازينو لرفع الحظ).
        <br>• استخدم الأغراض مباشرة من الحقيبة لتفعيلها بمؤقت زمني محدد.`
      },'panel-trade': {
        title:'شركة الاستيراد والتصدير الدولية',
        desc:`التجارة العالمية والخدمات اللوجستية:
        <br>• <strong>الاستيراد</strong>: تعاقد على استيراد بضائع عالمية بأسعار الجملة وانتظر وصول الشحنة بحراً أو جواً (من 30 دقيقة إلى 24 ساعة).
        <br>• <strong>المستودع الجمركي</strong>: قم بتخزين الحاويات وتوسعة الطاقة الاستيعابية لمستودعك كلما كبرت أعمالك.
        <br>• <strong>مجلس المشترين والأسواق</strong>: اختر أفضل مشترٍ دولي يقدم أعلى هامش ربح (+35% إلى +313%) ووقع عقد التصدير.
        <br>• <strong>الشحن وتحصيل الأرباح</strong>: تتبع شحنة التصدير حتى تصل للمشتري، ثم حصّل أرباح الصفقة ومكاسب التجارة الدولية.`
      },'panel-industry': {
        title:'مجمع الصناعات وسلاسل الإمداد',
        desc:`سلاسل الإمداد والتصنيع المحلي:
        <br>• <strong>5 قطاعات صناعية كبرى</strong>: الصناعات الغذائية، صناعة السيارات، أشباه الموصلات والذكاء الاصطناعي، البتروكيماويات، وصناعات الفضاء.
        <br>• <strong>4 مراحل متكاملة</strong>: المواد الخام  المعالجة والتصنيع  التجميع والتقنية  الأسطول اللوجستي والنقل.
        <br>• <strong>عنق الزجاجة (Bottleneck)</strong>: إنتاجك مقيد بأضعف مرحلة؛ قم بترقية المراحل بتوازن لتعظيم التدفق الإنتاجي.
        <br>• <strong>البيع أو التصدير</strong>: يمكنك بيع المنتجات الجاهزة فوراً للكاش، أو تحويلها لمستودعك الجمركي لتصديرها بأعلى هامش ربح.`
      },'panel-blackmarket': {
        title:'السوق السوداء وعالم الظلال',
        desc:`عمليات التهريب الممنوعة وغسيل الأموال:
        <br>• صفقات غير مشروعة لتهريب الآثار والماس والسلاح تدر أرباحاً خيالية كاش قذر (Dirty Cash).
        <br>• <strong>المداهمات الأمنية </strong>: تجميع أكثر من 100K كاش قذر يعرضك للمداهمة الفجائية؛ ويجب دفع الرشوة أو المقاومة للإفلات.
        <br>• <strong>غسيل الأموال</strong>: شركاتك العادية تغسل أموالك تلقائياً كل ثانية بنسبة ضريبية 25%.`
      },'panel-casino': {
        title:'كازينو التسلية والألعاب الملكية',
        desc:`ألعاب الحظ والمخاطرة:
        <br>• 7 ألعاب مميزة: الصاروخ (Crash)، السلوتس، الروليت، النرد، ولعبة <strong>البلاك جاك الجديدة (الـ 21 )</strong>.
        <br>• راهن بذكاء لتفادي الخسارة، واستخدم تذكرة VIP Pass لرفع احتمالات الحظ ومضاعفة عوائد البلاك جاك وتفادي التعادل.`
      },'panel-leaderboard': {
        title:'توب الأغنياء وقاعة المشاهير',
        desc:`لوحة الترتيب العام المباشر:
        <br>• يتم ترتيب كافة لاعبي السيرفر بناءً على <strong>صافي الثروة الكلية (Net Worth)</strong>.
        <br>• يحصل أصحاب المراكز الثلاثة الأولى على التاج الذهبي  والرموز الملكية الخاصة التي تظهر أمام الجميع في السيرفر.`
      }
    };

    // Bind help buttons click events
    document.addEventListener('click', (e) => {
      const helpBtn = e.target.closest('.btn-panel-help');
      if (helpBtn) {
        e.preventDefault();
        const helpId = helpBtn.getAttribute('data-help');
        const content = HELP_CONTENT[helpId];
        if (content) {
          playCasinoSound('click');
          const modal = document.getElementById('panel-help-modal');
          const title = document.getElementById('panel-help-title');
          const body = document.getElementById('panel-help-content');
          
          if (title) title.innerHTML =`<i class="fa-solid fa-circle-question text-yellow-400"></i> <span>شرح صفحة: ${content.title}</span>`;
          if (body) body.innerHTML = content.desc;
          if (modal) modal.classList.remove('hidden');
        }
      }
    });

    const closeHelpBtn = document.getElementById('btn-close-panel-help');
    const closeHelpFooterBtn = document.getElementById('btn-close-panel-help-footer');
    const helpModal = document.getElementById('panel-help-modal');

    const hideHelpModal = () => {
      playCasinoSound('click');
      if (helpModal) helpModal.classList.add('hidden');
    };

    if (closeHelpBtn) closeHelpBtn.addEventListener('click', hideHelpModal);
    if (closeHelpFooterBtn) closeHelpFooterBtn.addEventListener('click', hideHelpModal);

    // Leaderboard Manual Refresh Handler
    const lbRefreshBtn = document.getElementById('btn-leaderboard-refresh');
    if (lbRefreshBtn) {
      lbRefreshBtn.addEventListener('click', async () => {
        playCasinoSound('tick');
        showToast('تحديث الترتيب','جاري جلب أحدث بيانات المتصدرين...','info');
        await renderLeaderboard(true);
      });
    }
    // Trade Company Subtabs Binding
    ['catalog','warehouse','buyers','shipments'].forEach(tab => {
      const btn = document.getElementById(`btn-trade-subtab-${tab}`);
      if (btn) {
        btn.addEventListener('click', () => {
          switchTradeSubtab(tab);
        });
      }
    });

    // Industrial Conglomerate Sector Tabs Binding
    const industryTabButtons = document.querySelectorAll('#industry-sector-tabs .industry-tab-btn');
    industryTabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const sec = btn.getAttribute('data-sector');
        switchIndustrySector(sec);
      });
    });

    setupV2UIHandlers();
  }

  function getReelSymbolIcon(sym) {
    const map = {'CROWN':'<i class="fa-solid fa-crown text-yellow-400 text-2xl"></i>','DIAMOND':'<i class="fa-solid fa-gem text-cyan-400 text-2xl"></i>','GOLD':'<i class="fa-solid fa-coins text-amber-400 text-2xl"></i>','SACK':'<i class="fa-solid fa-sack-dollar text-emerald-400 text-2xl"></i>','KEY':'<i class="fa-solid fa-key text-sky-400 text-2xl"></i>'
    };
    return map[sym] ||`<span class="text-xs font-bold text-slate-300">${sym}</span>`;
  }

  function getDicePipIcon(n) {
    const diceIcons = {
      1:'<i class="fa-solid fa-dice-one"></i>',
      2:'<i class="fa-solid fa-dice-two"></i>',
      3:'<i class="fa-solid fa-dice-three"></i>',
      4:'<i class="fa-solid fa-dice-four"></i>',
      5:'<i class="fa-solid fa-dice-five"></i>',
      6:'<i class="fa-solid fa-dice-six"></i>'
    };
    return diceIcons[n] ||`<i class="fa-solid fa-dice-d6"></i>`;
  }

  function getReelSymbolText(sym) {
    // Emojis strictly forbidden, mapping representation texts instead
    const map = {'GOLD':'ذهب [GOLD]','DIAMOND':'ألماس [DIAMOND]','COIN':'عملة [COIN]','BAG':'حقيبة [BAG]','KEY':'مفتاح [KEY]'
    };
    return map[sym] || sym;
  }

  let lastTransfersFetchTime = 0;
  let cachedTransfersList = [];

  async function loadTransferHistory(force = false) {
    const list = document.getElementById('wire-history-list');
    if (!list) return;

    const username = GameEngine.activeUsername;
    if (!username) return;

    const now = Date.now();
    if (force || now - lastTransfersFetchTime > 8000 || cachedTransfersList.length === 0) {
      lastTransfersFetchTime = now;
      try {
        if (cachedTransfersList.length === 0 && list.querySelector('.empty-wire-msg')) {
          list.innerHTML =`
            <div class="text-center text-slate-500 text-xs py-8 animate-pulse">
              <i class="fa-solid fa-spinner fa-spin text-emerald-400 text-lg mb-2 block"></i>
              جاري تحميل سجل التحويلات البنكية...
            </div>`;
        }
        const data = await AppDB.getPlayerTransfers(username, 30);
        cachedTransfersList = data || [];
      } catch (err) {
        console.warn('[UI] Failed to load transfers history:', err);
      }
    }

    renderTransferHistoryDOM();
  }

  function renderTransferHistoryDOM() {
    const list = document.getElementById('wire-history-list');
    if (!list) return;

    const username = GameEngine.activeUsername;
    if (!cachedTransfersList || cachedTransfersList.length === 0) {
      list.innerHTML =`
        <div class="empty-wire-msg text-center text-slate-500 text-xs py-8">
          <i class="fa-solid fa-receipt text-slate-600 text-2xl mb-2 block"></i>
          لا توجد حوالات بنكية مسجلة حتى الآن.
        </div>`;
      return;
    }

    list.innerHTML ='';
    cachedTransfersList.forEach(t => {
      const isSent = (t.sender === username);
      const counterpart = isSent ? t.recipient : t.sender;
      const amtStr = isSent ?`-${Number(t.amount || 0).toLocaleString()} EGP` :`+${Number(t.amount || 0).toLocaleString()} EGP`;
      const amtClass = isSent ?'text-rose-400' :'text-emerald-400';
      const bgBadge = isSent ?'bg-rose-500/10 border-rose-500/20 text-rose-400' :'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
      const icon = isSent ?'fa-arrow-up-right-from-square' :'fa-arrow-down-left-and-up-to-bracket';
      const label = isSent ?'صادرة إلى' :'واردة من';

      const timeVal = Number(t.created_at || t.timestamp || Date.now());
      const dateStr = new Date(timeVal).toLocaleString('ar-EG', {
        month:'numeric',
        day:'numeric',
        hour:'2-digit',
        minute:'2-digit'
      });

      const row = document.createElement('div');
      row.className ='flex justify-between items-center text-xs text-slate-300 p-2.5 rounded-xl bg-slate-900/40 border border-slate-800/80 hover:border-slate-700/60 transition';
      row.innerHTML =`
        <div class="flex items-center gap-2.5">
          <div class="w-7 h-7 rounded-lg flex items-center justify-center border ${bgBadge} shrink-0">
            <i class="fa-solid ${icon} text-[11px]"></i>
          </div>
          <div>
            <div class="flex items-center gap-1.5">
              <span class="text-[11px] text-slate-400">${label}</span>
              <strong class="text-white hover:text-emerald-400 cursor-pointer font-bold transition" onclick="window.UI.openPlayerProfileCard('${counterpart}')">${counterpart}</strong>
            </div>
            <div class="text-[9px] text-slate-500 numbers-font">${dateStr}</div>
          </div>
        </div>
        <div class="text-left">
          <span class="numbers-font font-black text-xs ${amtClass} block">${amtStr}</span>
          <span class="text-[9px] text-slate-500 font-bold">مكتملة ️</span>
        </div>`;
      list.appendChild(row);
    });
  }

  function addTransferHistoryRow(recipient, amount) {
    if (typeof loadTransferHistory ==='function') {
      loadTransferHistory(true);
    }
  }

  // --- Tab 5: Real Estate & Assets Panel (High-Performance In-Place Updates) ---
  let lastAssetsOwned = {};

  function renderAssets(force = false) {
    const s = GameEngine.state;
    const container = document.getElementById('assets-list');
    if (!container) return;

    let needsRebuild = force || container.children.length === 0;
    if (!needsRebuild) {
      for (const key of Object.keys(GameEngine.ASSETS)) {
        if (lastAssetsOwned[key] !== (s.assets[key] || 0)) {
          needsRebuild = true;
          break;
        }
      }
    }

    if (!needsRebuild) {
      updateAssetsInDOM();
      return;
    }

    container.innerHTML ='';
    lastAssetsOwned = {};

    Object.keys(GameEngine.ASSETS).forEach(key => {
      const asset = GameEngine.ASSETS[key];
      const owned = s.assets[key] || 0;
      lastAssetsOwned[key] = owned;

      const card = document.createElement('div');
      card.id =`asset-card-${key}`;
      card.className =`glass-panel p-5 rounded-xl border border-slate-800 flex flex-col justify-between`;
      
      const translatedAssetName = window.currentLang ==='en' ? (translationDict[asset.name] || asset.name) : asset.name;

      card.innerHTML =`
        <div class="flex justify-between items-start mb-3">
          <div>
            <h4 class="text-lg font-bold text-white">${translatedAssetName}</h4>
            <p class="text-xs text-slate-500 mt-1">${window.currentLang ==='en' ?'Generates stable passive income and property appreciation over time.' :'توليد عائد مالي مستقر، وتقدير لقيمة العقار بمرور الوقت.'}</p>
          </div>
          <span class="text-xs px-2.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded border border-emerald-500/30 font-bold">${window.currentLang ==='en' ?'Owned:' :'مملوك:'} <span id="asset-owned-${key}" class="numbers-font">${owned}</span></span>
        </div>

        <div class="text-sm text-slate-400 space-y-1 mb-5 border-t border-b border-slate-800/80 py-3 my-2">
          <div class="flex justify-between"><span>${window.currentLang ==='en' ?'Current Market Value:' :'القيمة السوقية الحالية:'}</span><span id="asset-cost-${key}" class="numbers-font text-yellow-500 font-semibold">${asset.cost.toLocaleString()} EGP</span></div>
          <div class="flex justify-between"><span>${window.currentLang ==='en' ?'Passive Rental Yield:' :'عائد الإيجار السلبي:'}</span><span id="asset-rent-${key}" class="numbers-font text-emerald-400">+${Math.floor(asset.rent * 0.1).toLocaleString()} EGP / ${window.currentLang ==='en' ?'cycle' :'دورة'}</span></div>
          <div class="flex justify-between"><span>${window.currentLang ==='en' ?'Immediate Liquidation (85%):' :'قيمة التسييل الفوري (85%):'}</span><span id="asset-liquid-${key}" class="numbers-font text-amber-500/80">${Math.floor(asset.cost * 0.85).toLocaleString()} EGP</span></div>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <button id="btn-buy-asset-${key}" class="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition">
            ${window.currentLang ==='en' ?'Buy Additional Unit' :'شراء وحدة إضافية'}
          </button>
          <button id="btn-sell-asset-${key}" class="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-bold transition" ${owned === 0 ?'disabled' :''}>
            ${window.currentLang ==='en' ?'Liquidate & Sell Unit' :'تسييل وبيع وحدة'}
          </button>
        </div>`;

      card.querySelector(`#btn-buy-asset-${key}`).addEventListener('click', () => {
        try {
          GameEngine.buyAsset(key);
          showToast('عقود عقارية',`تم شراء عقار"${asset.name}" بنجاح وإضافته لمحفظتك.`,'success');
          renderAssets(true);
          renderStatsBar();
        } catch (err) {
          showToast('مرفوض', err.message,'error');
        }
      });

      card.querySelector(`#btn-sell-asset-${key}`).addEventListener('click', () => {
        try {
          const cashBack = GameEngine.sellAsset(key);
          showToast('تسييل عقاري',`تم بيع العقار بنجاح وتسييل مبلغ بقيمة ${cashBack.toLocaleString()} EGP.`,'success');
          renderAssets(true);
          renderStatsBar();
        } catch (err) {
          showToast('فشل التسييل', err.message,'error');
        }
      });

      container.appendChild(card);
    });

    renderCarsTab();
  }

  function updateAssetsInDOM() {
    const s = GameEngine.state;
    Object.keys(GameEngine.ASSETS).forEach(key => {
      const asset = GameEngine.ASSETS[key];
      const owned = s.assets[key] || 0;

      const ownedEl = document.getElementById(`asset-owned-${key}`);
      if (ownedEl) ownedEl.textContent = owned;

      const costEl = document.getElementById(`asset-cost-${key}`);
      if (costEl) costEl.textContent =`${asset.cost.toLocaleString()} EGP`;

      const rentEl = document.getElementById(`asset-rent-${key}`);
      if (rentEl) rentEl.textContent =`+${Math.floor(asset.rent * 0.1)} EGP / دورة`;

      const liquidEl = document.getElementById(`asset-liquid-${key}`);
      if (liquidEl) liquidEl.textContent =`${Math.floor(asset.cost * 0.85).toLocaleString()} EGP`;

      const sellBtn = document.getElementById(`btn-sell-asset-${key}`);
      if (sellBtn) sellBtn.disabled = (owned === 0);
    });

    renderCarsTab();
  }

  // --- Tab 6: Stock Market Panel (Optimized In-Place Updates) ---
  let lastStocksBuilt = false;

  function renderStocks(force = false) {
    const s = GameEngine.state;
    const container = document.getElementById('stocks-list');
    if (!container) return;

    if (!force && lastStocksBuilt && container.children.length > 0) {
      updateStockPricesInDOM();
      return;
    }

    container.innerHTML ='';
    lastStocksBuilt = true;

    Object.keys(GameEngine.STOCKS).forEach(sym => {
      const stock = GameEngine.STOCKS[sym];
      const prices = GameEngine.stockPrices[sym] || [stock.basePrice];
      const currentPrice = prices[prices.length - 1];
      const prevPrice = prices[prices.length - 2] || currentPrice;

      const changePct = ((currentPrice - prevPrice) / prevPrice) * 100;
      const isUp = currentPrice >= prevPrice;

      const ownedData = s.stocks[sym] || { shares: 0, avgPrice: 0 };
      const totalWorth = ownedData.shares * currentPrice;
      const totalProfit = (currentPrice - ownedData.avgPrice) * ownedData.shares;

      const card = document.createElement('div');
      card.id =`stock-card-${sym}`;
      card.className =`glass-panel p-5 rounded-xl border border-slate-800 flex flex-col justify-between`;

      const svgPath = generateSparklineSVG(prices);

      const translatedStockName = window.currentLang ==='en' ? (translationDict[stock.name] || stock.name) : stock.name;

      card.innerHTML =`
        <div class="flex justify-between items-start mb-3">
          <div>
            <h4 class="text-md font-bold text-white">${translatedStockName}</h4>
            <span class="numbers-font text-xs text-slate-500 font-bold block mt-1">${stock.symbol}</span>
          </div>
          <div class="text-left">
            <span id="stock-price-${sym}" class="numbers-font font-bold block ${isUp ?'text-emerald-400 glow-emerald' :'text-rose-400 glow-rose'}">${currentPrice} EGP</span>
            <span id="stock-change-${sym}" class="numbers-font text-xs ${isUp ?'text-emerald-500' :'text-rose-500'} inline-block mt-0.5">${isUp ?'+' :''}${changePct.toFixed(2)}%</span>
          </div>
        </div>

        <div class="w-full h-16 bg-slate-950/50 rounded-lg p-1 border border-slate-900/60 my-2 overflow-hidden">
          <svg viewBox="0 0 100 30" class="w-full h-full" preserveAspectRatio="none">
            <path id="stock-svg-path-${sym}" d="${svgPath}" fill="none" stroke="${isUp ?'#10b981' :'#f43f5e'}" stroke-width="1.8" />
          </svg>
        </div>

        <div class="text-xs text-slate-400 space-y-1 mb-3 border-t border-slate-800 pt-3 mt-1">
          <div class="flex justify-between"><span>${window.currentLang ==='en' ?'Owned Shares:' :'الأسهم المملوكة:'}</span><span id="stock-shares-${sym}" class="numbers-font text-white">${ownedData.shares} ${window.currentLang ==='en' ?'shares' :'سهم'}</span></div>
          <div class="flex justify-between"><span>${window.currentLang ==='en' ?'Avg Buy Price:' :'متوسط سعر الشراء:'}</span><span id="stock-avg-${sym}" class="numbers-font">${ownedData.avgPrice} EGP</span></div>
          <div class="flex justify-between"><span>${window.currentLang ==='en' ?'Total Shares Value:' :'قيمة الأسهم الكلية:'}</span><span id="stock-worth-${sym}" class="numbers-font text-yellow-500 font-semibold">${totalWorth.toLocaleString()} EGP</span></div>
          <div class="flex justify-between"><span>${window.currentLang ==='en' ?'Portfolio Profit/Loss:' :'ربح/خسارة المحفظة:'}</span><span id="stock-profit-${sym}" class="numbers-font font-bold ${totalProfit >= 0 ?'text-emerald-400' :'text-rose-400'}">${totalProfit >= 0 ?'+' :''}${totalProfit.toLocaleString()} EGP</span></div>
          <div class="flex justify-between text-[11px] text-slate-500 border-t border-slate-800/60 pt-1.5 mt-1"><span>${window.currentLang ==='en' ?'Max Holding Limit:' :'سقف تملك السهم:'}</span><span class="numbers-font text-slate-300 font-semibold">${(stock.maxShares || 50000).toLocaleString()} ${window.currentLang ==='en' ?'shares' :'سهم'}</span></div>
        </div>
        <div class="mb-3 px-2 py-1 bg-slate-900/60 border border-slate-800 rounded-lg text-[10px] text-slate-400 flex items-center justify-between">
          <span><i class="fa-solid fa-scale-balanced text-yellow-500/80 mr-1"></i> عمولة سمسرة 3%</span>
          <span><i class="fa-solid fa-clock text-blue-400/80 mr-1"></i> حظر بيع 45ث</span>
        </div>

        <div class="grid grid-cols-2 gap-2 mb-2">
          <div class="flex flex-col">
            <div class="flex gap-1 mb-1">
              <button data-pct="0.25" class="btn-pct-buy flex-1 py-0.5 bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 rounded font-semibold">25%</button>
              <button data-pct="0.50" class="btn-pct-buy flex-1 py-0.5 bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 rounded font-semibold">50%</button>
              <button data-pct="1.00" class="btn-pct-buy flex-1 py-0.5 bg-slate-800 hover:bg-slate-700 text-[10px] text-yellow-400 rounded font-bold">100%</button>
            </div>
            <input type="number" id="shares-buy-input-${sym}" placeholder="${window.currentLang ==='en' ?'Qty' :'الكمية'}" class="glass-input w-full p-2 text-center text-xs rounded-lg mb-1.5" min="1" step="1"/>
            <button id="btn-buy-shares-${sym}" class="py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition">${window.currentLang ==='en' ?'Buy Shares' :'شراء الأسهم'}</button>
          </div>
          <div class="flex flex-col">
            <div class="flex gap-1 mb-1">
              <button id="btn-sell-all-${sym}" class="w-full py-0.5 bg-rose-950/60 hover:bg-rose-900/80 border border-rose-500/30 text-[10px] text-rose-300 rounded font-bold" ${ownedData.shares === 0 ?'disabled' :''}>${window.currentLang ==='en' ?' Sell All' :' بيع كل الأسهم'}</button>
            </div>
            <input type="number" id="shares-sell-input-${sym}" placeholder="${window.currentLang ==='en' ?'Qty' :'الكمية'}" class="glass-input w-full p-2 text-center text-xs rounded-lg mb-1.5" min="1" step="1"/>
            <button id="btn-sell-shares-${sym}" class="py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition" ${ownedData.shares === 0 ?'disabled' :''}>${window.currentLang ==='en' ?'Sell Shares' :'بيع الأسهم'}</button>
          </div>
        </div>`;

      // Percentage Buy Click Listeners
      card.querySelectorAll('.btn-pct-buy').forEach(pctBtn => {
        pctBtn.addEventListener('click', () => {
          const pct = parseFloat(pctBtn.getAttribute('data-pct'));
          const prices = GameEngine.stockPrices[sym] || [stock.basePrice];
          const currP = prices[prices.length - 1];
          const availableCash = GameEngine.state.cash * pct;
          const maxSharesPossible = Math.floor(availableCash / currP);
          const input = card.querySelector(`#shares-buy-input-${sym}`);
          if (input) input.value = maxSharesPossible > 0 ? maxSharesPossible : 1;
        });
      });

      // Sell All Shares trigger
      const sellAllBtn = card.querySelector(`#btn-sell-all-${sym}`);
      if (sellAllBtn) {
        sellAllBtn.addEventListener('click', () => {
          try {
            const owned = GameEngine.state.stocks[sym] || { shares: 0, avgPrice: 0 };
            if (owned.shares <= 0) throw new Error("لا تملك أي أسهم في هذه الشركة لبيعها.");
            const prevAvgPrice = owned.avgPrice || 0;
            const sharesToSell = owned.shares;
            const res = GameEngine.sellStock(sym, sharesToSell);
            const totalPayout = res.totalReturn || (res.price * res.shares);
            const costBasis = prevAvgPrice * sharesToSell;
            const profitOrLoss = totalPayout - costBasis;
            const pnlText = profitOrLoss >= 0
              ?`(صافي ربح: +${profitOrLoss.toLocaleString()} EGP )`
              :`(صافي خسارة: -${Math.abs(profitOrLoss).toLocaleString()} EGP )`;
            
            showToast(
              profitOrLoss >= 0 ?'بيع كلي رابح!' :'بيع وتسييل كلي',`تم بيع كامل الأسهم (${res.shares} سهم) بقيمة +${totalPayout.toLocaleString()} EGP ${prevAvgPrice > 0 ? pnlText :''}`,
              profitOrLoss >= 0 ?'success' :'info'
            );
            renderStocks(true);
            renderStatsBar();
          } catch (err) {
            showToast('فشل البيع', err.message,'error');
          }
        });
      }

      // Buy Shares trigger
      card.querySelector(`#btn-buy-shares-${sym}`).addEventListener('click', () => {
        const input = card.querySelector(`#shares-buy-input-${sym}`);
        const count = parseInt(input.value);
        try {
          if (!count || count <= 0) throw new Error("يرجى إدخال عدد أسهم صحيح.");
          const res = GameEngine.buyStock(sym, count);
          input.value ='';
          showToast('شراء أسهم',`تم شراء عدد ${res.shares} سهم من سهم"${stock.name}" بنجاح.`,'success');
          renderStocks(true);
          renderStatsBar();
        } catch (err) {
          showToast('فشل الشراء', err.message,'error');
        }
      });

      // Sell Shares trigger
      card.querySelector(`#btn-sell-shares-${sym}`).addEventListener('click', () => {
        const input = card.querySelector(`#shares-sell-input-${sym}`);
        const count = parseInt(input.value);
        try {
          if (!count || count <= 0) throw new Error("يرجى إدخال عدد أسهم صحيح.");
          const owned = GameEngine.state.stocks[sym] || { shares: 0, avgPrice: 0 };
          const prevAvgPrice = owned.avgPrice || 0;
          const res = GameEngine.sellStock(sym, count);
          const totalPayout = res.totalReturn || (res.price * res.shares);
          const costBasis = prevAvgPrice * res.shares;
          const profitOrLoss = totalPayout - costBasis;
          const pnlText = profitOrLoss >= 0
            ?`(صافي ربح: +${profitOrLoss.toLocaleString()} EGP )`
            :`(صافي خسارة: -${Math.abs(profitOrLoss).toLocaleString()} EGP )`;

          input.value ='';
          showToast(
            profitOrLoss >= 0 ?'بيع أسهم رابح!' :'بيع أسهم',`تم بيع عدد ${res.shares} سهم بقيمة +${totalPayout.toLocaleString()} EGP ${prevAvgPrice > 0 ? pnlText :''}`,
            profitOrLoss >= 0 ?'success' :'info'
          );
          renderStocks(true);
          renderStatsBar();
        } catch (err) {
          showToast('فشل البيع', err.message,'error');
        }
      });

      container.appendChild(card);
    });
  }

  function updateStockPricesInDOM() {
    const s = GameEngine.state;
    Object.keys(GameEngine.STOCKS).forEach(sym => {
      const stock = GameEngine.STOCKS[sym];
      const prices = GameEngine.stockPrices[sym] || [stock.basePrice];
      const currentPrice = prices[prices.length - 1];
      const prevPrice = prices[prices.length - 2] || currentPrice;
      const changePct = ((currentPrice - prevPrice) / prevPrice) * 100;
      const isUp = currentPrice >= prevPrice;

      const ownedData = s.stocks[sym] || { shares: 0, avgPrice: 0 };
      const totalWorth = ownedData.shares * currentPrice;
      const totalProfit = (currentPrice - ownedData.avgPrice) * ownedData.shares;

      const priceEl = document.getElementById(`stock-price-${sym}`);
      if (priceEl) {
        priceEl.textContent =`${currentPrice} EGP`;
        priceEl.className =`numbers-font font-bold block ${isUp ?'text-emerald-400 glow-emerald' :'text-rose-400 glow-rose'}`;
      }

      const changeEl = document.getElementById(`stock-change-${sym}`);
      if (changeEl) {
        changeEl.textContent =`${isUp ?'+' :''}${changePct.toFixed(2)}%`;
        changeEl.className =`numbers-font text-xs ${isUp ?'text-emerald-500' :'text-rose-500'} inline-block mt-0.5`;
      }

      const svgPathEl = document.getElementById(`stock-svg-path-${sym}`);
      if (svgPathEl) {
        svgPathEl.setAttribute('d', generateSparklineSVG(prices));
        svgPathEl.setAttribute('stroke', isUp ?'#10b981' :'#f43f5e');
      }

      const worthEl = document.getElementById(`stock-worth-${sym}`);
      if (worthEl) worthEl.textContent =`${totalWorth.toLocaleString()} EGP`;

      const profitEl = document.getElementById(`stock-profit-${sym}`);
      if (profitEl) {
        profitEl.textContent =`${totalProfit >= 0 ?'+' :''}${totalProfit.toLocaleString()} EGP`;
        profitEl.className =`numbers-font font-bold ${totalProfit >= 0 ?'text-emerald-400' :'text-rose-400'}`;
      }

      const sharesEl = document.getElementById(`stock-shares-${sym}`);
      if (sharesEl) sharesEl.textContent =`${ownedData.shares} سهم`;

      const avgEl = document.getElementById(`stock-avg-${sym}`);
      if (avgEl) avgEl.textContent =`${ownedData.avgPrice} EGP`;

      const sellAllBtn = document.getElementById(`btn-sell-all-${sym}`);
      if (sellAllBtn) sellAllBtn.disabled = (ownedData.shares === 0);

      const sellBtn = document.getElementById(`btn-sell-shares-${sym}`);
      if (sellBtn) sellBtn.disabled = (ownedData.shares === 0);
    });

    const tickerEl = document.getElementById('stock-market-news-ticker');
    if (tickerEl && typeof GameEngine.getCurrentMarketTicker ==='function') {
      const tickerText = GameEngine.getCurrentMarketTicker();
      if (tickerText && tickerEl.textContent !== tickerText) {
        tickerEl.textContent = tickerText;
      }
    }

    // Update Live 15-Minute Candlestick Session Countdown Timer
    const sessionTimerEl = document.getElementById('stock-session-timer');
    if (sessionTimerEl && typeof GameEngine.getStockSessionTimeRemaining ==='function') {
      const remainingMs = GameEngine.getStockSessionTimeRemaining();
      const totalSec = Math.floor(remainingMs / 1000);
      const mins = Math.floor(totalSec / 60);
      const secs = totalSec % 60;
      sessionTimerEl.textContent =`${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;
    }
  }

  // Draw Line Charts inside SVG
  function generateSparklineSVG(prices) {
    if (prices.length < 2) return"M 0 15 L 100 15";
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min === 0 ? 1 : max - min;

    const width = 100;
    const height = 30;

    let path ="";
    prices.forEach((price, idx) => {
      const x = (idx / (prices.length - 1)) * width;
      // Invert Y axis since SVG 0 is top
      const y = height - ((price - min) / range) * (height - 6) - 3;
      path +=`${idx === 0 ?'M' :'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    });
    return path;
  }

  // --- Tab 7: Tax Authority & Fiscal Policy Panel ---
  function renderTaxesTab() {
    if (!GameEngine.calculateTaxReport) return;
    const s = GameEngine.state;
    const taxReport = GameEngine.calculateTaxReport();

    // Investor Tax ID & Status
    const idEl = document.getElementById('tax-investor-id');
    if (idEl) {
      idEl.textContent =`EG-TAX-${(GameEngine.activeUsername ||'ANON').toUpperCase().substring(0, 10)}`;
    }

    // 4 KPI Cards
    const taxableEl = document.getElementById('tax-kpi-taxable');
    if (taxableEl) taxableEl.textContent =`${taxReport.taxableNetWorth.toLocaleString()} EGP`;

    let bracketName = taxReport.bracketName;
    if (window.currentLang ==='en') {
      if (bracketName.includes('الشريحة الأولى')) bracketName ='First Bracket (Fully Exempt)';
      else if (bracketName.includes('الشريحة الفضية')) bracketName ='Silver Bracket (3M - 15M EGP)';
      else if (bracketName.includes('شريحة كبار الممولين')) bracketName ='Major Taxpayer Bracket (15M - 50M EGP)';
      else if (bracketName.includes('شريحة حيتان المال')) bracketName ='Whale & Billionaire Bracket (+50M EGP)';
    }

    const bracketEl = document.getElementById('tax-kpi-bracket');
    if (bracketEl) {
      bracketEl.textContent = bracketName;
      bracketEl.className =`text-sm font-black ${taxReport.bracketColor} block mt-1`;
    }

    const deductionEl = document.getElementById('tax-kpi-deduction');
    if (deductionEl) deductionEl.textContent = taxReport.taxPerSecond.toLocaleString();

    const ratePctEl = document.getElementById('tax-kpi-rate-pct');
    if (ratePctEl) ratePctEl.textContent = taxReport.effectiveRatePct;

    const totalPaidEl = document.getElementById('tax-kpi-total-paid');
    if (totalPaidEl) totalPaidEl.textContent =`${(taxReport.totalTaxesPaid || 0).toLocaleString()} EGP`;

    // Tax Shield Status Card
    const shieldBadge = document.getElementById('tax-shield-active-badge');
    const shieldTimeLeft = document.getElementById('tax-shield-time-left');
    const buyShieldLabel = document.getElementById('tax-buy-shield-label');

    if (shieldBadge) {
      if (taxReport.taxShieldActive) {
        shieldBadge.className ='text-[10px] px-2.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full font-bold animate-pulse';
        shieldBadge.textContent = window.currentLang ==='en' ?'Active ️ (-50%)' :'نشط وفعال ️ (-50%)';
      } else {
        shieldBadge.className ='text-[10px] px-2.5 py-0.5 bg-slate-800 text-slate-400 rounded-full font-bold';
        shieldBadge.textContent = window.currentLang ==='en' ?'Inactive ️' :'غير مفعل ️';
      }
    }

    if (shieldTimeLeft) {
      if (taxReport.taxShieldActive) {
        const sec = (taxReport.shieldDurationTicks || 0) * 3;
        shieldTimeLeft.textContent = window.currentLang ==='en' ?`Validity remaining: ${sec} seconds` :`متبقي على الصلاحية: ${sec} ثانية`;
        shieldTimeLeft.className ='text-[11px] text-emerald-400 font-mono font-bold';
      } else {
        shieldTimeLeft.textContent = window.currentLang ==='en' ?'Duration: 12 hours (43,200 seconds)' :'المدة: 12 ساعة (43,200 ثانية)';
        shieldTimeLeft.className ='text-[11px] text-slate-400 font-mono';
      }
    }

    if (buyShieldLabel) {
      buyShieldLabel.textContent = taxReport.taxShieldActive 
        ? (window.currentLang ==='en' ?'Renew Tax Shield (550,000 EGP)' :'تجديد وتمديد الدرع الضريبي (550,000 EGP)')
        : (window.currentLang ==='en' ?'Purchase Tax Shield (550,000 EGP)' :'شراء وتفعيل الدرع الضريبي (550,000 EGP)');
    }

    // Active row badges in table
    for (let i = 1; i <= 4; i++) {
      const badge = document.getElementById(`tax-badge-row-${i}`);
      if (badge) {
        if (taxReport.bracketId === i) {
          badge.className ='px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
          badge.textContent = window.currentLang ==='en' ?'Current Bracket' :'شريحتك الحالية';
        } else {
          badge.className ='px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-500';
          badge.textContent = window.currentLang ==='en' ?'Exempt' :'غير خاضع';
        }
      }
    }
  }

  // --- Tab 8: Store & Inventory Panel ---
  function renderStore() {
    const s = GameEngine.state;

    // Render store shelf
    const shelf = document.getElementById('store-shelf');
    shelf.innerHTML ='';

    Object.keys(GameEngine.STORE_ITEMS).forEach(id => {
      const item = GameEngine.STORE_ITEMS[id];
      const count = s.inventory[id] || 0;
      const ticksRemaining = (s.itemDurations && s.itemDurations[id]) ? s.itemDurations[id] : 0;
      const secRemaining = ticksRemaining * 3;

      const maxDailyUses = item.maxDailyUses || 3;
      const todayStr = (typeof GameEngine.getTodayDateString ==='function') ? GameEngine.getTodayDateString() :'';
      const usedToday = (s.dailyToolUses && s.dailyToolUses.date === todayStr && s.dailyToolUses.uses) ? (s.dailyToolUses.uses[id] || 0) : 0;
      const remainingDailyUses = Math.max(0, maxDailyUses - usedToday);
      const isCurrentlyActive = (count > 0 && ticksRemaining > 0);

      let btnLabel = window.currentLang ==='en' ?'Buy & Activate Effect' :'شراء وتفعيل المفعول';
      let btnClass ='w-full py-2 bg-yellow-500 hover:bg-yellow-400 text-slate-950 rounded-lg text-xs font-bold transition shadow-lg shadow-yellow-500/10';
      let btnDisabled = false;

      if (isCurrentlyActive) {
        btnLabel = window.currentLang ==='en' ?`Active (${secRemaining}s)` :`الأداة نشطة حالياً (${secRemaining}ث)`;
        btnClass ='w-full py-2 bg-slate-800 text-slate-400 rounded-lg text-xs font-bold cursor-not-allowed border border-slate-700';
        btnDisabled = true;
      } else if (remainingDailyUses <= 0) {
        btnLabel = window.currentLang ==='en' ?`Daily Limit Reached (${maxDailyUses}/${maxDailyUses})` :`استُنفد الحد اليومي (${maxDailyUses}/${maxDailyUses})`;
        btnClass ='w-full py-2 bg-rose-950/40 text-rose-400 border border-rose-800/60 rounded-lg text-xs font-bold cursor-not-allowed';
        btnDisabled = true;
      }

      const card = document.createElement('div');
      card.className ='glass-panel p-4 rounded-xl border border-slate-800 flex flex-col justify-between items-start';

      const translatedName = window.currentLang ==='en' ? (translationDict[item.name] || item.name) : item.name;
      const translatedDesc = window.currentLang ==='en' ? (translationDict[item.desc] || item.desc) : item.desc;

      card.innerHTML =`
        <div class="mb-3 w-full">
          <div class="flex justify-between items-center mb-1">
            <h4 class="font-bold text-white text-sm">${translatedName}</h4>
            <span class="text-xs px-2 py-0.5 bg-slate-800 text-slate-400 border border-slate-700 rounded-full font-bold">${window.currentLang ==='en' ?'Available:' :'متاح:'} <span class="numbers-font">${count}</span></span>
          </div>
          <p class="text-[11px] text-slate-400 leading-relaxed mb-2">${translatedDesc || (window.currentLang ==='en' ?'Temporary special effect that will eventually self-destruct.' :'مفعول خاص ومؤقت ينتهي ويدمر ذاته.')}</p>
        </div>
        <div class="w-full text-xs text-slate-400 space-y-1 mb-4 border-t border-slate-800/60 pt-2.5">
          <div class="flex justify-between"><span>${window.currentLang ==='en' ?'Selling Price:' :'سعر البيع:'}</span><span class="numbers-font text-yellow-500 font-bold">${item.cost.toLocaleString()} EGP</span></div>
          <div class="flex justify-between"><span>${window.currentLang ==='en' ?'Validity Duration:' :'مدة الصلاحية:'}</span><span class="numbers-font text-rose-400 font-semibold">${item.durationTicks * 3} ${window.currentLang ==='en' ?'seconds' :'ثانية'}</span></div>
          <div class="flex justify-between"><span>${window.currentLang ==='en' ?'Daily Remaining Uses:' :'الاستخدام اليومي المتبقي:'}</span><span class="numbers-font font-black ${remainingDailyUses > 0 ?'text-amber-400' :'text-rose-500'}">${remainingDailyUses} / ${maxDailyUses}</span></div>
          ${isCurrentlyActive ?`<div class="flex justify-between"><span>${window.currentLang ==='en' ?'Self-Destruct Timer:' :'عداد التدمير الذاتي:'}</span><span class="numbers-font text-yellow-400 font-bold animate-pulse">${secRemaining} ${window.currentLang ==='en' ?'seconds remaining' :'ثانية متبقية'}</span></div>` :''}
        </div>
        <button id="btn-buy-store-${id}" ${btnDisabled ?'disabled' :''} class="${btnClass}">
          ${btnLabel}
        </button>`;

      card.querySelector(`#btn-buy-store-${id}`).addEventListener('click', () => {
        try {
          GameEngine.buyStoreItem(id);
          showToast('فاتورة متجر',`تم شراء"${item.name}" ودفع القيمة النقود.`,'success');
          renderAll();
        } catch (err) {
          showToast('رصيد معلق', err.message,'error');
        }
      });

      shelf.appendChild(card);
    });

    // Render backpack inventory
    const bag = document.getElementById('backpack-inventory');
    bag.innerHTML ='';

    const usableItems = Object.keys(s.inventory).filter(id => s.inventory[id] > 0 && GameEngine.STORE_ITEMS[id]);

    if (usableItems.length === 0) {
      bag.innerHTML =`
        <div class="col-span-full text-center text-slate-500 text-xs py-4">
          ${window.currentLang ==='en' 
            ?'Your backpack is completely empty. Visit the shelf above to buy support items and super boosts.' 
            :'حقيبة ظهرك فارغة تماماً. قم بزيارة الرف الأعلى لشراء عناصر الدعم والتعزيزات الفائقة.'}
        </div>`;
    } else {
      usableItems.forEach(id => {
        const item = GameEngine.STORE_ITEMS[id];
        const count = s.inventory[id];
        const ticksRemaining = (s.itemDurations && s.itemDurations[id]) ? s.itemDurations[id] : 0;
        const secRemaining = ticksRemaining * 3;

        const card = document.createElement('div');
        card.className ='glass-panel p-3 rounded-lg border border-slate-800 flex justify-between items-center text-xs';
        
        const translatedName = window.currentLang ==='en' ? (translationDict[item.name] || item.name) : item.name;
        const translatedDesc = window.currentLang ==='en' ? (translationDict[item.desc] || item.desc) : item.desc;

        card.innerHTML =`
          <div>
            <h5 class="font-bold text-white mb-0.5">${translatedName}</h5>
            <p class="text-[10px] text-slate-400 leading-snug">${translatedDesc}</p>
          </div>
          <div class="text-left whitespace-nowrap mr-3">
            <span class="text-[10px] text-yellow-400 border border-yellow-500/30 px-2 py-1 rounded bg-yellow-500/10 font-bold block mb-1">
              ⏳ ${window.currentLang ==='en' ?'Self-destruct:' :'تدمير ذاتي:'} <span class="numbers-font">${secRemaining}${window.currentLang ==='en' ?'s' :'ث'}</span>
            </span>
          </div>`;

        bag.appendChild(card);
      });
    }
  }

  // --- Tab 8: Black Market Panel (السوق السوداء) ---
  let blackMarketListenersAttached = false;

  function renderBlackMarket() {
    const s = GameEngine.state;
    if (!s) return;

    // 1. Underworld Status Hub
    const dirtyValEl = document.getElementById('underworld-dirty-cash-val');
    if (dirtyValEl) dirtyValEl.textContent = (s.dirtyCash || 0).toLocaleString();

    const repValEl = document.getElementById('underworld-rep-val');
    if (repValEl) repValEl.textContent = (s.underworldRep || 0).toLocaleString();

    const heatEl = document.getElementById('police-heat-display');
    if (heatEl) {
      const heat = Math.min(5, Math.max(0, s.heatLevel || 0));
      let starsHtml ='';
      for (let i = 0; i < 5; i++) {
        starsHtml += (i < heat) 
          ?'<i class="fa-solid fa-star text-amber-400 text-[10px]"></i>' 
          :'<i class="fa-regular fa-star text-slate-600 text-[10px]"></i>';
      }
      heatEl.innerHTML =`${window.currentLang ==='en' ?'Police Heat' :'الملاحقة'}: ${starsHtml}`;
    }

    // 2. Money Laundering Status & Presets
    const maxCashEl = document.getElementById('laundering-max-cash');
    if (maxCashEl) maxCashEl.textContent = (s.dirtyCash || 0).toLocaleString();

    const feeBadgeEl = document.getElementById('laundering-fee-badge');
    const hasCryptoCleaner = Boolean(s.inventory && s.inventory.crypto_cleaner > 0);
    if (feeBadgeEl) {
      feeBadgeEl.textContent = hasCryptoCleaner 
        ? (window.currentLang ==='en' ?'25% (Zero-Trace Active)' :'25% (Zero-Trace نشط)')
        :'35%';
      feeBadgeEl.className = hasCryptoCleaner ?'numbers-font font-black text-cyan-400' :'numbers-font font-black text-emerald-400';
    }

    // 3. Render Black Market Operations
    const dealsContainer = document.getElementById('blackmarket-deals');
    if (dealsContainer) {
      dealsContainer.innerHTML ='';

      const hasLawyer = s.inventory && s.inventory.premium_lawyer > 0;
      const hasJammer = s.inventory && s.inventory.radar_jammer > 0;
      const hasPassport = s.inventory && s.inventory.fake_passport > 0;

      let riskDiscount = 0;
      if (hasLawyer) riskDiscount += 0.35;
      if (hasJammer) riskDiscount += 0.20;

      Object.keys(GameEngine.BLACK_MARKET).forEach(id => {
        const deal = GameEngine.BLACK_MARKET[id];

        // Check reputation limit lock
        const repNeeded = deal.repNeeded || 0;
        const playerRep = s.underworldRep || 0;
        const isLockedByRep = playerRep < repNeeded;

        const baseFailChance = 1 - deal.successChance;
        const finalFailChance = deal.successChance === 1.0 ? 0 : Math.max(0.05, baseFailChance * (1 - riskDiscount));
        const riskPct = Math.round(finalFailChance * 100);
        const successPct = 100 - riskPct;

        let badgeStyle ='bg-slate-800 text-slate-300 border-slate-700';
        if (deal.tier ==='عملية خاصة') badgeStyle ='bg-rose-500/20 text-rose-300 border-rose-500/40 glow-gold animate-pulse';
        else if (deal.tier ==='سهل') badgeStyle ='bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
        else if (deal.tier ==='متوسط') badgeStyle ='bg-sky-500/20 text-sky-400 border-sky-500/30';
        else if (deal.tier ==='متقدم') badgeStyle ='bg-amber-500/20 text-amber-400 border-amber-500/30';
        else if (deal.tier ==='محترف') badgeStyle ='bg-purple-500/20 text-purple-400 border-purple-500/30';
        else if (deal.tier ==='خطر جداً') badgeStyle ='bg-rose-500/20 text-rose-400 border-rose-500/30';
        else if (deal.tier ==='أسطوري') badgeStyle ='bg-purple-500/20 text-purple-300 border-purple-500/40';
        else if (deal.tier ==='خطر مطلق') badgeStyle ='bg-red-600/20 text-red-400 border-red-500/40';
        else if (deal.tier ==='سيد الظلال') badgeStyle ='bg-yellow-500/20 text-yellow-300 border-yellow-500/40 glow-gold';

        const now = Date.now();
        const cdExpiresAt = (s.blackMarketCooldowns && s.blackMarketCooldowns[id]) || 0;
        const remainingMs = Math.max(0, cdExpiresAt - now);
        const isOnCooldown = remainingMs > 0;
        const remSec = Math.ceil(remainingMs / 1000);
        const remMins = Math.floor(remSec / 60);
        const remSecsFormatted = (remSec % 60).toString().padStart(2,'0');
        const cdFormatted = remMins > 0 ?`${remMins}:${remSecsFormatted}` :`${remSec} ${window.currentLang ==='en' ?'seconds' :'ثانية'}`;

        const cdSec = deal.cooldownSec || 120;
        const cdSuccessStr = cdSec >= 3600 
          ?`${Math.round(cdSec / 3600)} ${window.currentLang ==='en' ?'hours' :'ساعة'}` 
          : cdSec >= 60 
            ?`${Math.round(cdSec / 60)} ${window.currentLang ==='en' ?'minutes' :'دقيقة'}` 
            :`${cdSec} ${window.currentLang ==='en' ?'seconds' :'ثانية'}`;
        const failCdSec = Math.floor(cdSec / 2);
        const cdFailStr = failCdSec >= 3600 
          ?`${(failCdSec / 3600).toFixed(1)} ${window.currentLang ==='en' ?'hours' :'ساعة'}` 
          : failCdSec >= 60 
            ?`${Math.round(failCdSec / 60)} ${window.currentLang ==='en' ?'minutes' :'دقيقة'}` 
            :`${failCdSec} ${window.currentLang ==='en' ?'seconds' :'ثانية'}`;

        const costLabel = deal.requireDirtyCost 
          ? (window.currentLang ==='en' ?'Dirty Cash Required:' :'الأموال المشبوهة المطلوبة:')
          : (window.currentLang ==='en' ?'Capital Required:' :'رأس المال المطلوب:');
        const costValStr =`${deal.cost.toLocaleString()} EGP`;
        const payoutLabel = deal.cleanPayout 
          ? (window.currentLang ==='en' ?'Clean Return (Win):' :'العائد النظيف (الفوز):')
          : (window.currentLang ==='en' ?'Dirty Return (Win):' :'العائد المشبوه (الفوز):');
        const payoutValStr =`+${deal.payout.toLocaleString()} EGP`;
        const payoutColor = deal.cleanPayout ?'text-emerald-400' :'text-rose-400';
        const netProfitLabel = deal.cleanPayout 
          ? (window.currentLang ==='en' ?'Net Cleaned Cash:' :'المال المغسول الصافي:')
          : (window.currentLang ==='en' ?'Net Illicit Profit:' :'الربح الصافي غير المشروع:');
        const netProfitVal = deal.payout - deal.cost;
        const netProfitSign = netProfitVal >= 0 ?'+' :'';
        const netProfitColor = deal.cleanPayout ?'text-emerald-400' : (netProfitVal >= 0 ?'text-teal-400' :'text-rose-500');

        const repLossVal = deal.repLoss || Math.floor((deal.repGain || 20) * 1.2);
        const repGainStr = deal.repGain > 0 ?`+${deal.repGain} ${window.currentLang ==='en' ?'pts' :'نقطة'}` : (window.currentLang ==='en' ?'None' :'لا يوجد');
        const repLossStr = repLossVal > 0 ?`-${repLossVal} ${window.currentLang ==='en' ?'pts' :'نقطة'}` : (window.currentLang ==='en' ?'None' :'لا يوجد');

        const card = document.createElement('div');
        card.id =`bm-deal-card-${id}`;
        card.className = isLockedByRep
          ?'glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col justify-between opacity-40 relative overflow-hidden saturate-50 select-none'
          :'glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col justify-between hover:border-rose-500/40 transition duration-300 shadow-lg relative overflow-hidden';
        card.style.background ='radial-gradient(ellipse at top left, rgba(225,29,72,0.08), rgba(15,23,42,0.95))';

        const lockOverlay = isLockedByRep ?`
          <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2.5 z-10">
            <div class="w-11 h-11 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <i class="fa-solid fa-lock"></i>
            </div>
            <span class="text-xs font-bold text-slate-300">${window.currentLang ==='en' ?`Locked! Requires ${deal.repNeeded} Rep` :`مغلق! يتطلب سمعة ${deal.repNeeded} نقطة`}</span>
          </div>` :'';

        const translatedDealName = window.currentLang ==='en' ? (translationDict[deal.name] || deal.name) : deal.name;
        const translatedDealDesc = window.currentLang ==='en' ? (translationDict[deal.desc] || deal.desc) : deal.desc;
        const translatedDealTier = window.currentLang ==='en' ? (translationDict[deal.tier] || deal.tier) : deal.tier;

        card.innerHTML =`
          ${lockOverlay}
          <div>
            <div class="flex justify-between items-start mb-2">
              <div class="flex items-center gap-2.5">
                <div class="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                  <i class="fa-solid ${deal.icon ||'fa-box-open'} text-sm"></i>
                </div>
                <div>
                  <h4 class="text-sm font-bold text-white">${translatedDealName}</h4>
                  <span class="text-[10px] px-2 py-0.5 rounded-full border font-bold ${badgeStyle}">${translatedDealTier}</span>
                </div>
              </div>
            </div>
            
            <p class="text-xs text-slate-400 mt-1 mb-3">${translatedDealDesc}</p>
            
            <div class="text-xs text-slate-400 space-y-1.5 border-t border-b border-slate-800/80 py-2.5 my-3">
              <div class="flex justify-between"><span>${costLabel}</span><span class="numbers-font text-white font-bold">${costValStr}</span></div>
              <div class="flex justify-between"><span>${payoutLabel}</span><span class="numbers-font ${payoutColor} font-bold">${payoutValStr}</span></div>
              <div class="flex justify-between"><span>${netProfitLabel}</span><span class="numbers-font ${netProfitColor} font-semibold">${netProfitSign}${netProfitVal.toLocaleString()} EGP</span></div>
              <div class="flex justify-between"><span>${window.currentLang ==='en' ?'Est. Success Rate:' :'نسبة النجاح المقدرة:'}</span><span class="numbers-font ${successPct >= 70 ?'text-emerald-400' : successPct >= 50 ?'text-yellow-400' :'text-rose-400'} font-black">${successPct}%</span></div>
              <div class="flex justify-between"><span>${window.currentLang ==='en' ?'Cooldown Period:' :'فترة التهدئة (كول داون):'}</span><span class="numbers-font text-amber-400 font-bold">${cdSuccessStr} (${cdFailStr} ${window.currentLang ==='en' ?'on failure' :'عند الفشل'})</span></div>
              <div class="flex justify-between"><span>${window.currentLang ==='en' ?'Raid Penalty:' :'عقوبة المداهمة:'}</span><span class="numbers-font text-rose-400">${deal.jailDuration * 3} ${window.currentLang ==='en' ?'seconds' :'ثانية'} (${window.currentLang ==='en' ?'confiscate dirty + 20%' :'مصادرة المشبوه + 20%'})</span></div>
              <div class="flex justify-between"><span>${window.currentLang ==='en' ?'Reputation Gain:' :'زيادة السمعة:'}</span><span class="numbers-font text-rose-300 font-bold">${repGainStr}</span></div>
              <div class="flex justify-between"><span>${window.currentLang ==='en' ?'Reputation Penalty:' :'عقوبة خسارة السمعة:'}</span><span class="numbers-font text-rose-500 font-bold">${repLossStr}</span></div>
            </div>

            ${(hasLawyer || hasJammer || hasPassport) ?`
              <div class="flex flex-wrap gap-1 mb-3">
                ${hasLawyer ?`<span class="text-[10px] px-1.5 py-0.5 bg-sky-500/20 text-sky-300 rounded border border-sky-500/30">${window.currentLang ==='en' ?'Lawyer (+22% success / acquittal 50%)' :'محامي (+22% نجاح / براءة 50%)'}</span>` :''}
                ${hasJammer ?`<span class="text-[10px] px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30">${window.currentLang ==='en' ?'Jammer (+15% success)' :'تشويش (+15% نجاح)'}</span>` :''}
                ${hasPassport ?`<span class="text-[10px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">${window.currentLang ==='en' ?'Fake Passport (Secured Smuggler)' :'جواز مزور (مهرب مؤمن)'}</span>` :''}
              </div>` :''}
          </div>

          <div id="bm-deal-btn-wrapper-${id}">
            <button id="btn-run-deal-${id}" ${(isOnCooldown || isLockedByRep) ?'disabled' :''} class="w-full py-2.5 ${(isOnCooldown || isLockedByRep) ?'bg-slate-900 border border-amber-500/30 text-amber-400 cursor-not-allowed opacity-90' :'bg-gradient-to-r from-rose-900/60 to-rose-800/60 hover:from-rose-800 hover:to-rose-700 border border-rose-500/40 text-rose-100'} rounded-xl text-xs font-black transition shadow-md flex items-center justify-center gap-2">
              <i class="fa-solid ${(isOnCooldown && !isLockedByRep) ?'fa-hourglass-half text-amber-400 animate-spin' :'fa-handshake'}"></i>
              <span>${isLockedByRep ? (window.currentLang ==='en' ?'Locked (Insufficient Rep)' :'مغلق (سمعة غير كافية)') : (isOnCooldown ? (window.currentLang ==='en' ?`Police Cooldown (${cdFormatted})` :`تهدئة أمنية (${cdFormatted})`) : (window.currentLang ==='en' ?'Sign & Execute Operation' :'توقيع وتنفيذ العملية'))}</span>
            </button>
          </div>`;

        if (!isLockedByRep) {
          card.querySelector(`#btn-run-deal-${id}`).addEventListener('click', () => {
            try {
              const res = GameEngine.runBlackMarketDeal(id);
              if (res.success) {
                const payoutText = deal.cleanPayout ?'كاش نظيف' :'ربح مشبوه';
                const repText = res.repGain > 0 ?` (+${res.repGain} سمعة)` :'';
                showToast('ضربة معلم!',`نجحت العملية السرية! ${payoutText} قدره +${res.payout.toLocaleString()} EGP أضيف لخزينتك${repText}. كول داون: ${Math.round((res.cooldownSec || 60) / 60)}د`,'success');
                playMenuSound('success');
              } else if (res.escaped) {
                showToast('هروب دبلوماسي!',`تمت المداهمة ولكنك استخدمت جواز السفر المزور وهربت فوراً دون سجن أو غرامات! (كول داون مخفض 50%: ${Math.round((res.cooldownSec || 30) / 60)}د)`,'warning');
                playMenuSound('click');
              } else {
                const repLossText = res.repLoss > 0 ?` وفقدان -${res.repLoss} سمعة` :'';
                showToast('مداهمة الشرطة!',`تم ضبط عمليتك! مصادرة كافة الأموال المشبوهة وغرامة ${res.confiscation.toLocaleString()} EGP وسجن ${res.jailDuration * 3} ثانية${repLossText}. (كول داون مخفض 50%: ${Math.round((res.cooldownSec || 30) / 60)}د)`,'error');
                playMenuSound('error');
              }
              renderAll();
            } catch (err) {
              showToast('خطأ في العملية', err.message,'error');
            }
          });
        }

        dealsContainer.appendChild(card);
      });
    }

    // 4. Render Black-Ops Gear
    const gearContainer = document.getElementById('blackmarket-gear-list');
    if (gearContainer) {
      gearContainer.innerHTML ='';
      Object.keys(GameEngine.BLACK_MARKET_GEAR).forEach(gearId => {
        const gear = GameEngine.BLACK_MARKET_GEAR[gearId];
        const ownedCount = (s.inventory && s.inventory[gearId]) || 0;
        const ticksLeft = (s.itemDurations && s.itemDurations[gearId]) || 0;
        const secLeft = ticksLeft * 3;

        const card = document.createElement('div');
        card.className ='glass-panel p-4 rounded-xl border border-slate-800 flex flex-col justify-between bg-slate-950/40';
        card.innerHTML =`
          <div>
            <div class="flex justify-between items-center mb-2">
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <i class="fa-solid ${gear.icon ||'fa-microchip'}"></i>
                </div>
                <h5 class="font-bold text-white text-xs">${gear.name}</h5>
              </div>
              <span class="text-[10px] px-2 py-0.5 ${ownedCount > 0 ?'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :'bg-slate-800 text-slate-400'} rounded-full font-bold">
                ${ownedCount > 0 ?`نشط (${secLeft}ث)` :'غير مفعل'}
              </span>
            </div>
            <p class="text-[11px] text-slate-400 mb-3">${gear.desc}</p>
            <div class="flex justify-between items-center text-xs text-slate-300 border-t border-slate-800/80 pt-2 mb-3">
              <span>السعر:</span>
              <span class="numbers-font text-yellow-400 font-bold">${gear.cost.toLocaleString()} EGP</span>
            </div>
          </div>
          <button id="btn-buy-gear-${gearId}" class="w-full py-2 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/40 text-indigo-200 rounded-lg text-xs font-bold transition">
            شراء وتفعيل المعدة
          </button>`;

        card.querySelector(`#btn-buy-gear-${gearId}`).addEventListener('click', () => {
          try {
            GameEngine.buyBlackMarketGear(gearId);
            showToast('تجهيز العتاد',`تم شراء وتفعيل"${gear.name}" بنجاح!`,'success');
            renderAll();
          } catch (err) {
            showToast('فشل الشراء', err.message,'error');
          }
        });

        gearContainer.appendChild(card);
      });
    }

    // 5. Setup Black Market static listeners once
    setupBlackMarketListeners();
    renderSmugglingSection();
  }

  function updateBlackMarketCooldownsInDOM() {
    const s = GameEngine.state;
    if (!s || !GameEngine.BLACK_MARKET) return;
    const now = Date.now();

    Object.keys(GameEngine.BLACK_MARKET).forEach(id => {
      const btn = document.getElementById(`btn-run-deal-${id}`);
      if (!btn) return;
      const cdExpiresAt = (s.blackMarketCooldowns && s.blackMarketCooldowns[id]) || 0;
      const remainingMs = Math.max(0, cdExpiresAt - now);
      const isOnCooldown = remainingMs > 0;

      if (isOnCooldown) {
        const remSec = Math.ceil(remainingMs / 1000);
        const remMins = Math.floor(remSec / 60);
        const remSecsFormatted = (remSec % 60).toString().padStart(2,'0');
        const cdFormatted = remMins > 0 ?`${remMins}:${remSecsFormatted}` :`${remSec} ثانية`;
        btn.disabled = true;
        btn.className ='w-full py-2.5 bg-slate-900 border border-amber-500/30 text-amber-400 rounded-xl text-xs font-black transition shadow-md flex items-center justify-center gap-2 cursor-not-allowed opacity-90';
        btn.innerHTML =`<i class="fa-solid fa-hourglass-half text-amber-400 animate-spin"></i><span>تهدئة أمنية (${cdFormatted})</span>`;
      } else if (btn.disabled) {
        btn.disabled = false;
        btn.className ='w-full py-2.5 bg-gradient-to-r from-rose-900/60 to-rose-800/60 hover:from-rose-800 hover:to-rose-700 border border-rose-500/40 text-rose-100 rounded-xl text-xs font-black transition shadow-md flex items-center justify-center gap-2';
        btn.innerHTML =`<i class="fa-solid fa-handshake"></i><span>توقيع وتنفيذ العملية</span>`;
      }
    });

    updateActiveSmugglingJobsInDOM();
  }

  function setupBlackMarketListeners() {
    if (blackMarketListenersAttached) return;
    blackMarketListenersAttached = true;

    // Bribe Police Button
    const bribeBtn = document.getElementById('btn-bribe-police');
    if (bribeBtn) {
      bribeBtn.addEventListener('click', () => {
        try {
          const res = GameEngine.bribePolice();
          showToast('تمت الصفقة',`تم دفع ${res.bribeCost.toLocaleString()} EGP كرشوة وإسقاط جميع الملاحقات والإفراج الفوري!`,'success');
          renderAll();
        } catch (err) {
          showToast('فشل الرشوة', err.message,'error');
        }
      });
    }

    // Money Laundering Input Presets (Calculates from Dirty Cash)
    const launderInput = document.getElementById('laundering-amount-input');
    const setLaunderPct = (pct) => {
      const s = GameEngine.state;
      if (!s || !launderInput) return;
      const amt = Math.floor((s.dirtyCash || 0) * pct);
      launderInput.value = amt > 0 ? amt :'';
    };

    const b25 = document.getElementById('btn-launder-25');
    if (b25) b25.addEventListener('click', () => setLaunderPct(0.25));
    const b50 = document.getElementById('btn-launder-50');
    if (b50) b50.addEventListener('click', () => setLaunderPct(0.50));
    const b100 = document.getElementById('btn-launder-100');
    if (b100) b100.addEventListener('click', () => setLaunderPct(1.00));

    // Execute Money Laundering
    const execLaunderBtn = document.getElementById('btn-execute-laundering');
    if (execLaunderBtn) {
      execLaunderBtn.addEventListener('click', () => {
        if (!launderInput) return;
        const val = parseInt(launderInput.value);
        try {
          const res = GameEngine.launderMoney(val);
          launderInput.value ='';
          showToast('تم الغسيل المالي',`تم غسيل وتبييض ${res.amount.toLocaleString()} EGP وإيداع صافي ${res.cleanedAmount.toLocaleString()} EGP بحسابك البنكي (خصم ضريبة غسيل ${res.feeRate}% = ${res.fee.toLocaleString()} EGP).`,'success');
          renderAll();
        } catch (err) {
          showToast('فشل الغسيل', err.message,'error');
        }
      });
    }

    // Term Investment Start Buttons
    document.querySelectorAll('.btn-invest-start').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.getAttribute('data-type');
        const input = document.getElementById(`invest-amount-${type}`);
        if (!input) return;
        const amt = parseInt(input.value);
        try {
          const res = GameEngine.startInvestment(type, amt);
          input.value ='';
          showToast('بدء الاستثمار',`تم إيداع ${res.amount.toLocaleString()} EGP في"${res.plan.name}" بنجاح!`,'success');
          renderAll();
        } catch (err) {
          showToast('فشل الاستثمار', err.message,'error');
        }
      });
    });
  }

  // --- Tab 9: Casino Panel ---
  function renderCasino() {
    const vipBadge = document.getElementById('casino-vip-badge');
    if (vipBadge) {
      const hasVIP = GameEngine.state.inventory && GameEngine.state.inventory.vip_casino_pass > 0;
      if (hasVIP) {
        vipBadge.innerHTML =`<i class="fa-solid fa-crown text-amber-400"></i><span>${window.currentLang ==='en' ?'Active VIP Pass (+20% Win Bonus)' :'عضوية VIP نشطة (+20% بونص أرباح)'}</span>`;
        vipBadge.className ='text-xs px-3 py-1 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border border-amber-500/40 rounded-full font-bold shadow-sm flex items-center gap-1.5 glow-gold';
      } else {
        vipBadge.innerHTML =`<i class="fa-solid fa-gem text-slate-400"></i><span>${window.currentLang ==='en' ?'Regular Member (Buy VIP Pass in shop for +20% win bonus)' :'عضو عادي (شراء تذكرة VIP من المتجر لبونص أرباح 20%)'}</span>`;
        vipBadge.className ='text-xs px-3 py-1 bg-slate-800/80 text-slate-400 border border-slate-700/80 rounded-full font-bold flex items-center gap-1.5';
      }
    }
  }

  // --- Casino Game: Crash Multiplier (Classic Rocket Animation with Auto-Cashout) ---
  function runCrashBet() {
    const betInput = document.getElementById('crash-bet-input');
    const bet = parseInt(betInput.value);

    try {
      if (crashState ==='running') return;
      
      // Enforce 6s cooldown, daily net profit cap, 5% cash dynamic cap, deduct cash & immediately save to Firestore
      GameEngine.checkCasinoAllowedAndDeduct(bet);

      playCasinoSound('tick');

      crashBetAmount = bet;
      crashMultiplier = 1.0;
      crashLastMultiplier = 1.0;
      crashState ='running';

      // 3% instant takeoff explosion hazard
      if (Math.random() < 0.03) {
        triggerCrash(1.00);
        return;
      }

      // Update Buttons & Visuals
      document.getElementById('btn-crash-start').classList.add('hidden');
      const cashoutBtn = document.getElementById('btn-crash-cashout');
      cashoutBtn.classList.remove('hidden');
      cashoutBtn.disabled = false;
      document.getElementById('crash-cashout-payout').textContent = bet.toLocaleString();

      const statusText = document.getElementById('crash-status-text');
      statusText.textContent = window.currentLang ==='en' ?'Rocket rising...' :'الصاروخ يرتفع...';
      statusText.className ='text-[11px] text-yellow-400 font-bold bg-slate-900 px-2 py-0.5 rounded-lg border border-yellow-500/30 animate-pulse';

      // Reset Rocket SVG color
      const rocket = document.getElementById('crash-svg-rocket');
      if (rocket) rocket.setAttribute('fill','#eab308');

      crashStartTime = Date.now();
      animateCrashGame();

    } catch (err) {
      showToast(window.currentLang ==='en' ?'Bet Error' :'خطأ رهان', err.message,'error');
    }
  }

  function animateCrashGame() {
    if (crashState !=='running') return;

    const elapsed = (Date.now() - crashStartTime) / 1000;
    crashMultiplier = parseFloat((Math.pow(1.14, elapsed * 3.2)).toFixed(2));

    const display = document.getElementById('crash-multiplier-display');
    if (display) display.textContent =`${crashMultiplier.toFixed(2)}x`;

    const curve = document.getElementById('crash-svg-curve');
    const rocket = document.getElementById('crash-svg-rocket');

    if (curve && rocket) {
      const x = Math.min(90, 10 + elapsed * 12);
      const y = Math.max(10, 80 - Math.pow(elapsed * 2.0, 1.6));
      curve.setAttribute('d',`M 10 80 Q 50 80 ${x} ${y}`);
      rocket.setAttribute('cx', x);
      rocket.setAttribute('cy', y);
    }

    const currentPayout = Math.floor(crashBetAmount * crashMultiplier);
    const payoutEl = document.getElementById('crash-cashout-payout');
    if (payoutEl) payoutEl.textContent = currentPayout.toLocaleString();

    // Check Auto-Cashout
    const autoInput = document.getElementById('crash-autocashout-input');
    const autoVal = autoInput ? parseFloat(autoInput.value) : NaN;
    if (!isNaN(autoVal) && autoVal > 1.0 && crashMultiplier >= autoVal) {
      cashoutCrash();
      return;
    }

    // Dynamic Frame-by-Frame Hazard Evaluation (Zero pre-computed targets in memory)
    if (crashMultiplier > crashLastMultiplier) {
      const hazardChance = 1 - (crashLastMultiplier / crashMultiplier);
      crashLastMultiplier = crashMultiplier;

      if (Math.random() < hazardChance) {
        triggerCrash(crashMultiplier);
        return;
      }
    }

    // Safety visual ceiling (30.0x max)
    if (crashMultiplier >= 30.0) {
      triggerCrash(crashMultiplier);
      return;
    }

    crashAnimationId = requestAnimationFrame(animateCrashGame);
  }

  function triggerCrash(explodedAt = crashMultiplier) {
    cancelAnimationFrame(crashAnimationId);
    crashState ='crashed';
    playCasinoSound('lose');

    const mult = (typeof explodedAt ==='number') ? explodedAt : crashMultiplier;

    const statusText = document.getElementById('crash-status-text');
    if (statusText) {
      statusText.textContent = window.currentLang ==='en' ?`Exploded at ${mult.toFixed(2)}x !` :`انفجر عند ${mult.toFixed(2)}x !`;
      statusText.className ='text-[11px] text-rose-400 font-bold bg-rose-950/80 px-2 py-0.5 rounded-lg border border-rose-500/40 animate-pulse';
    }

    const rocket = document.getElementById('crash-svg-rocket');
    if (rocket) rocket.setAttribute('fill','#f43f5e');

    document.getElementById('btn-crash-start').classList.remove('hidden');
    document.getElementById('btn-crash-cashout').classList.add('hidden');

    // Settle loss in GameEngine
    GameEngine.settleCasinoRound(crashBetAmount, 0,'صاروخ الحظ (Crash)');

    const isEn = (window.currentLang ==='en');
    const currency = isEn ?'EGP' :'ج.م';
    showToast(
      isEn ?'Rocket Crashed' :'تحطم الصاروخ',
      isEn
        ?`Rocket exploded at ${mult.toFixed(2)}x. Lost bet -${crashBetAmount.toLocaleString()} ${currency}.`
        :`انفجر الصاروخ عند مضاعف ${mult.toFixed(2)}x. خسرت رهانك -${crashBetAmount.toLocaleString()} ${currency}.`,'error'
    );
    renderAll();
  }

  function cashoutCrash() {
    if (crashState !=='running') return;

    cancelAnimationFrame(crashAnimationId);
    crashState ='cashed_out';

    const grossPayout = Math.floor(crashBetAmount * crashMultiplier);
    const settlement = GameEngine.settleCasinoRound(crashBetAmount, grossPayout,'صاروخ الحظ (Crash)');

    playCasinoSound(crashMultiplier >= 5.0 ?'jackpot' :'win');

    const statusText = document.getElementById('crash-status-text');
    if (statusText) {
      statusText.textContent = window.currentLang ==='en' ?`Cashed out at ${crashMultiplier.toFixed(2)}x !` :`صُرفت الأرباح عند ${crashMultiplier.toFixed(2)}x !`;
      statusText.className ='text-[11px] text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded-lg border border-emerald-500/40';
    }

    document.getElementById('btn-crash-start').classList.remove('hidden');
    document.getElementById('btn-crash-cashout').classList.add('hidden');

    const isEn = (window.currentLang ==='en');
    const currency = isEn ?'EGP' :'ج.م';
    showToast(
      isEn ?'Cashout Successful' :'صرف الأرباح بنجاح',
      isEn
        ?`Cashed out at ${crashMultiplier.toFixed(2)}x! Net profit: +${settlement.profit.toLocaleString()} ${currency}!`
        :`تم صرف الأرباح عند مضاعف ${crashMultiplier.toFixed(2)}x! صافي ربحك: +${settlement.profit.toLocaleString()} ${currency}!`,'success'
    );
    renderAll();
  }

  // --- Tab 10: Leaderboard Panel (Grand Tycoon Leaderboard & Podium) ---
  let cachedLeaderboard = null;
  let lastLeaderboardFetchTime = 0;

  function updateHourlyLeaderboardTimerUI() {
    const meta = AppDB.getLeaderboardMeta ? AppDB.getLeaderboardMeta() : null;
    if (!meta) return;

    const now = Date.now();
    const remainingMs = Math.max(0, (meta.nextUpdateAt || (now + 3600000)) - now);
    const totalSecs = Math.floor(remainingMs / 1000);
    const minutes = Math.floor(totalSecs / 60);
    const seconds = totalSecs % 60;
    const timeFormatted =`${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;

    const lastUpdatedDate = new Date(meta.updatedAt || now);
    const lastUpdatedFormatted = lastUpdatedDate.toLocaleTimeString(window.currentLang ==='en' ?'en-US' :'ar-EG', {
      hour:'2-digit',
      minute:'2-digit'
    });

    ['ingame-lb-timer','start-lb-timer'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = timeFormatted;
    });

    ['ingame-lb-last-updated','start-lb-last-updated'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = lastUpdatedFormatted;
    });

    // If countdown reached 0 and leaderboard is currently visible, refresh
    if (remainingMs === 0 && (now - (window._lastAutoHourlyLdRefresh || 0) > 60000)) {
      window._lastAutoHourlyLdRefresh = now;
      const lbTab = document.getElementById('panel-leaderboard');
      const startModal = document.getElementById('start-menu-leaderboard-modal');
      if (lbTab && !lbTab.classList.contains('hidden')) {
        renderLeaderboard(true);
      } else if (startModal && !startModal.classList.contains('hidden')) {
        renderStartMenuLeaderboard(true);
      }
    }
  }

  // Ticker for leaderboard hourly countdown
  setInterval(updateHourlyLeaderboardTimerUI, 1000);

  async function renderLeaderboard(forceRefresh = false) {
    const list = document.getElementById('leaderboard-rows');
    if (!list) return;

    const now = Date.now();
    const canUseCache = !forceRefresh && cachedLeaderboard && (now - lastLeaderboardFetchTime < 60000);

    if (!canUseCache) {
      list.innerHTML =`
        <tr>
          <td colspan="4" class="text-center py-8 text-slate-400">
            <div class="flex items-center justify-center gap-2">
              <span class="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></span>
              <span class="font-bold text-xs">${window.currentLang ==='en' ?'Loading official hourly snapshot...' :'جاري جلب الاعتماد الساعي الرسمي لعرش الأثرياء...'}</span>
            </div>
          </td>
        </tr>`;
    }

    try {
      let players;
      if (canUseCache) {
        players = cachedLeaderboard;
      } else {
        players = await AppDB.getLeaderboard(forceRefresh);
        cachedLeaderboard = players;
        lastLeaderboardFetchTime = now;
      }
      if (Array.isArray(players) && players.length > 10) {
        players = players.slice(0, 10);
      }
      updateHourlyLeaderboardTimerUI();
      list.innerHTML ='';

      if (!players || players.length === 0) {
        list.innerHTML =`
          <tr>
            <td colspan="4" class="text-center py-8 text-slate-500 text-xs">
              ${window.currentLang ==='en' ?'No registered accounts in the leaderboard yet.' :'لا توجد حسابات مسجلة حالياً في قائمة المتصدرين.'}
            </td>
          </tr>`;
        return;
      }

      // Update Podium Cards (Top 3)
      const top1 = players[0];
      const top2 = players[1];
      const top3 = players[2];

      // Podium 1 (Gold - 1st)
      if (top1) {
        const p1Name = document.getElementById('podium-name-1');
        const p1Title = document.getElementById('podium-title-1');
        const p1Worth = document.getElementById('podium-worth-1');
        const p1Avatar = document.getElementById('podium-avatar-1');
        if (p1Name) {
          const fbBadge = top1.facebookVerified ?' <span class="fb-vip-badge" title="عضو موثق في مجتمع فيسبوك">f</span>' :'';
          p1Name.innerHTML = top1.username + fbBadge;
          p1Name.classList.add('cursor-pointer','hover:underline');
          p1Name.onclick = () => openPlayerProfileCard(top1.username);
        }
        if (p1Title) p1Title.textContent = top1.title || (window.currentLang ==='en' ?'Money Emperor' :'إمبراطور المال');
        if (p1Worth) {
          p1Worth.textContent =`${formatCompactNumber(top1.netWorth || 0)} EGP`;
          p1Worth.title =`${Number(top1.netWorth || 0).toLocaleString()} EGP`;
        }
        if (p1Avatar) p1Avatar.innerHTML =`<span class="text-sm sm:text-base font-black">${(top1.username ||'P').substring(0, 2).toUpperCase()}</span>`;
      }

      // Podium 2 (Silver - 2nd)
      if (top2) {
        const p2Name = document.getElementById('podium-name-2');
        const p2Title = document.getElementById('podium-title-2');
        const p2Worth = document.getElementById('podium-worth-2');
        const p2Avatar = document.getElementById('podium-avatar-2');
        if (p2Name) {
          const fbBadge = top2.facebookVerified ?' <span class="fb-vip-badge" title="عضو موثق في مجتمع فيسبوك">f</span>' :'';
          p2Name.innerHTML = top2.username + fbBadge;
          p2Name.classList.add('cursor-pointer','hover:underline');
          p2Name.onclick = () => openPlayerProfileCard(top2.username);
        }
        if (p2Title) p2Title.textContent = top2.title || (window.currentLang ==='en' ?'Business Baron' :'بارون التجارة');
        if (p2Worth) {
          p2Worth.textContent =`${formatCompactNumber(top2.netWorth || 0)} EGP`;
          p2Worth.title =`${Number(top2.netWorth || 0).toLocaleString()} EGP`;
        }
        if (p2Avatar) p2Avatar.innerHTML =`<span class="text-xs sm:text-sm font-black">${(top2.username ||'P').substring(0, 2).toUpperCase()}</span>`;
      }

      // Podium 3 (Bronze - 3rd)
      if (top3) {
        const p3Name = document.getElementById('podium-name-3');
        const p3Title = document.getElementById('podium-title-3');
        const p3Worth = document.getElementById('podium-worth-3');
        const p3Avatar = document.getElementById('podium-avatar-3');
        if (p3Name) {
          const fbBadge = top3.facebookVerified ?' <span class="fb-vip-badge" title="عضو موثق في مجتمع فيسبوك">f</span>' :'';
          p3Name.innerHTML = top3.username + fbBadge;
          p3Name.classList.add('cursor-pointer','hover:underline');
          p3Name.onclick = () => openPlayerProfileCard(top3.username);
        }
        if (p3Title) p3Title.textContent = top3.title || (window.currentLang ==='en' ?'Senior Businessman' :'رجل أعمال كبار');
        if (p3Worth) {
          p3Worth.textContent =`${formatCompactNumber(top3.netWorth || 0)} EGP`;
          p3Worth.title =`${Number(top3.netWorth || 0).toLocaleString()} EGP`;
        }
        if (p3Avatar) p3Avatar.innerHTML =`<span class="text-xs sm:text-sm font-black">${(top3.username ||'P').substring(0, 2).toUpperCase()}</span>`;
      }

      // Update Self Rank indicator
      const activeUser = GameEngine.activeUsername;
      const selfIndex = players.findIndex(p => p.username === activeUser);
      const selfRankEl = document.getElementById('self-rank-num');
      if (selfRankEl) {
        selfRankEl.textContent = selfIndex !== -1 
          ? (window.currentLang ==='en' ?`#${selfIndex + 1} of ${players.length}` :`#${selfIndex + 1} من ${players.length}`)
          : (window.currentLang ==='en' ?'Outside Top 10' :'خارج قائمة الـ 10');
      }

      // Render Table Rows
      players.forEach((player, idx) => {
        const isSelf = player.username === activeUser;
        const rank = idx + 1;
        const initials = (player.username ||'P').substring(0, 2).toUpperCase();

        const row = document.createElement('tr');
        row.className =`border-b border-slate-800/40 text-xs transition duration-200 ${isSelf
            ?'bg-yellow-500/15 hover:bg-yellow-500/20 font-bold border-r-4 border-r-yellow-500 shadow-inner'
            : rank === 1 ?'bg-gradient-to-r from-yellow-500/10 via-amber-950/20 to-transparent hover:bg-yellow-500/15'
              : rank === 2 ?'bg-gradient-to-r from-slate-700/10 via-slate-800/20 to-transparent hover:bg-slate-800/30'
                : rank === 3 ?'bg-gradient-to-r from-amber-900/10 via-amber-950/20 to-transparent hover:bg-amber-900/20'
                  :'hover:bg-slate-900/50'
          }`;

        let rankBadge ='';
        if (rank === 1) {
          rankBadge =`<span class="w-8 h-8 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 text-slate-950 font-black flex items-center justify-center text-xs shadow-md glow-gold"><i class="fa-solid fa-crown text-[10px] ml-0.5"></i>1</span>`;
        } else if (rank === 2) {
          rankBadge =`<span class="w-8 h-8 rounded-xl bg-slate-700 border border-slate-400/60 text-slate-100 font-black flex items-center justify-center text-xs shadow"><i class="fa-solid fa-medal text-[10px] ml-0.5"></i>2</span>`;
        } else if (rank === 3) {
          rankBadge =`<span class="w-8 h-8 rounded-xl bg-amber-950 border border-amber-600/60 text-amber-400 font-black flex items-center justify-center text-xs shadow"><i class="fa-solid fa-award text-[10px] ml-0.5"></i>3</span>`;
        } else if (rank <= 10) {
          rankBadge =`<span class="w-7 h-7 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 font-bold flex items-center justify-center text-xs numbers-font">#${rank}</span>`;
        } else {
          rankBadge =`<span class="w-7 h-7 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-400 font-medium flex items-center justify-center text-[11px] numbers-font">#${rank}</span>`;
        }

        row.innerHTML =`
          <td class="py-3 pr-4 pl-2 text-right">
            ${rankBadge}
          </td>
          <td class="py-3 px-3">
            <div class="flex items-center gap-2">
              <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg ${rank === 1 ?'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 glow-gold' :'bg-slate-800 border border-slate-700 text-slate-300'} flex items-center justify-center text-[10px] font-black numbers-font flex-shrink-0">
                ${initials}
              </div>
              <div class="min-w-0">
                <span class="font-black ${isSelf ?'text-yellow-400 glow-gold' : rank === 1 ?'text-yellow-300' :'text-white'} text-xs sm:text-sm inline-flex items-center gap-1 cursor-pointer hover:underline" onclick="window.UI.openPlayerProfileCard('${player.username}')">
                  <span>${player.username}</span>
                  ${player.facebookVerified ?'<span class="fb-vip-badge" title="عضو موثق في مجتمع فيسبوك">f</span>' :''}
                </span>
                ${isSelf ? (window.currentLang ==='en' ?'<span class="text-[8.5px] px-1.5 py-0.2 bg-yellow-500/20 text-yellow-400 rounded font-black inline-block border border-yellow-500/30">You (Your Account)</span>' :'<span class="text-[8.5px] px-1.5 py-0.2 bg-yellow-500/20 text-yellow-400 rounded font-black inline-block border border-yellow-500/30">أنت (حسابك)</span>') :''}
              </div>
            </div>
          </td>
          <td class="py-3 px-3 text-slate-400">
            <span class="px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-[9.5px] sm:text-[10.5px] font-bold text-slate-300 inline-block truncate max-w-[120px] sm:max-w-none">
              ${player.title || (window.currentLang ==='en' ?'Investor' :'مستثمر')}
            </span>
          </td>
          <td class="py-3 pl-4 pr-3 text-left">
            <span class="numbers-font font-black ${rank === 1 ?'text-yellow-400 text-xs sm:text-sm glow-gold' :'text-emerald-400 text-xs sm:text-sm'} whitespace-nowrap" title="${Number(player.netWorth || 0).toLocaleString()} EGP">
              ${formatCompactNumber(player.netWorth || 0)} EGP
            </span>
          </td>`;
        list.appendChild(row);
      });

    } catch (err) {
      list.innerHTML =`
        <tr>
          <td colspan="4" class="text-center py-8 text-rose-400 text-xs">
            <i class="fa-solid fa-circle-exclamation text-base mb-1 block"></i>
            تعذر تحميل قائمة المتصدرين. تأكد من اتصالك بالإنترنت.
          </td>
        </tr>`;
    }
  }



  // Floating Passive indicators
  function showPassiveGainFloat(text) {
    const parent = document.getElementById('passive-float-spawn');
    if (!parent) return;

    const el = document.createElement('div');
    el.className ='absolute text-emerald-400 font-bold text-sm numbers-font animate-float pointer-events-none glow-emerald';
    el.textContent = text;
    // Set random position inside spawn box
    el.style.left =`${Math.floor(Math.random() * 50) + 20}%`;
    el.style.top =`${Math.floor(Math.random() * 30) + 10}%`;

    parent.appendChild(el);
    setTimeout(() => {
      el.remove();
    }, 1200);
  }

  // --- Admin Panel Setup & Realtime Event Listeners ---

  let activeListeners = [];

  function setupRealTimeListeners(username) {
    // Clean up existing listeners
    activeListeners.forEach(unsub => unsub());
    activeListeners = [];

    // Show/Hide Admin Trigger Button
    const adminTrigger = document.getElementById('btn-admin-panel-trigger');
    if (adminTrigger) {
      const isAdmin = Boolean(GameEngine.state && GameEngine.state.isAdmin);
      if (isAdmin) {
        adminTrigger.classList.remove('hidden');
      } else {
        adminTrigger.classList.add('hidden');
      }
    }

    if (!AppDB.isFirebaseReady) return;

    const db = firebase.firestore();

    // 1. Broadcast Listener
    let lastBroadcastTime = Date.now();
    const unsubBroadcast = db.collection('globals').doc('broadcast')
      .onSnapshot((doc) => {
        if (!doc.exists) return;
        const data = doc.data();
        if (!data || !data.message) return;
        if (data.timestamp > lastBroadcastTime) {
          lastBroadcastTime = data.timestamp;
          showToast(data.title ||' إعلان إداري عاجل', data.message,'info');
          playMenuSound('success');
        }
      }, (err) => console.error("Broadcast listen err:", err));
    activeListeners.push(unsubBroadcast);

    // 1.2 Mandatory Force Page Reload Listener
    const unsubForceReload = db.collection('globals').doc('force_reload')
      .onSnapshot((doc) => {
        if (!doc.exists) return;
        const data = doc.data();
        if (data) {
          handleIncomingForceReload(data);
        }
      }, (err) => console.error("Force reload listen err:", err));
    activeListeners.push(unsubForceReload);

    // 1.5. Tax Config (Single fetch on load to conserve read quota)
    db.collection('globals').doc('taxConfig').get()
      .then((doc) => {
        if (!doc.exists) return;
        const data = doc.data();
        if (data) {
          GameEngine.setTaxConfig(data);
          const mul = document.getElementById('adm-tax-multiplier');
          const sil = document.getElementById('adm-tax-silver');
          const maj = document.getElementById('adm-tax-major');
          const wha = document.getElementById('adm-tax-whale');
          if (mul) mul.value = data.rateMultiplier !== undefined ? data.rateMultiplier : 1.0;
          if (sil) sil.value = data.silverRate !== undefined ? data.silverRate : 0.00002;
          if (maj) maj.value = data.majorRate !== undefined ? data.majorRate : 0.00004;
          if (wha) wha.value = data.whaleRate !== undefined ? data.whaleRate : 0.00008;
        }
      }).catch((err) => console.warn("Tax config fetch err:", err));

    // 1.7. Server Config (Boost) (Single fetch on load to conserve read quota)
    db.collection('globals').doc('serverConfig').get()
      .then((doc) => {
        if (!doc.exists) return;
        const data = doc.data();
        if (data) {
          window.serverBoostMultiplier = data.boostMultiplier || 1.0;
          
          // Update the boost telemetry HUD label
          const boostLabel = document.getElementById('adm-telemetry-boost-label');
          if (boostLabel) {
            boostLabel.textContent =`${window.serverBoostMultiplier.toFixed(1)}x ${window.serverBoostMultiplier > 1 ?'(Boost نشط! )' :'(اعتيادي)'}`;
            if (window.serverBoostMultiplier > 1) {
              boostLabel.className ='numbers-font text-amber-400 font-black animate-pulse';
            } else {
              boostLabel.className ='numbers-font text-white font-black';
            }
          }
          
          // Update Server Boost Card background style dynamically
          const boostCard = document.getElementById('adm-server-boost-card');
          if (boostCard) {
            if (window.serverBoostMultiplier > 1) {
              boostCard.className ='glass-panel p-3.5 rounded-xl border border-amber-500/50 flex justify-between items-center bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.1)] text-right';
            } else {
              boostCard.className ='glass-panel p-3.5 rounded-xl border border-slate-800 flex justify-between items-center bg-slate-900/30 text-right';
            }
          }
          
          updateStatsBarServerBoostIndicator();
        }
      }).catch((err) => console.warn("ServerConfig fetch err:", err));

    // Public Chat listener removed to conserve Firebase read/write quota (replaced with Facebook Community)

    // Smart Cloud Auto-Sync:
    // Debounced, safe background autosync every 45s without server spam
    if (!window._cloudBackupInterval) {
      window._cloudBackupInterval = setInterval(() => {
        if (GameEngine.activeUsername && GameEngine.state && GameEngine.state._loadedFromCloud) {
          AppDB.savePlayerState(GameEngine.activeUsername, GameEngine.state, true);
        }
      }, 45 * 1000);
    }

    // 2.5. Live Incoming Mailbox & Wire Transfers Listener
    if (typeof AppDB.listenToMailbox ==='function') {
      const unsubMail = AppDB.listenToMailbox(username, (mails) => {
        if (typeof renderMailbox ==='function') {
          renderMailbox(mails);
        }
      });
      activeListeners.push(unsubMail);
    }

    // 3. Airdrop Listener
    let lastAirdropTime = Date.now();
    const unsubAirdrop = db.collection('globals').doc('airdrop')
      .onSnapshot(async (doc) => {
        if (!doc.exists) return;
        const data = doc.data();
        if (data.timestamp > lastAirdropTime) {
          lastAirdropTime = data.timestamp;
          const s = GameEngine.state;
          s.cash += data.amount;
          GameEngine.forceSaveState();
          showToast('مكافأة عامة',`استلمت مكافأة عامة بقيمة +${data.amount.toLocaleString()} EGP!`,'success');
          renderAll();
        }
      }, (err) => console.error("Airdrop listen err:", err));
    activeListeners.push(unsubAirdrop);

    // 5. Global Unified Market Event synchronization (30s interval, pauses when hidden or idle)
    const syncMarketEvent = async () => {
      if (typeof AppDB !=='undefined' && typeof AppDB.isNetworkActive ==='function' && !AppDB.isNetworkActive()) return;
      if (typeof document !=='undefined' && document.hidden) return;
      try {
        if (typeof AppDB.getGlobalMarketEvent ==='function') {
          const ev = await AppDB.getGlobalMarketEvent();
          if (ev && ev.timestamp) {
            if (typeof GameEngine.setGlobalMarketEvent ==='function') {
              GameEngine.setGlobalMarketEvent(ev);
            }
            const ticker = document.getElementById('stock-market-news-ticker');
            if (ticker && ev.title) {
              ticker.textContent = ev.title;
            }
          }
        }
      } catch (e) {}
    };
    syncMarketEvent();
    const marketEventPoll = setInterval(syncMarketEvent, 30000);
    const unsubMarketResume = (typeof AppDB !=='undefined' && typeof AppDB.onActiveResume ==='function') 
      ? AppDB.onActiveResume(() => syncMarketEvent()) 
      : () => {};
    activeListeners.push(() => {
      clearInterval(marketEventPoll);
      unsubMarketResume();
    });

    // 3. User document listener for ban & external edits (Live Real-Time Sync)
    let lastAdminActionTimestamp = null;
    const unsubUser = db.collection('players').doc(username)
      .onSnapshot((doc) => {
        if (!doc.exists) return;
        const data = doc.data();

        // Initial snapshot: record the current timestamp
        if (lastAdminActionTimestamp === null) {
          lastAdminActionTimestamp = Number(data.adminModifiedTimestamp || 0);
          if (data.isBanned) {
            unsubUser();
            handleBannedUser();
          }
          return;
        }

        // Ban check
        if (data.isBanned) {
          unsubUser();
          handleBannedUser();
          return;
        }

        // Only process external admin modifications if explicitly timestamped
        if (data.adminModifiedTimestamp && data.adminModifiedTimestamp > lastAdminActionTimestamp) {
          lastAdminActionTimestamp = data.adminModifiedTimestamp;

          // Jail check strictly from explicit admin modification
          if (typeof data.jailTimer ==='number' && data.jailTimer !== GameEngine.state.jailTimer) {
            GameEngine.state.jailTimer = data.jailTimer;
            if (data.jailTimer > 0 && typeof handleJailedUser ==='function') {
              handleJailedUser(data.jailTimer);
            }
          }

          GameEngine.state.cash = typeof data.cash ==='number' ? data.cash : 0;
          GameEngine.state.bank = typeof data.bank ==='number' ? data.bank : 0;
          GameEngine.state.dirtyCash = typeof data.dirtyCash ==='number' ? data.dirtyCash : 0;
          GameEngine.state.netWorth = typeof data.netWorth ==='number' ? data.netWorth : 0;
          GameEngine.state.xp = typeof data.xp ==='number' ? data.xp : 0;
          GameEngine.state.jobId = data.jobId ||'worker';
          GameEngine.state.title = data.title ||'عامل مبتدئ';

          if (typeof GameEngine.calculateTotalNetWorth ==='function') {
            GameEngine.calculateTotalNetWorth();
          }

          try {
            if (typeof AppDB.setEncryptedLocalState ==='function') {
              AppDB.setEncryptedLocalState(`rasalmal_state_${GameEngine.activeUsername}`, GameEngine.state);
            }
            localStorage.setItem(`rasalmal_state_${GameEngine.activeUsername}`, JSON.stringify(GameEngine.state));
          } catch (e) { }

          showToast('إشعار إداري','تم تعديل وتحديث بيانات حسابك من قبل الإدارة فورياً.','info');
          if (typeof playMenuSound ==='function') playMenuSound('success');
          renderAll();
        }
      }, (err) => console.error("User doc listen err:", err));
    activeListeners.push(unsubUser);
  }

  function applyCompleteZeroStateToGameEngine(username) {
    if (!GameEngine.state) return;
    const isAdmin = Boolean(GameEngine.state && GameEngine.state.isAdmin);
    GameEngine.state.isAdmin = isAdmin;
    GameEngine.state.cash = 0;
    GameEngine.state.bank = 0;
    GameEngine.state.dirtyCash = 0;
    GameEngine.state.netWorth = 0;
    GameEngine.state.xp = 0;
    GameEngine.state.jobId ='worker';
    GameEngine.state.title ='عامل مبتدئ';
    GameEngine.state.underworldRep = 0;
    GameEngine.state.heatLevel = 0;
    GameEngine.state.jailTimer = 0;
    GameEngine.state.afkManagerExpiresAt = 0;
    GameEngine.state.activeLoan = null;
    GameEngine.state.investments = [];
    GameEngine.state.businesses = {
      kiosk: { level: 0, price: 15, workers: 0, suppliesTicks: 0 },
      coffee: { level: 0, price: 28, workers: 0, suppliesTicks: 0 },
      tech: { level: 0, price: 75, workers: 0, suppliesTicks: 0 },
      logistics: { level: 0, price: 120, workers: 0, suppliesTicks: 0 },
      supermarket: { level: 0, price: 200, workers: 0, suppliesTicks: 0 },
      solar_factory: { level: 0, price: 340, workers: 0, suppliesTicks: 0 },
      private_hospital: { level: 0, price: 600, workers: 0, suppliesTicks: 0 },
      media_studio: { level: 0, price: 1100, workers: 0, suppliesTicks: 0 },
      private_bank: { level: 0, price: 1800, workers: 0, suppliesTicks: 0 },
      oil_refinery: { level: 0, price: 2800, workers: 0, suppliesTicks: 0 },
      space_tech: { level: 0, price: 4800, workers: 0, suppliesTicks: 0 }
    };
    GameEngine.state.assets = {
      apartment: 0,
      office: 0,
      mansion: 0,
      skyline_tower: 0,
      luxury_resort: 0,
      mega_yacht: 0,
      private_island: 0,
      orbital_station: 0
    };
    GameEngine.state.stocks = {
      COMI: { shares: 0, avgPrice: 0 },
      EAST: { shares: 0, avgPrice: 0 },
      ETEL: { shares: 0, avgPrice: 0 },
      FWRY: { shares: 0, avgPrice: 0 },
      CASH: { shares: 0, avgPrice: 0 },
      BITC: { shares: 0, avgPrice: 0 },
      GOLD: { shares: 0, avgPrice: 0 },
      AIX: { shares: 0, avgPrice: 0 }
    };
    GameEngine.state.inventory = {
      gold_pen: 0,
      premium_lawyer: 0,
      energy_drink: 0,
      tax_shield: 0,
      market_scanner: 0,
      vip_casino_pass: 0,
      radar_jammer: 0,
      fake_passport: 0,
      crypto_cleaner: 0,
      diplomatic_bag: 0,
      commissioner_wire: 0,
      quantum_cpu: 0,
      diamond_card: 0
    };
    GameEngine.state.ownedCars = [];
    GameEngine.state.activeCar = null;
    GameEngine.state.smugglingFleet = { speedboat: 0, plane: 0, ship: 0 };
    GameEngine.state.activeSmugglingJobs = [];
    GameEngine.state.itemDurations = {};
    GameEngine.state.offlineReport = null;

    if (username) {
      try {
        localStorage.setItem(`rasalmal_state_${username}`, JSON.stringify(GameEngine.state));
      } catch (e) { }
    }
  }

  async function checkMaintenanceMode() {
    hideMaintenanceOverlay();
    return false;
  }

  function showMaintenancePopup(msg) {}

  function handleMaintenanceMode(customMsg) {
    hideMaintenanceOverlay();
  }

  function hideMaintenanceOverlay() {
    const maintOverlay = document.getElementById('maintenance-overlay');
    if (maintOverlay) maintOverlay.classList.add('hidden');
    const maintPopup = document.getElementById('maintenance-popup-modal');
    if (maintPopup) maintPopup.classList.add('hidden');
  }

  function updateMaintenanceUIState(isMaint) {}

  // ==================== MANDATORY FORCE PAGE RELOAD MODAL ====================
  let isMandatoryReloadActive = false;

  function handleIncomingForceReload(data) {
    if (!data || !data.timestamp) return;

    const reloadTs = Number(data.timestamp);
    const storedAck = Number(sessionStorage.getItem('rasalmal_acknowledged_reload') || 0);

    // Initial session baseline: record existing timestamp so fresh loads aren't blocked
    if (!sessionStorage.getItem('rasalmal_acknowledged_reload')) {
      sessionStorage.setItem('rasalmal_acknowledged_reload', String(reloadTs));
      console.log('[RELOAD SYNC] Initial session baseline set to:', reloadTs);
      return;
    }

    // If admin issued a newer reload command after our baseline:
    if (reloadTs > storedAck) {
      console.warn('[RELOAD SYNC] New force reload detected! Broadcast TS:', reloadTs,'Stored Baseline:', storedAck);
      triggerMandatoryReloadModal(data.message, reloadTs);
    }
  }

  function triggerMandatoryReloadModal(customMessage, reloadTs) {
    if (isMandatoryReloadActive) return;
    isMandatoryReloadActive = true;

    console.warn('[SYSTEM] Mandatory Page Reload requested by Administrator.');

    // 1. Halt game loop and prevent saving corrupted state during transition
    if (tickIntervalId) {
      clearInterval(tickIntervalId);
      tickIntervalId = null;
    }
    if (typeof GameEngine !=='undefined' && typeof GameEngine.pauseEngine ==='function') {
      try { GameEngine.pauseEngine(); } catch (e) {}
    }

    // 2. Play warning sound if available
    try {
      if (typeof playMenuSound ==='function') playMenuSound('danger');
    } catch (e) {}

    // 3. Find or dynamically inject overlay
    let overlay = document.getElementById('mandatory-reload-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id ='mandatory-reload-overlay';
      overlay.className ='fixed inset-0 z-[9999999] flex items-center justify-center bg-slate-950/95 backdrop-blur-xl p-4 select-none';
      overlay.style.pointerEvents ='auto';
      overlay.innerHTML =`
        <div class="relative w-full max-w-md bg-slate-900 border-2 border-amber-500/80 rounded-2xl p-6 text-center shadow-2xl shadow-amber-500/20">
          <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 text-3xl">
            <i class="fa-solid fa-arrows-rotate animate-spin" style="animation-duration: 3s;"></i>
          </div>
          <h3 class="text-xl font-black text-white mb-1.5">️ مطلوب إعادة تحميل الصفحة فوراً</h3>
          <div class="inline-block px-3 py-1 bg-amber-500/20 text-amber-300 text-xs font-bold rounded-full border border-amber-500/30 mb-3">
            تحديث إداري إجباري
          </div>
          <p id="mandatory-reload-reason" class="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6 font-medium">
            ${customMessage ||'تم إطلاق تحديث جديد للعبة بواسطة الإدارة. يجب إعادة تحميل الصفحة الآن لتطبيق التغييرات وضمان استقرار ومزامنة حسابك.'}
          </p>
          <button id="btn-mandatory-reload-action" class="w-full py-3.5 px-6 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm sm:text-base rounded-xl shadow-lg shadow-amber-500/30 transition transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer">
            <i class="fa-solid fa-rotate-right text-lg"></i>
            <span>إعادة تحميل الصفحة الآن (Reload)</span>
          </button>
          <p class="text-[11px] text-slate-400 mt-4">
             لا يمكن متابعة اللعب أو إغلاق هذه النافذة إلا بعد إعادة تحميل الصفحة.
          </p>
        </div>`;
      document.body.appendChild(overlay);
    } else {
      overlay.classList.remove('hidden');
      const reasonEl = document.getElementById('mandatory-reload-reason');
      if (reasonEl && customMessage) {
        reasonEl.textContent = customMessage;
      }
    }

    // 4. Force Reload Action
    const doReload = () => {
      if (reloadTs) {
        sessionStorage.setItem('rasalmal_acknowledged_reload', String(reloadTs));
      }
      try {
        window.location.reload(true);
      } catch (err) {
        window.location.href = window.location.href;
      }
    };

    const actionBtn = document.getElementById('btn-mandatory-reload-action');
    if (actionBtn) {
      actionBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        doReload();
      };
    }

    // If user refreshes using browser refresh
    window.addEventListener('beforeunload', () => {
      if (reloadTs) {
        sessionStorage.setItem('rasalmal_acknowledged_reload', String(reloadTs));
      }
    });

    // 5. Intercept all clicks and keyboard events so it cannot be dismissed
    overlay.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    window.addEventListener('keydown', (e) => {
      if (!isMandatoryReloadActive) return;
      if (e.key ==='F5' || (e.ctrlKey && e.key.toLowerCase() ==='r')) {
        if (reloadTs) sessionStorage.setItem('rasalmal_acknowledged_reload', String(reloadTs));
        return; // Allow standard browser reload
      }
      e.preventDefault();
      e.stopPropagation();
    }, true);

    // 6. Anti-tamper Observer: If anyone attempts to remove or hide the overlay, re-apply immediately
    try {
      const observer = new MutationObserver(() => {
        if (!isMandatoryReloadActive) return;
        if (overlay.classList.contains('hidden')) {
          overlay.classList.remove('hidden');
        }
        if (!document.body.contains(overlay)) {
          document.body.appendChild(overlay);
        }
      });
      observer.observe(overlay, { attributes: true, childList: true });
      observer.observe(document.body, { childList: true });
    } catch (e) {}
  }

  function handleBannedUser() {
    const banOverlay = document.getElementById('ban-overlay');
    const mainGameLayout = document.getElementById('main-game-layout');
    const authScreen = document.getElementById('auth-screen');
    const startMenu = document.getElementById('start-menu-screen');
    if (banOverlay) banOverlay.classList.remove('hidden');
    if (mainGameLayout) {
      mainGameLayout.classList.add('hidden');
      mainGameLayout.classList.remove('flex');
    }
    if (authScreen) authScreen.classList.add('hidden');
    if (startMenu) startMenu.classList.add('hidden');
    performLogout(false);
  }

  function performLogout(showToastMsg = true) {
    activeListeners.forEach(unsub => unsub());
    activeListeners = [];
    if (typeof AppDB !=='undefined') {
      if (typeof AppDB.stopListeningToChat ==='function') AppDB.stopListeningToChat();
      if (typeof AppDB.cleanupAllNetworkPolling ==='function') AppDB.cleanupAllNetworkPolling();
    }
    window._chatListenerInitialized = false;
    localStorage.removeItem('rasalmal_active_session_user');
    GameEngine.logoutUser();
    document.getElementById('auth-screen').classList.add('hidden');
    const mainLayout = document.getElementById('main-game-layout');
    if (mainLayout) {
      mainLayout.classList.add('hidden');
      mainLayout.classList.remove('flex');
    }
    document.getElementById('start-menu-screen').classList.remove('hidden');
    refreshStartMenuCard();
    if (showToastMsg) {
      showToast('تسجيل الخروج','تم تسجيل خروجك بنجاح وحفظ بيانات المحفظة.','info');
    }
  }

  function setupAdminModal() {
    const triggerSide = document.getElementById('btn-admin-panel-trigger');
    const triggerMobile = document.getElementById('btn-admin-panel-trigger-mobile');
    const triggerFab = document.getElementById('btn-admin-panel-trigger-fab');
    const modal = document.getElementById('admin-panel-modal');
    const closeBtn = document.getElementById('btn-admin-modal-close');

    if (!modal) return;

    // Live Clock Interval in Admin Header
    setInterval(() => {
      const clockEl = document.getElementById('adm-live-clock');
      if (clockEl) {
        clockEl.textContent = new Date().toLocaleTimeString('ar-EG');
      }
    }, 1000);

    // Broadcast listener is handled by setupRealTimeListeners() to avoid duplicate toasts

    const openModal = () => {
      playMenuSound('modal_open');
      modal.classList.remove('hidden');
      switchAdminTab('stats');
    };

    if (triggerSide) triggerSide.addEventListener('click', openModal);
    if (triggerMobile) triggerMobile.addEventListener('click', openModal);
    if (triggerFab) triggerFab.addEventListener('click', openModal);

    // Close panel
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
      });
    }

    // Manual Refresh Button in Admin Header
    const manualRefreshBtn = document.getElementById('btn-admin-manual-refresh');
    if (manualRefreshBtn) {
      manualRefreshBtn.addEventListener('click', async () => {
        manualRefreshBtn.disabled = true;
        manualRefreshBtn.innerHTML ='<i class="fa-solid fa-spinner fa-spin"></i> <span>جاري التحديث...</span>';
        try {
          if (typeof loadAdminPlayersDirectory ==='function') {
            await loadAdminPlayersDirectory(true, true);
          }
          if (typeof showToast ==='function') {
            showToast('تحديث الإدارة','تم تحديث كافة بيانات لوحة التحكم بنجاح!','success');
          }
        } catch (e) {
          console.error('[Admin] Manual refresh error:', e);
        } finally {
          manualRefreshBtn.disabled = false;
          manualRefreshBtn.innerHTML ='<i class="fa-solid fa-rotate-right"></i> <span>تحديث البيانات</span>';
        }
      });
    }

    // Tabs logic - bind all 9 subtabs
    const tabs = ['stats','players','transfers','market','broadcast','auctions','giftcodes','system','corporations'];
    tabs.forEach(t => {
      const tabEl = document.getElementById(`tab-admin-${t}`);
      if (tabEl) {
        tabEl.addEventListener('click', () => {
          switchAdminTab(t);
        });
      }
    });

    // Setup Simulated Telemetry & real Latency Updates
    setInterval(() => {
      if (!modal.classList.contains('hidden')) {
        // CPU simulation: fluctuates between 0.5% and 2.8%
        const cpuEl = document.getElementById('adm-telemetry-cpu');
        if (cpuEl) {
          cpuEl.textContent = (0.5 + Math.random() * 2.3).toFixed(1) +'%';
        }
        
        // RAM simulation: fluctuates between 40 MB and 52 MB
        const ramEl = document.getElementById('adm-telemetry-ram');
        if (ramEl) {
          ramEl.textContent = Math.floor(40 + Math.random() * 12) +' MB';
        }
        
        // Latency simulation (No DB query to conserve read quota)
        const latencyEl = document.getElementById('adm-telemetry-latency');
        if (latencyEl) {
          latencyEl.textContent = Math.floor(18 + Math.random() * 14) +'ms';
        }
      }
    }, 3000);

    // ─────────────────────────────────────────────
    //  MODULE: PLAYERS DIRECTORY & MANAGEMENT
    // ─────────────────────────────────────────────
    let cachedPlayers = [];
    let selectedPlayer = null;
    let selectedPlayerState = null;
    let activeFilter ='all';

    const searchInput = document.getElementById('admin-search-user');
    const searchBtn = document.getElementById('btn-admin-search');
    const refreshListBtn = document.getElementById('btn-admin-refresh-players-list');
    const playersTableBody = document.getElementById('admin-players-table-body');
    const resultCard = document.getElementById('admin-player-result');

    async function loadAdminPlayersDirectory(showToastNotice = false, forceRefresh = false) {
      if (!playersTableBody) return;
      playersTableBody.innerHTML ='<tr><td colspan="5" class="py-4 text-center text-slate-400">جاري فحص وتحديث بيانات اللاعبين...</td></tr>';
      try {
        cachedPlayers = await AppDB.adminGetAllPlayers(forceRefresh);
        renderPlayersTable();
        updateFilterCounts();
        if (showToastNotice) {
          const isCache = cachedPlayers.length > 0 && cachedPlayers.every(p => p.fromCache);
          const cacheMsg = isCache ?' (بيانات الكاش المحلي)' :' (مباشر من السيرفر )';
          showToast('قائمة اللاعبين',`تم جلب بيانات ${cachedPlayers.length} لاعب بنجاح${cacheMsg}.`,'success');
        }
      } catch (err) {
        playersTableBody.innerHTML =`<tr><td colspan="5" class="py-4 text-center text-rose-400">تعذر تحميل القائمة: ${err.message}</td></tr>`;
      }
    }

    function updateFilterCounts() {
      const countAll = cachedPlayers.length;
      const countJailed = cachedPlayers.filter(p => p.jailTimer > 0).length;
      const countBanned = cachedPlayers.filter(p => p.isBanned).length;

      const elAll = document.getElementById('adm-filter-count-all');
      const elJailed = document.getElementById('adm-filter-count-jailed');
      const elBanned = document.getElementById('adm-filter-count-banned');
      const elTotal = document.getElementById('admin-players-total-label');

      if (elAll) elAll.textContent = countAll;
      if (elJailed) elJailed.textContent = countJailed;
      if (elBanned) elBanned.textContent = countBanned;
      
      const serverTotal = window._adminLastTotalPlayers;
      if (elTotal) {
        if (serverTotal && serverTotal > countAll) {
          elTotal.textContent =`${serverTotal} لاعب مسجل (${countAll} مفهرس)`;
        } else {
          elTotal.textContent =`${countAll} لاعب مسجل`;
        }
      }
    }

    function renderPlayersTable() {
      if (!playersTableBody) return;
      const rawQuery = (searchInput ? searchInput.value.trim() :'');
      const query = rawQuery.toLowerCase();

      let filtered = cachedPlayers.filter(p => {
        const matchesQuery = !query || p.username.toLowerCase().includes(query) || (p.title && p.title.toLowerCase().includes(query));
        if (!matchesQuery) return false;

        if (activeFilter ==='jailed') return p.jailTimer > 0;
        if (activeFilter ==='banned') return p.isBanned;
        return true;
      });

      if (filtered.length === 0) {
        if (rawQuery) {
          playersTableBody.innerHTML =`
            <tr>
              <td colspan="5" class="py-6 text-center space-y-2">
                <div class="text-slate-400 text-xs">لم يتم العثور على اللاعب"${rawQuery}" في القائمة المفهرسة محلياً.</div>
                <button id="btn-ui-direct-cloud-lookup" class="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold rounded-lg text-xs transition inline-flex items-center gap-2 shadow-lg shadow-yellow-500/20">
                  <i class="fa-solid fa-cloud-arrow-down"></i>
                  <span>فحص وبحث مباشر بالاسم في السيرفر السحابي</span>
                </button>
              </td>
            </tr>`;
          const lookupBtn = document.getElementById('btn-ui-direct-cloud-lookup');
          if (lookupBtn) {
            lookupBtn.onclick = async () => {
              lookupBtn.disabled = true;
              lookupBtn.innerHTML ='<i class="fa-solid fa-spinner fa-spin"></i> جاري الاستعلام السحابي...';
              try {
                const fetchedDoc = await AppDB.adminGetPlayer(rawQuery);
                if (fetchedDoc) {
                  const existingIdx = cachedPlayers.findIndex(p => p.username.toLowerCase() === rawQuery.toLowerCase());
                  const playerObj = {
                    username: fetchedDoc.username || rawQuery,
                    netWorth: Number(fetchedDoc.netWorth || 0),
                    cash: Number(fetchedDoc.cash || 0),
                    bank: Number(fetchedDoc.bank || 0),
                    title: fetchedDoc.title ||'عامل مبتدئ',
                    jobId: fetchedDoc.jobId ||'unemployed',
                    jailTimer: Number(fetchedDoc.jailTimer || 0),
                    isBanned: Boolean(fetchedDoc.isBanned),
                    isAdmin: Boolean(fetchedDoc.isAdmin),
                    createdAt: fetchedDoc.createdAt || 0,
                    lastSeen: fetchedDoc.lastSeen || 0,
                    lastActiveTimestamp: fetchedDoc.lastActiveTimestamp || 0,
                    raw: fetchedDoc
                  };
                  if (existingIdx >= 0) {
                    cachedPlayers[existingIdx] = playerObj;
                  } else {
                    cachedPlayers.unshift(playerObj);
                  }
                  renderPlayersTable();
                  updateFilterCounts();
                  selectPlayerForModeration(playerObj.username);
                  showToast('تم العثور على الحساب',`تم جلب ملف اللاعب ${playerObj.username} مباشرة من السيرفر!`,'success');
                } else {
                  showToast('غير موجود',`اسم المستخدم"${rawQuery}" غير مسجل في خوادم اللعبة.`,'warning');
                  lookupBtn.disabled = false;
                  lookupBtn.innerHTML ='<i class="fa-solid fa-triangle-exclamation"></i> غير مسجل بالسيرفر';
                }
              } catch (err) {
                showToast('خطأ استعلام', err.message,'error');
                lookupBtn.disabled = false;
                lookupBtn.innerHTML ='<i class="fa-solid fa-rotate-right"></i> إعادة المحاولة';
              }
            };
          }
        } else {
          playersTableBody.innerHTML ='<tr><td colspan="5" class="py-6 text-center text-slate-500">لا يوجد حسابات مطابقة لمعايير الفلترة الحالية.</td></tr>';
        }
        return;
      }

      playersTableBody.innerHTML ='';
      filtered.forEach(p => {
        const tr = document.createElement('tr');
        tr.className =`hover:bg-slate-800/60 transition cursor-pointer ${selectedPlayer === p.username ?'bg-yellow-500/10 border-r-2 border-yellow-500' :''}`;

        const isOnlineThreshold = 2 * 60 * 1000; // 2 minutes
        const isPlayerOnline = p.lastActiveTimestamp && (Date.now() - p.lastActiveTimestamp) < isOnlineThreshold;
        let statusBadge = isPlayerOnline
          ?'<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">متصل </span>'
          :'<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">غير نشط </span>';
        if (p.isBanned) {
          statusBadge ='<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">محظور </span>';
        } else if (p.jailTimer > 0) {
          statusBadge =`<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">سجين (${p.jailTimer}ث)${isPlayerOnline ?'' :''}</span>`;
        } else if (p.isAdmin) {
          statusBadge =`<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">الإدارة ⭐${isPlayerOnline ?'' :''}</span>`;
        }

        tr.innerHTML =`
          <td class="p-2.5 flex items-center gap-2">
            <div class="w-6 h-6 rounded-full bg-slate-800 text-yellow-400 flex items-center justify-center font-bold text-[10px]">
              ${p.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <div class="font-bold text-white">${p.username} ${p.username === GameEngine.activeUsername ?'<span class="text-[9px] text-yellow-400">(أنت)</span>' :''}</div>
              <div class="text-[10px] text-slate-400 font-sans">${p.title ||'عامل مبتدئ'}</div>
            </div>
          </td>
          <td class="p-2.5 text-center numbers-font font-bold text-yellow-400">${(p.netWorth || 0).toLocaleString()} EGP</td>
          <td class="p-2.5 text-center numbers-font font-bold text-emerald-400">${(p.cash || 0).toLocaleString()} EGP</td>
          <td class="p-2.5 text-center">${statusBadge}</td>
          <td class="p-2.5 text-left">
            <button data-user="${p.username}" class="btn-select-player px-2.5 py-1 bg-yellow-500/20 hover:bg-yellow-500 text-yellow-400 hover:text-slate-950 rounded text-[10px] font-bold transition">إدارة </button>
          </td>`;

        tr.addEventListener('click', (e) => {
          selectPlayerForModeration(p.username);
        });

        playersTableBody.appendChild(tr);
      });
    }

    async function selectPlayerForModeration(username) {
      if (!username) return;
      try {
        const state = await AppDB.adminGetPlayer(username);
        selectedPlayer = username;
        selectedPlayerState = state;

        document.getElementById('admin-p-username').textContent = username;
        document.getElementById('admin-p-worth').textContent =`${(state.netWorth || 0).toLocaleString()} EGP`;
        document.getElementById('admin-p-cash').textContent = (state.cash || 0).toLocaleString();
        document.getElementById('admin-p-bank').textContent = (state.bank || 0).toLocaleString();
        const dirtyEl = document.getElementById('admin-p-dirty');
        if (dirtyEl) dirtyEl.textContent = (state.dirtyCash || 0).toLocaleString();
        document.getElementById('admin-p-title').textContent = state.title ||'عامل مبتدئ';

        // Format and render account creation date
        let createdStr ='غير معروف';
        if (state.createdAt) {
          let date;
          if (typeof state.createdAt.toDate ==='function') {
            date = state.createdAt.toDate();
          } else if (state.createdAt.seconds) {
            date = new Date(state.createdAt.seconds * 1000);
          } else {
            date = new Date(state.createdAt);
          }
          if (date && !isNaN(date.getTime())) {
            createdStr = date.toLocaleDateString('ar-EG') +'' + date.toLocaleTimeString('ar-EG', { hour:'2-digit', minute:'2-digit' });
          }
        }
        const createdEl = document.getElementById('admin-p-created-at');
        if (createdEl) createdEl.textContent = createdStr;

        // Calculate and render financial telemetry flows
        const originalState = GameEngine.state;
        let grossIncomePerSecond = 0;
        let taxPerSecond = 0;
        let netIncomePerSecond = 0;
        try {
          GameEngine.state = state;
          if (typeof GameEngine.getDetailedCashflowBreakdown ==='function') {
            const breakdown = GameEngine.getDetailedCashflowBreakdown(state);
            if (breakdown) {
              grossIncomePerSecond = breakdown.totalGrossPerSec || 0;
              taxPerSecond = (breakdown.tax && breakdown.tax.taxPerSec) || 0;
              netIncomePerSecond = breakdown.totalNetPerSec || 0;
            }
          } else {
            const tickIncome = GameEngine.calculatePassiveIncomePerTick ? GameEngine.calculatePassiveIncomePerTick(true) : 0;
            const taxReport = GameEngine.calculateTaxReport ? GameEngine.calculateTaxReport() : { taxPerSecond: 0 };
            grossIncomePerSecond = Math.max(0, tickIncome);
            taxPerSecond = ((state.netWorth || 0) > 5000000 && (((state.bank || 0) + (state.cash || 0)) > 100000)) ? (taxReport.taxPerSecond || 0) : 0;
            netIncomePerSecond = Math.max(0, grossIncomePerSecond - taxPerSecond);
          }
        } catch (err) {
          console.warn("Failed to simulate player flows:", err);
        } finally {
          GameEngine.state = originalState;
        }

        const grossFlowEl = document.getElementById('admin-p-flow-gross');
        if (grossFlowEl) grossFlowEl.textContent =`${grossIncomePerSecond.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} EGP/ث`;

        const taxFlowEl = document.getElementById('admin-p-flow-tax');
        if (taxFlowEl) taxFlowEl.textContent =`${taxPerSecond.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} EGP/ث`;

        const netFlowEl = document.getElementById('admin-p-flow-net');
        if (netFlowEl) netFlowEl.textContent =`${netIncomePerSecond.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} EGP/ث`;

        const roleBadge = document.getElementById('admin-p-badge-role');
        if (roleBadge) {
          roleBadge.textContent = state.isAdmin ?'مدير النظام (Admin)' :'حساب لاعب';
          roleBadge.className = state.isAdmin
            ?'text-[10px] px-2 py-0.5 rounded font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
            :'text-[10px] px-2 py-0.5 rounded font-bold bg-slate-800 text-slate-300';
        }

        const toggleRoleBtn = document.getElementById('btn-admin-toggle-role');
        const toggleRoleText = document.getElementById('admin-toggle-role-text');
        if (toggleRoleBtn && toggleRoleText) {
          if (state.isAdmin) {
            toggleRoleText.textContent ='سحب صلاحية الإدارة (إلغاء أدمن) ️';
            toggleRoleBtn.className ='w-full py-2 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/40 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1.5';
          } else {
            toggleRoleText.textContent ='نقل صلاحية الإدارة / تعيين كمسؤول (Make Admin)';
            toggleRoleBtn.className ='w-full py-2 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 rounded-lg text-[11px] font-black transition flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20';
          }
        }

        const statusBadge = document.getElementById('admin-p-badge-status');
        if (statusBadge) {
          const onlineThreshold = 2 * 60 * 1000; // 2 minutes
          const isOnline = state.lastActiveTimestamp && (Date.now() - state.lastActiveTimestamp) < onlineThreshold;
          const lastSeenText = state.lastActiveTimestamp ? new Date(state.lastActiveTimestamp).toLocaleTimeString('ar-EG') :'غير معروف';
          if (state.isBanned) {
            statusBadge.textContent ='محظور نهائياً';
            statusBadge.className ='text-[10px] px-2 py-0.5 rounded font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30';
          } else if (state.jailTimer > 0) {
            statusBadge.textContent =`مسجون (${state.jailTimer} ثانية) ${isOnline ?' متصل' :' غير نشط'}`;
            statusBadge.className ='text-[10px] px-2 py-0.5 rounded font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30';
          } else if (isOnline) {
            statusBadge.textContent =`متصل الآن  (آخر نشاط: ${lastSeenText})`;
            statusBadge.className ='text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
          } else {
            statusBadge.textContent =`غير نشط  (آخر ظهور: ${lastSeenText})`;
            statusBadge.className ='text-[10px] px-2 py-0.5 rounded font-bold bg-slate-600/20 text-slate-400 border border-slate-500/30';
          }
        }

        document.getElementById('admin-input-cash').value = state.cash || 0;
        document.getElementById('admin-input-bank').value = state.bank || 0;

        const bizSelect = document.getElementById('admin-input-biz-type');
        if (bizSelect) {
          const selectedBiz = bizSelect.value;
          const bizData = (state.businesses && state.businesses[selectedBiz]) || { level: 0, workers: 0 };
          document.getElementById('admin-input-biz-level').value = bizData.level || 0;
          document.getElementById('admin-input-biz-workers').value = bizData.workers || 0;
        }

        if (resultCard) {
          resultCard.classList.remove('hidden');
          resultCard.scrollIntoView({ behavior:'smooth', block:'nearest' });
        }
        renderPlayersTable();
        renderPlayerPossessions(state);
        loadAdminPlayerWorkspace(state);
        logAdminAction(`تم فتح ملف الحساب للاعب: ${username}`);
      } catch (err) {
        showToast('خطأ فحص اللاعب', err.message,'error');
      }
    }

    // ==================== PLAYER POSSESSIONS & BACKUP EXPORT & GRANT ACTIONS ====================

    // RENDER PLAYER POSSESSIONS DIRECTORY
    function renderPlayerPossessions(state) {
      const container = document.getElementById('admin-p-possessions-container');
      if (!container) return;
      container.innerHTML ='';

      let hasItems = false;

      // 1. Current Job
      if (state.jobId || state.title) {
        hasItems = true;
        const jobDiv = document.createElement('div');
        jobDiv.className ='flex justify-between items-center bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/80 hover:border-yellow-500/20 transition';
        jobDiv.innerHTML =`
          <div class="flex items-center gap-2">
            <span class="text-base"></span>
            <div>
              <div class="font-bold text-slate-200">الوظيفة الحالية</div>
              <div class="text-[10px] text-slate-400 font-sans">${state.title ||'عامل مبتدئ'}</div>
            </div>
          </div>
          <select class="admin-inline-job-select bg-slate-950 border border-slate-700 text-slate-300 p-1.5 rounded-md text-[10px] focus:outline-none focus:border-yellow-500">
            ${Object.keys(GameEngine.JOBS).map(jk =>'<option value="' + jk +'"' + (state.jobId === jk ?'selected' :'') +'>' + GameEngine.JOBS[jk].name +'</option>').join('')}
          </select>`;
        jobDiv.querySelector('.admin-inline-job-select').addEventListener('change', async (e) => {
          const jobKey = e.target.value;
          state.jobId = jobKey;
          state.title = GameEngine.JOBS[jobKey].name;
          await saveAndSyncPlayerPossessions();
        });
        container.appendChild(jobDiv);
      }

      // 2. Businesses / Projects
      if (state.businesses) {
        Object.keys(state.businesses).forEach(bk => {
          const biz = state.businesses[bk];
          if (!biz || biz.level <= 0) return;
          hasItems = true;
          const bizConfig = GameEngine.BUSINESSES[bk];
          const bizName = bizConfig ? bizConfig.name : bk;

          const bizDiv = document.createElement('div');
          bizDiv.className ='flex justify-between items-center bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/80 hover:border-yellow-500/20 transition gap-2 mt-2';
          bizDiv.innerHTML =`
            <div class="flex items-center gap-2 flex-1 text-right">
              <span class="text-base"></span>
              <div>
                <div class="font-bold text-slate-200">${bizName}</div>
                <div class="text-[10px] text-slate-400">المستوى: <span class="text-yellow-400 font-bold font-mono">${biz.level}</span> | الموظفين: <span class="text-sky-400 font-bold font-mono">${biz.workers}</span></div>
              </div>
            </div>
            <div class="flex items-center gap-1">
              <button class="btn-inline-biz-lvl-dec px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold" title="تقليل المستوى">-L</button>
              <button class="btn-inline-biz-lvl-inc px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold" title="زيادة المستوى">+L</button>
              <span class="text-slate-700 mx-0.5">|</span>
              <button class="btn-inline-biz-wrk-dec px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold" title="تقليل الموظفين">-W</button>
              <button class="btn-inline-biz-wrk-inc px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold" title="زيادة الموظفين">+W</button>
              <button class="btn-inline-biz-del ml-1 p-1.5 text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition" title="حذف المشروع"><i class="fa-solid fa-trash-can"></i></button>
            </div>`;

          bizDiv.querySelector('.btn-inline-biz-lvl-dec').addEventListener('click', async () => {
            biz.level = Math.max(0, biz.level - 1);
            await saveAndSyncPlayerPossessions();
          });
          bizDiv.querySelector('.btn-inline-biz-lvl-inc').addEventListener('click', async () => {
            biz.level += 1;
            await saveAndSyncPlayerPossessions();
          });
          bizDiv.querySelector('.btn-inline-biz-wrk-dec').addEventListener('click', async () => {
            biz.workers = Math.max(0, biz.workers - 1);
            await saveAndSyncPlayerPossessions();
          });
          bizDiv.querySelector('.btn-inline-biz-wrk-inc').addEventListener('click', async () => {
            biz.workers += 1;
            await saveAndSyncPlayerPossessions();
          });
          bizDiv.querySelector('.btn-inline-biz-del').addEventListener('click', async () => {
            if (confirm(`هل أنت متأكد من حذف مشروع"${bizName}" لللاعب؟`)) {
              biz.level = 0;
              biz.workers = 0;
              await saveAndSyncPlayerPossessions();
            }
          });

          container.appendChild(bizDiv);
        });
      }

      // 3. Assets / Real Estate
      if (state.assets) {
        Object.keys(state.assets).forEach(ak => {
          const qty = state.assets[ak] || 0;
          if (qty <= 0) return;
          hasItems = true;
          const assetConfig = GameEngine.ASSETS[ak];
          const assetName = assetConfig ? assetConfig.name : ak;

          const assetDiv = document.createElement('div');
          assetDiv.className ='flex justify-between items-center bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/80 hover:border-yellow-500/20 transition mt-2';
          assetDiv.innerHTML =`
            <div class="flex items-center gap-2 text-right">
              <span class="text-base"></span>
              <div>
                <div class="font-bold text-slate-200">${assetName}</div>
                <div class="text-[10px] text-slate-400">العدد المملوك: <strong class="text-emerald-400 font-mono">${qty}</strong></div>
              </div>
            </div>
            <div class="flex items-center gap-1">
              <button class="btn-inline-ast-dec px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold">-</button>
              <button class="btn-inline-ast-inc px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold">+</button>
              <button class="btn-inline-ast-del ml-1 p-1.5 text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition" title="حذف الأصل"><i class="fa-solid fa-trash-can"></i></button>
            </div>`;

          assetDiv.querySelector('.btn-inline-ast-dec').addEventListener('click', async () => {
            state.assets[ak] = Math.max(0, qty - 1);
            await saveAndSyncPlayerPossessions();
          });
          assetDiv.querySelector('.btn-inline-ast-inc').addEventListener('click', async () => {
            state.assets[ak] = qty + 1;
            await saveAndSyncPlayerPossessions();
          });
          assetDiv.querySelector('.btn-inline-ast-del').addEventListener('click', async () => {
            if (confirm(`هل أنت متأكد من حذف عقارات"${assetName}" بالكامل لللاعب؟`)) {
              state.assets[ak] = 0;
              await saveAndSyncPlayerPossessions();
            }
          });

          container.appendChild(assetDiv);
        });
      }

      // 4. Stocks
      if (state.stocks) {
        Object.keys(state.stocks).forEach(sk => {
          const stockData = state.stocks[sk];
          if (!stockData || stockData.shares <= 0) return;
          hasItems = true;
          const stockConfig = GameEngine.STOCKS[sk];
          const stockName = stockConfig ? stockConfig.name : sk;

          const stockDiv = document.createElement('div');
          stockDiv.className ='flex justify-between items-center bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/80 hover:border-yellow-500/20 transition gap-2 mt-2';
          stockDiv.innerHTML =`
            <div class="flex items-center gap-2 flex-1 text-right">
              <span class="text-base"></span>
              <div>
                <div class="font-bold text-slate-200">${sk} (${stockName})</div>
                <div class="text-[10px] text-slate-400">الأسهم: <span class="text-yellow-400 font-bold font-mono">${stockData.shares}</span> | متوسط الشراء: <span class="text-sky-400 font-bold font-mono">${stockData.avgPrice} EGP</span></div>
              </div>
            </div>
            <div class="flex items-center gap-1">
              <button class="btn-inline-stk-edit px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold">تعديل</button>
              <button class="btn-inline-stk-del p-1.5 text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition" title="حذف الأسهم"><i class="fa-solid fa-trash-can"></i></button>
            </div>`;

          stockDiv.querySelector('.btn-inline-stk-edit').addEventListener('click', async () => {
            const newShares = prompt(`أدخل عدد الأسهم الجديد لسهم (${sk}):`, stockData.shares);
            if (newShares === null) return;
            const newPrice = prompt(`أدخل متوسط سعر الشراء الجديد للسهم:`, stockData.avgPrice);
            if (newPrice === null) return;

            const sharesVal = parseInt(newShares) || 0;
            const priceVal = parseFloat(newPrice) || 0;

            if (sharesVal < 0 || priceVal < 0) {
              showToast('خطأ إدخال','يرجى إدخال قيم صحيحة للأسهم والأسعار.','error');
              return;
            }

            stockData.shares = sharesVal;
            stockData.avgPrice = priceVal;
            await saveAndSyncPlayerPossessions();
          });

          stockDiv.querySelector('.btn-inline-stk-del').addEventListener('click', async () => {
            if (confirm(`هل أنت متأكد من حذف أسهم"${sk}" لللاعب؟`)) {
              stockData.shares = 0;
              await saveAndSyncPlayerPossessions();
            }
          });

          container.appendChild(stockDiv);
        });
      }

      if (!hasItems) {
        container.innerHTML =`<p class="text-slate-500 text-[10px] text-center py-2">لا يوجد أملاك أو وظائف لعرضها حالياً لهذا اللاعب.</p>`;
      }
    }

    // SAVE AND SYNC PLAYER STATE & POSSESSIONS
    async function saveAndSyncPlayerPossessions() {
      if (!selectedPlayer || !selectedPlayerState) return;
      try {
        // Re-calculate Net Worth of selected player state
        let worth = (selectedPlayerState.cash || 0) + (selectedPlayerState.bank || 0) + (selectedPlayerState.dirtyCash || 0);

        if (selectedPlayerState.assets) {
          Object.keys(selectedPlayerState.assets).forEach(k => {
            if (GameEngine.ASSETS && GameEngine.ASSETS[k]) worth += (selectedPlayerState.assets[k] || 0) * GameEngine.ASSETS[k].cost;
          });
        }
        if (selectedPlayerState.stocks) {
          Object.keys(selectedPlayerState.stocks).forEach(sym => {
            const shares = (selectedPlayerState.stocks[sym] && selectedPlayerState.stocks[sym].shares) || 0;
            const history = GameEngine.stockPrices[sym] || [GameEngine.STOCKS[sym]?.basePrice || 10];
            const currentPrice = history[history.length - 1];
            worth += shares * currentPrice;
          });
        }
        if (selectedPlayerState.investments && Array.isArray(selectedPlayerState.investments)) {
          selectedPlayerState.investments.forEach(inv => worth += (inv.investedAmount || 0));
        }
        selectedPlayerState.netWorth = worth;

        // Save to DB
        await AppDB.adminSavePlayer(selectedPlayer, selectedPlayerState);

        // Sync local GameEngine state if we edited ourselves
        if (selectedPlayer === GameEngine.activeUsername) {
          GameEngine.state.jobId = selectedPlayerState.jobId ||'worker';
          GameEngine.state.title = selectedPlayerState.title ||'عامل مبتدئ';
          GameEngine.state.businesses = JSON.parse(JSON.stringify(selectedPlayerState.businesses || {}));
          GameEngine.state.assets = JSON.parse(JSON.stringify(selectedPlayerState.assets || {}));
          GameEngine.state.stocks = JSON.parse(JSON.stringify(selectedPlayerState.stocks || {}));
          GameEngine.state.netWorth = worth;
          try {
            localStorage.setItem(`rasalmal_state_${selectedPlayer}`, JSON.stringify(GameEngine.state));
          } catch (e) { }
          renderAll();
        }

        // Calculate and render financial telemetry flows dynamically
        const originalState = GameEngine.state;
        let grossIncomePerSecond = 0;
        let taxPerSecond = 0;
        let netIncomePerSecond = 0;
        try {
          GameEngine.state = selectedPlayerState;
          if (typeof GameEngine.getDetailedCashflowBreakdown ==='function') {
            const breakdown = GameEngine.getDetailedCashflowBreakdown(selectedPlayerState);
            if (breakdown) {
              grossIncomePerSecond = breakdown.totalGrossPerSec || 0;
              taxPerSecond = (breakdown.tax && breakdown.tax.taxPerSec) || 0;
              netIncomePerSecond = breakdown.totalNetPerSec || 0;
            }
          } else {
            const tickIncome = GameEngine.calculatePassiveIncomePerTick ? GameEngine.calculatePassiveIncomePerTick(true) : 0;
            const taxReport = GameEngine.calculateTaxReport ? GameEngine.calculateTaxReport() : { taxPerSecond: 0 };
            grossIncomePerSecond = Math.max(0, tickIncome);
            taxPerSecond = ((selectedPlayerState.netWorth || 0) > 5000000 && (((selectedPlayerState.bank || 0) + (selectedPlayerState.cash || 0)) > 100000)) ? (taxReport.taxPerSecond || 0) : 0;
            netIncomePerSecond = Math.max(0, grossIncomePerSecond - taxPerSecond);
          }
        } catch (err) {
          console.warn("Failed to simulate player flows:", err);
        } finally {
          GameEngine.state = originalState;
        }

        const grossFlowEl = document.getElementById('admin-p-flow-gross');
        if (grossFlowEl) grossFlowEl.textContent =`${grossIncomePerSecond.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} EGP/ث`;

        const taxFlowEl = document.getElementById('admin-p-flow-tax');
        if (taxFlowEl) taxFlowEl.textContent =`${taxPerSecond.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} EGP/ث`;

        const netFlowEl = document.getElementById('admin-p-flow-net');
        if (netFlowEl) netFlowEl.textContent =`${netIncomePerSecond.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} EGP/ث`;

        // Update Admin UI fields
        document.getElementById('admin-p-worth').textContent =`${worth.toLocaleString()} EGP`;
        document.getElementById('admin-p-title').textContent = selectedPlayerState.title ||'عامل مبتدئ';

        // Re-render
        renderPlayerPossessions(selectedPlayerState);
        loadAdminPlayersDirectory(false);
        showToast('حفظ التعديلات','تم تحديث ممتلكات اللاعب بنجاح وحفظها.','success');
      } catch (err) {
        showToast('خطأ حفظ ممتلكات', err.message,'error');
      }
    }

    // Dynamic Select Populate for Grant Tool
    function populateGrantItemSelect() {
      const typeSelect = document.getElementById('admin-grant-type');
      const itemSelect = document.getElementById('admin-grant-item-select');
      if (!typeSelect || !itemSelect) return;

      const type = typeSelect.value;
      itemSelect.innerHTML ='';

      // Toggle fields visibility
      document.getElementById('admin-grant-fields-job').classList.toggle('hidden', type !=='job');
      document.getElementById('admin-grant-fields-business').classList.toggle('hidden', type !=='business');
      document.getElementById('admin-grant-fields-asset').classList.toggle('hidden', type !=='asset');
      document.getElementById('admin-grant-fields-stock').classList.toggle('hidden', type !=='stock');

      let options = [];
      if (type ==='job') {
        Object.keys(GameEngine.JOBS).forEach(k => {
          options.push({ value: k, text: GameEngine.JOBS[k].name });
        });
      } else if (type ==='business') {
        Object.keys(GameEngine.BUSINESSES).forEach(k => {
          options.push({ value: k, text: GameEngine.BUSINESSES[k].name });
        });
      } else if (type ==='asset') {
        Object.keys(GameEngine.ASSETS).forEach(k => {
          options.push({ value: k, text: GameEngine.ASSETS[k].name });
        });
      } else if (type ==='stock') {
        Object.keys(GameEngine.STOCKS).forEach(k => {
          options.push({ value: k, text:`${k} (${GameEngine.STOCKS[k].name})` });
        });
      }

      options.forEach(opt => {
        const el = document.createElement('option');
        el.value = opt.value;
        el.textContent = opt.text;
        itemSelect.appendChild(el);
      });
    }

    const grantTypeSelect = document.getElementById('admin-grant-type');
    if (grantTypeSelect) {
      grantTypeSelect.addEventListener('change', populateGrantItemSelect);
      populateGrantItemSelect(); // Initial load
    }

    // Grant Possession Action
    const grantPossessionBtn = document.getElementById('btn-admin-grant-possession');
    if (grantPossessionBtn) {
      grantPossessionBtn.addEventListener('click', async () => {
        if (!selectedPlayer || !selectedPlayerState) {
          showToast('إضافة ممتلكات','يرجى اختيار لاعب أولاً من القائمة.','error');
          return;
        }

        const type = document.getElementById('admin-grant-type').value;
        const itemKey = document.getElementById('admin-grant-item-select').value;
        if (!itemKey) return;

        if (type ==='job') {
          selectedPlayerState.jobId = itemKey;
          selectedPlayerState.title = document.getElementById('admin-grant-job-title').value.trim() || GameEngine.JOBS[itemKey].name;
        } else if (type ==='business') {
          const lvl = parseInt(document.getElementById('admin-grant-biz-level').value) || 0;
          const wrk = parseInt(document.getElementById('admin-grant-biz-workers').value) || 0;
          if (lvl < 0 || wrk < 0) {
            showToast('خطأ إدخال','يرجى إدخال أرقام صحيحة لمستوى المشروع وموظفيه.','error');
            return;
          }
          if (!selectedPlayerState.businesses) selectedPlayerState.businesses = {};
          const bizConfig = GameEngine.BUSINESSES[itemKey];
          const price = (selectedPlayerState.businesses[itemKey] && selectedPlayerState.businesses[itemKey].price) || (bizConfig ? bizConfig.optimumPrice : 10);
          selectedPlayerState.businesses[itemKey] = { level: lvl, workers: wrk, price: price };
        } else if (type ==='asset') {
          const qty = parseInt(document.getElementById('admin-grant-asset-qty').value) || 0;
          if (qty < 0) {
            showToast('خطأ إدخال','العدد يجب أن يكون صفراً أو أكبر.','error');
            return;
          }
          if (!selectedPlayerState.assets) selectedPlayerState.assets = {};
          selectedPlayerState.assets[itemKey] = qty;
        } else if (type ==='stock') {
          const shares = parseInt(document.getElementById('admin-grant-stock-shares').value) || 0;
          const price = parseFloat(document.getElementById('admin-grant-stock-price').value) || 0;
          if (shares < 0 || price < 0) {
            showToast('خطأ إدخال','الأسهم والأسعار يجب أن تكون أرقاماً موجبة.','error');
            return;
          }
          if (!selectedPlayerState.stocks) selectedPlayerState.stocks = {};
          selectedPlayerState.stocks[itemKey] = { shares: shares, avgPrice: price };
        }

        await saveAndSyncPlayerPossessions();
        showToast('إضافة ممتلكات','تم منح الممتلك المحدد لللاعب بنجاح.','success');
      });
    }

    // Download Backup Action
    const downloadBackupBtn = document.getElementById('btn-admin-download-backup');
    if (downloadBackupBtn) {
      downloadBackupBtn.addEventListener('click', () => {
        if (!selectedPlayer || !selectedPlayerState) {
          showToast('تحميل تقرير الحساب','يرجى اختيار لاعب أولاً.','error');
          return;
        }
        try {
          const dataStr ="data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(selectedPlayerState, null, 2));
          const downloadAnchor = document.createElement('a');
          downloadAnchor.setAttribute("href", dataStr);
          downloadAnchor.setAttribute("download",`rasalmal_player_${selectedPlayer}_backup.json`);
          document.body.appendChild(downloadAnchor);
          downloadAnchor.click();
          downloadAnchor.remove();
          showToast('تحميل تقرير الحساب',`تم تحميل ملف بيانات حساب اللاعب ${selectedPlayer} بنجاح.`,'success');
        } catch (err) {
          showToast('خطأ في التحميل', err.message,'error');
        }
      });
    }

    // Filter Buttons
    const filterBtns = document.querySelectorAll('.admin-player-filter-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => {
          b.classList.remove('bg-yellow-500','text-slate-950');
          b.classList.add('bg-slate-800','text-slate-300');
        });
        btn.classList.remove('bg-slate-800','text-slate-300');
        btn.classList.add('bg-yellow-500','text-slate-950');
        activeFilter = btn.getAttribute('data-filter');
        renderPlayersTable();
      });
    });

    // Live search filter input
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        renderPlayersTable();
      });
    }

    // Search Button
    if (searchBtn && searchInput) {
      searchBtn.addEventListener('click', () => {
        const q = searchInput.value.trim();
        if (q) {
          selectPlayerForModeration(q);
        } else {
          showToast('بحث اللاعبين','يرجى إدخال اسم المستخدم للبحث.','warning');
        }
      });
    }

    if (refreshListBtn) {
      refreshListBtn.addEventListener('click', () => {
        loadAdminPlayersDirectory(true, true);
      });
    }

    // Quick Injection Buttons (+100K, +500K, +1M, +10M)
    const quickInjectBtns = document.querySelectorAll('.btn-quick-inject');
    quickInjectBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const addAmount = Number(btn.getAttribute('data-add') || 0);
        const cashInp = document.getElementById('admin-input-cash');
        if (cashInp) {
          const current = Number(cashInp.value || 0);
          cashInp.value = Math.max(0, current + addAmount);
          cashInp.classList.add('glow-gold');
          setTimeout(() => cashInp.classList.remove('glow-gold'), 600);
          
          // Auto-trigger save to make the addition instant in the database
          const updateMoneyBtn = document.getElementById('btn-admin-update-money');
          if (updateMoneyBtn && selectedPlayer && selectedPlayerState) {
            updateMoneyBtn.click();
          }
        }
      });
    });

    // Quick Zero Buttons
    const quickZeroBtns = document.querySelectorAll('.btn-quick-set-zero');
    quickZeroBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetType = btn.getAttribute('data-set-zero');
        if (targetType ==='cash') {
          const c = document.getElementById('admin-input-cash');
          if (c) c.value = 0;
        } else if (targetType ==='bank') {
          const b = document.getElementById('admin-input-bank');
          if (b) b.value = 0;
        }
        
        // Auto-trigger save to make the zeroing instant in the database
        const updateMoneyBtn = document.getElementById('btn-admin-update-money');
        if (updateMoneyBtn && selectedPlayer && selectedPlayerState) {
          updateMoneyBtn.click();
        }
      });
    });

    // Save Balance Action with FULL REAL-TIME SYNC
    const updateMoneyBtn = document.getElementById('btn-admin-update-money');
    if (updateMoneyBtn) {
      updateMoneyBtn.addEventListener('click', async () => {
        if (!selectedPlayer || !selectedPlayerState) {
          showToast('تعديل الرصيد','يرجى اختيار لاعب أولاً من القائمة.','error');
          return;
        }
        const newCash = Number(document.getElementById('admin-input-cash').value);
        const newBank = Number(document.getElementById('admin-input-bank').value);

        if (isNaN(newCash) || isNaN(newBank) || newCash < 0 || newBank < 0) {
          showToast('خطأ مدخلات','يرجى إدخال مبالغ صحيحة وموجبة.','error');
          return;
        }

        try {
          selectedPlayerState.cash = newCash;
          selectedPlayerState.bank = newBank;

          // Accurate NetWorth calculation
          let worth = newCash + newBank;
          if (selectedPlayerState.assets) {
            Object.keys(selectedPlayerState.assets).forEach(k => {
              if (GameEngine.ASSETS && GameEngine.ASSETS[k]) worth += (selectedPlayerState.assets[k] || 0) * GameEngine.ASSETS[k].cost;
            });
          }
          if (selectedPlayerState.stocks) {
            Object.keys(selectedPlayerState.stocks).forEach(sym => {
              const shares = (selectedPlayerState.stocks[sym] && selectedPlayerState.stocks[sym].shares) || 0;
              const history = GameEngine.stockPrices[sym] || [GameEngine.STOCKS[sym]?.basePrice || 10];
              const currentPrice = history[history.length - 1];
              worth += shares * currentPrice;
            });
          }
          if (selectedPlayerState.investments && Array.isArray(selectedPlayerState.investments)) {
            selectedPlayerState.investments.forEach(inv => worth += (inv.investedAmount || 0));
          }
          selectedPlayerState.netWorth = worth;

          // Save to Firestore
          await AppDB.adminSavePlayer(selectedPlayer, selectedPlayerState);

          // CRITICAL: If the edited user is currently logged in, sync GameEngine memory & localStorage immediately!
          if (selectedPlayer === GameEngine.activeUsername) {
            GameEngine.state.cash = newCash;
            GameEngine.state.bank = newBank;
            GameEngine.state.netWorth = worth;
            try {
              localStorage.setItem(`rasalmal_state_${selectedPlayer}`, JSON.stringify(GameEngine.state));
            } catch (e) { }
            renderAll();
          }

          // Update UI Card
          document.getElementById('admin-p-cash').textContent = newCash.toLocaleString();
          document.getElementById('admin-p-bank').textContent = newBank.toLocaleString();
          document.getElementById('admin-p-worth').textContent =`${worth.toLocaleString()} EGP`;

          showToast('تم الحفظ بنجاح',`تم تحديث رصيد اللاعب ${selectedPlayer} بنجاح (كاش: ${newCash.toLocaleString()}، بنك: ${newBank.toLocaleString()}).`,'success');
          logAdminAction(`تعديل رصيد اللاعب ${selectedPlayer} إلى كاش: ${newCash.toLocaleString()} ج.م، بنك: ${newBank.toLocaleString()} ج.م`);

          loadAdminPlayersDirectory(false);
        } catch (err) {
          showToast('فشل تعديل الرصيد', err.message,'error');
        }
      });
    }

    // Business Moderation Event Listeners
    const bizSelect = document.getElementById('admin-input-biz-type');
    if (bizSelect) {
      bizSelect.addEventListener('change', () => {
        if (selectedPlayerState && selectedPlayerState.businesses) {
          const bizKey = bizSelect.value;
          const bizData = selectedPlayerState.businesses[bizKey] || { level: 0, workers: 0 };
          document.getElementById('admin-input-biz-level').value = bizData.level || 0;
          document.getElementById('admin-input-biz-workers').value = bizData.workers || 0;
        }
      });
    }

    const updateBizBtn = document.getElementById('btn-admin-update-biz');
    if (updateBizBtn) {
      updateBizBtn.addEventListener('click', async () => {
        if (!selectedPlayer || !selectedPlayerState) {
          showToast('تعديل الأملاك','يرجى اختيار لاعب أولاً من القائمة.','error');
          return;
        }
        const bizKey = document.getElementById('admin-input-biz-type').value;
        const level = parseInt(document.getElementById('admin-input-biz-level').value) || 0;
        const workers = parseInt(document.getElementById('admin-input-biz-workers').value) || 0;

        if (isNaN(level) || level < 0 || isNaN(workers) || workers < 0) {
          showToast('خطأ مدخلات','يرجى إدخال قيم صحيحة للمستوى والموظفين.','error');
          return;
        }

        if (!selectedPlayerState.businesses) selectedPlayerState.businesses = {};

        const bizConfig = GameEngine.BUSINESSES[bizKey];
        const price = (selectedPlayerState.businesses[bizKey] && selectedPlayerState.businesses[bizKey].price) || (bizConfig ? bizConfig.optimumPrice : 10);

        selectedPlayerState.businesses[bizKey] = {
          level: level,
          workers: workers,
          price: price
        };

        try {
          updateBizBtn.disabled = true;
          updateBizBtn.innerHTML ='جاري الحفظ والتزامن...';

          // Re-calculate Net Worth of selected player state
          let worth = (selectedPlayerState.cash || 0) + (selectedPlayerState.bank || 0) + (selectedPlayerState.dirtyCash || 0);

          if (selectedPlayerState.assets) {
            Object.keys(selectedPlayerState.assets).forEach(k => {
              if (GameEngine.ASSETS && GameEngine.ASSETS[k]) worth += (selectedPlayerState.assets[k] || 0) * GameEngine.ASSETS[k].cost;
            });
          }
          if (selectedPlayerState.stocks) {
            Object.keys(selectedPlayerState.stocks).forEach(sym => {
              const shares = (selectedPlayerState.stocks[sym] && selectedPlayerState.stocks[sym].shares) || 0;
              const history = GameEngine.stockPrices[sym] || [GameEngine.STOCKS[sym]?.basePrice || 10];
              const currentPrice = history[history.length - 1];
              worth += shares * currentPrice;
            });
          }
          if (selectedPlayerState.investments && Array.isArray(selectedPlayerState.investments)) {
            selectedPlayerState.investments.forEach(inv => worth += (inv.investedAmount || 0));
          }
          selectedPlayerState.netWorth = worth;

          await AppDB.adminSavePlayer(selectedPlayer, selectedPlayerState);

          if (selectedPlayer === GameEngine.activeUsername) {
            GameEngine.state.businesses[bizKey] = { level, workers, price };
            GameEngine.state.netWorth = worth;
            try {
              localStorage.setItem(`rasalmal_state_${selectedPlayer}`, JSON.stringify(GameEngine.state));
            } catch (e) { }
            renderAll();
          }

          document.getElementById('admin-p-worth').textContent =`${worth.toLocaleString()} EGP`;
          showToast('تحديث الأملاك',`تم تحديث أملاك اللاعب (${bizConfig ? bizConfig.name : bizKey}) بنجاح إلى مستوى ${level} وعدد موظفين ${workers}.`,'success');
          logAdminAction(`تعديل أملاك اللاعب ${selectedPlayer}: ${bizKey} -> مستوى ${level}، موظفين ${workers}`);
          loadAdminPlayersDirectory(false);
        } catch (err) {
          showToast('خطأ في الحفظ', err.message,'error');
        } finally {
          updateBizBtn.disabled = false;
          updateBizBtn.innerHTML ='<i class="fa-solid fa-building-circle-check"></i> <span>حفظ وتطبيق الأملاك فوراً</span>';
        }
      });
    }

    // Release Jail Action
    const releaseJailBtn = document.getElementById('btn-admin-release-jail');
    if (releaseJailBtn) {
      releaseJailBtn.addEventListener('click', async () => {
        if (!selectedPlayer) return;
        try {
          await AppDB.adminReleaseJail(selectedPlayer);
          if (selectedPlayer === GameEngine.activeUsername) {
            GameEngine.state.jailTimer = 0;
            renderAll();
          }
          showToast('عفو قانوني',`تم الإفراج عن اللاعب ${selectedPlayer} وإلغاء عقوبة السجن.`,'success');
          logAdminAction(`عفو وإفراج قانوني عن اللاعب: ${selectedPlayer}`);
          selectPlayerForModeration(selectedPlayer);
        } catch (err) {
          showToast('خطأ إشرافي', err.message,'error');
        }
      });
    }

    // Jail Player Action (5 mins)
    const jailPlayerBtn = document.getElementById('btn-admin-jail-player');
    if (jailPlayerBtn) {
      jailPlayerBtn.addEventListener('click', async () => {
        if (!selectedPlayer) return;
        try {
          await AppDB.adminSetPlayerJail(selectedPlayer, 300);
          if (selectedPlayer === GameEngine.activeUsername) {
            GameEngine.state.jailTimer = 300;
            renderAll();
          }
          showToast('عقوبة السجن',`تم إيداع اللاعب ${selectedPlayer} في السجن لمدة 5 دقائق.`,'warning');
          logAdminAction(`إيداع اللاعب ${selectedPlayer} في السجن لمدة 300 ثانية`);
          selectPlayerForModeration(selectedPlayer);
        } catch (err) {
          showToast('خطأ إشرافي', err.message,'error');
        }
      });
    }

    // Ban Player Action
    const banBtn = document.getElementById('btn-admin-ban');
    if (banBtn) {
      banBtn.addEventListener('click', async () => {
        if (!selectedPlayer) return;
        if (!confirm(`هل أنت متأكد من حظر حساب اللاعب ${selectedPlayer} نهائياً ومنعه من الدخول؟`)) return;
        try {
          await AppDB.adminBanPlayer(selectedPlayer);
          showToast('حظر الحساب',`تم حظر حساب اللاعب ${selectedPlayer} نهائياً.`,'success');
          logAdminAction(`حظر نهائي لحساب اللاعب: ${selectedPlayer}`);
          selectPlayerForModeration(selectedPlayer);
        } catch (err) {
          showToast('خطأ حظر', err.message,'error');
        }
      });
    }

    // Unban Player Action
    const unbanBtn = document.getElementById('btn-admin-unban');
    if (unbanBtn) {
      unbanBtn.addEventListener('click', async () => {
        if (!selectedPlayer) return;
        try {
          await AppDB.adminUnbanPlayer(selectedPlayer);
          showToast('فك الحظر',`تم رفع الحظر عن حساب اللاعب ${selectedPlayer} بنجاح.`,'success');
          logAdminAction(`رفع الحظر وإعادة تنشيط حساب اللاعب: ${selectedPlayer}`);
          selectPlayerForModeration(selectedPlayer);
        } catch (err) {
          showToast('خطأ فك الحظر', err.message,'error');
        }
      });
    }

    // Change Player PIN
    const changePinBtn = document.getElementById('btn-admin-change-pin');
    if (changePinBtn) {
      changePinBtn.addEventListener('click', async () => {
        if (!selectedPlayer) return;
        const newPin = prompt(`أدخل الرقم السري (PIN) الجديد لحساب ${selectedPlayer}:`);
        if (!newPin || newPin.trim().length < 3) {
          if (newPin !== null) showToast('تغيير PIN','يجب أن يتكون الرقم السري من 3 خانات على الأقل.','error');
          return;
        }
        try {
          await AppDB.adminChangePlayerPin(selectedPlayer, newPin.trim());
          showToast('تغيير PIN',`تم تعيين الرقم السري الجديد للاعب ${selectedPlayer} بنجاح.`,'success');
          logAdminAction(`تغيير الرقم السري لحساب اللاعب: ${selectedPlayer}`);
        } catch (err) {
          showToast('خطأ تغيير PIN', err.message,'error');
        }
      });
    }

    // Toggle / Transfer Admin Role Action
    const toggleAdminRoleBtn = document.getElementById('btn-admin-toggle-role');
    if (toggleAdminRoleBtn) {
      toggleAdminRoleBtn.addEventListener('click', async () => {
        if (!selectedPlayer || !selectedPlayerState) {
          showToast('إدارة الصلاحيات','يرجى اختيار لاعب أولاً من القائمة.','error');
          return;
        }

        const isCurrentlyAdmin = Boolean(selectedPlayerState.isAdmin);
        const targetUser = selectedPlayer;

        let confirmMsg ='';
        if (isCurrentlyAdmin) {
          confirmMsg =`️ تحذير: هل أنت متأكد من سحب صلاحيات الإدارة من اللاعب"${targetUser}" وتحويل حسابه إلى حساب لاعب عادي؟`;
        } else {
          confirmMsg =` تأكيد ترقية مسؤول:\nهل أنت متأكد من منح صلاحيات الإدارة الكاملة (Admin) للاعب"${targetUser}"؟\nسيتمكن هذا الحساب من الدخول للوحة التحكم وإدارة كافة مفاصل اللعبة واللاعبين.`;
        }

        if (!confirm(confirmMsg)) return;

        try {
          toggleAdminRoleBtn.disabled = true;
          toggleAdminRoleBtn.innerHTML ='<i class="fa-solid fa-spinner fa-spin"></i> جاري تحديث الصلاحية...';

          const newAdminStatus = !isCurrentlyAdmin;
          await AppDB.adminSetPlayerAdminStatus(targetUser, newAdminStatus);

          selectedPlayerState.isAdmin = newAdminStatus;
          if (targetUser === GameEngine.activeUsername && GameEngine.state) {
            GameEngine.state.isAdmin = newAdminStatus;
          }

          showToast('صلاحيات الإدارة', newAdminStatus ?`تم تعيين اللاعب ${targetUser} كمسؤول (Admin) بنجاح!` :`تم سحب صلاحيات الإدارة من اللاعب ${targetUser}.`,'success');
          logAdminAction(`${newAdminStatus ?'ترقية وتعيين مسؤول جديد (Admin)' :'سحب صلاحية الإدارة من'}: ${targetUser}`);

          selectPlayerForModeration(targetUser);
          loadAdminPlayersDirectory(false);
        } catch (err) {
          showToast('خطأ تعديل الصلاحية', err.message,'error');
        } finally {
          toggleAdminRoleBtn.disabled = false;
          if (selectedPlayerState) {
            if (selectedPlayerState.isAdmin) {
              toggleAdminRoleBtn.innerHTML ='<i class="fa-solid fa-user-shield text-xs"></i> <span>سحب صلاحية الإدارة (إلغاء أدمن) ️</span>';
              toggleAdminRoleBtn.className ='w-full py-2 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/40 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1.5';
            } else {
              toggleAdminRoleBtn.innerHTML ='<i class="fa-solid fa-crown text-xs"></i> <span>نقل صلاحية الإدارة لهذا الحساب (Make Admin) </span>';
              toggleAdminRoleBtn.className ='w-full py-2 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 rounded-lg text-[11px] font-black transition flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20';
            }
          }
        }
      });
    }

    // RESET SPECIFIC PLAYER ACCOUNT
    const resetPlayerAccountBtn = document.getElementById('btn-admin-reset-player-account');
    if (resetPlayerAccountBtn) {
      resetPlayerAccountBtn.addEventListener('click', async () => {
        if (!selectedPlayer) return;
        const confirmMsg =`تحذير قاطع: هل أنت متأكد من تصفير حساب اللاعب"${selectedPlayer}" بالكامل من كل شيء؟\nسيتم تصفير الكاش والبنك والأموال المشبوهة، ومسح كافة الأصول والشركات والأسهم والاستثمارات والمخزون ونقاط الخبرة والرتبة والملاحقات (تصفير شامل 0 EGP).`;
        if (!confirm(confirmMsg)) return;

        try {
          const freshData = await AppDB.adminResetPlayer(selectedPlayer);

          // If active user is the reset user, sync immediately
          if (selectedPlayer === GameEngine.activeUsername) {
            applyCompleteZeroStateToGameEngine(selectedPlayer);
            renderAll();
          }

          showToast('تصفير الحساب',`تم تصفير حساب اللاعب"${selectedPlayer}" بالكامل من كل شيء بنجاح (0 EGP).`,'success');
          logAdminAction(`تصفير شامل ونهائي لكافة أرصدة وممتلكات حساب اللاعب: ${selectedPlayer}`);
          selectPlayerForModeration(selectedPlayer);
          loadAdminPlayersDirectory(false);
        } catch (err) {
          showToast('خطأ تصفير الحساب', err.message,'error');
        }
      });
    }

    // DELETE SPECIFIC PLAYER ACCOUNT
    const deletePlayerAccountBtn = document.getElementById('btn-admin-delete-player-account');
    if (deletePlayerAccountBtn) {
      deletePlayerAccountBtn.addEventListener('click', async () => {
        if (!selectedPlayer) return;
        if (!confirm(`️ تحذير نهائي: هل أنت متأكد من حذف وثيقة وحساب اللاعب"${selectedPlayer}" نهائياً من الخوادم؟`)) return;

        try {
          await AppDB.adminDeletePlayer(selectedPlayer);
          showToast('حذف الحساب',`تم حذف حساب اللاعب ${selectedPlayer} نهائياً من قاعدة البيانات.`,'success');
          logAdminAction(`حذف نهائي لوثيقة حساب اللاعب: ${selectedPlayer}`);

          if (resultCard) resultCard.classList.add('hidden');
          selectedPlayer = null;
          selectedPlayerState = null;
          loadAdminPlayersDirectory(false);
        } catch (err) {
          showToast('خطأ حذف الحساب', err.message,'error');
        }
      });
    }

    // ─────────────────────────────────────────────
    //  MODULE: LIVE PLAYER ACTIVITY AUDIT LOG
    // ─────────────────────────────────────────────
    const inspectLogsBtn = document.getElementById('btn-admin-inspect-logs');
    const logModal = document.getElementById('admin-player-log-modal');
    const closeLogModalBtn = document.getElementById('btn-admin-close-log-modal');
    const logFeed = document.getElementById('admin-player-log-feed');
    let currentLogFilter ='all';

    function renderPlayerLogFeed(pState) {
      if (!logFeed) return;
      const logs = (pState && pState.activityLog) || [];
      const filtered = logs.filter(l => currentLogFilter ==='all' || l.category === currentLogFilter);

      if (filtered.length === 0) {
        logFeed.innerHTML =`
          <div class="p-6 text-center text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800">
            <i class="fa-solid fa-clipboard-list text-2xl mb-2 text-slate-600 block"></i>
            <span>لا توجد عمليات مسجلة لهذا اللاعب في هذا التصنيف حتى الآن.</span>
          </div>`;
        return;
      }

      logFeed.innerHTML ='';
      filtered.forEach(item => {
        const div = document.createElement('div');
        div.className ='p-2.5 bg-slate-900/70 hover:bg-slate-900 border border-slate-800/80 rounded-xl flex items-center justify-between gap-2 transition';

        let icon ='<i class="fa-solid fa-circle-info text-sky-400"></i>';
        let badgeColor ='bg-sky-500/10 text-sky-400 border-sky-500/20';

        if (item.category ==='business') {
          icon ='<i class="fa-solid fa-briefcase text-emerald-400"></i>';
          badgeColor ='bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
        } else if (item.category ==='stock') {
          icon ='<i class="fa-solid fa-chart-line text-yellow-400"></i>';
          badgeColor ='bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
        } else if (item.category ==='investment') {
          icon ='<i class="fa-solid fa-vault text-amber-400"></i>';
          badgeColor ='bg-amber-500/10 text-amber-400 border-amber-500/20';
        } else if (item.category ==='casino') {
          icon ='<i class="fa-solid fa-dice text-purple-400"></i>';
          badgeColor ='bg-purple-500/10 text-purple-400 border-purple-500/20';
        } else if (item.category ==='blackmarket') {
          icon ='<i class="fa-solid fa-skull-crossbones text-rose-400"></i>';
          badgeColor ='bg-rose-500/10 text-rose-400 border-rose-500/20';
        } else if (item.category ==='banking') {
          icon ='<i class="fa-solid fa-building-columns text-teal-400"></i>';
          badgeColor ='bg-teal-500/10 text-teal-400 border-teal-500/20';
        } else if (item.category ==='store') {
          icon ='<i class="fa-solid fa-bag-shopping text-cyan-400"></i>';
          badgeColor ='bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
        }

        const dateStr = item.timestamp ? new Date(item.timestamp).toLocaleTimeString('ar-EG', { hour:'2-digit', minute:'2-digit', second:'2-digit' }) :'--:--';

        div.innerHTML =`
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-slate-950 flex items-center justify-center text-xs border border-slate-800">
              ${icon}
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="font-bold text-white">${item.action}</span>
                <span class="text-[9px] px-1.5 py-0.2 rounded border ${badgeColor} font-sans">${item.category}</span>
              </div>
              <div class="text-[11px] text-slate-300 mt-0.5">${item.details}</div>
            </div>
          </div>
          <div class="text-[10px] text-slate-400 font-mono text-left shrink-0">
            ${dateStr}
          </div>`;
        logFeed.appendChild(div);
      });
    }

    if (inspectLogsBtn && logModal) {
      inspectLogsBtn.addEventListener('click', async () => {
        if (!selectedPlayer) return;
        try {
          const pState = await AppDB.adminGetPlayer(selectedPlayer);
          selectedPlayerState = pState;
          document.getElementById('adm-log-modal-username').textContent =`@${selectedPlayer}`;
          document.getElementById('adm-log-stat-worth').textContent =`${(pState.netWorth || 0).toLocaleString()} EGP`;
          document.getElementById('adm-log-stat-cash').textContent =`${((pState.cash || 0) + (pState.bank || 0)).toLocaleString()} EGP`;
          document.getElementById('adm-log-stat-heat').textContent =`${pState.heatLevel || 0} / 5`;
          document.getElementById('adm-log-stat-jail').textContent = (pState.jailTimer > 0) ?`مسجون (${pState.jailTimer}ث)` :'حر طليق';

          currentLogFilter ='all';
          renderPlayerLogFeed(pState);
          logModal.classList.remove('hidden');
        } catch (e) {
          showToast('سجل النشاط', e.message,'error');
        }
      });
    }

    // --- Comprehensive Forensic & Security Audit Engine ---
    let lastAuditResult = null;
    let lastAuditTargetUser = null;
    let activeAuditFilter ='all';

    async function performAccountAudit(p, username ='') {
      const findings = [];
      let score = 100;
      const targetUser = (username || p.username ||'').replace(/^@/,'').trim();

      // Official Game Constants (Exact match with game.js)
      const ASSETS_MAP = {
        apartment: { name:'شقة سكنية مؤجرة', cost: 250000, rent: 85 },
        office: { name:'مبنى مكاتب تجارية', cost: 1600000, rent: 520 },
        mansion: { name:'قصر ريفي فاخر', cost: 7200000, rent: 2400 },
        skyline_tower: { name:'برج ناطحة سحاب تجاري', cost: 35000000, rent: 11500 },
        luxury_resort: { name:'منتجع وفندق سياحي 5 نجوم', cost: 160000000, rent: 52000 },
        mega_yacht: { name:'يخت ملكي فاخر خاص', cost: 650000000, rent: 210000 },
        private_island: { name:'جزيرة استوائية خاصة', cost: 2400000000, rent: 750000 },
        orbital_station: { name:'محطة مدارية فضائية خاصة', cost: 9200000000, rent: 3000000 }
      };

      const STOCKS_MAP = {
        COMI: { name:'البنك التجاري الدولي', basePrice: 38, maxShares: 50000 },
        EAST: { name:'الشرقية للدخان', basePrice: 85, maxShares: 30000 },
        ETEL: { name:'المصرية للاتصالات', basePrice: 48, maxShares: 40000 },
        FWRY: { name:'فوري للمدفوعات الإلكترونية', basePrice: 92, maxShares: 25000 },
        CASH: { name:'صندوق الاستثمار التقني البديل', basePrice: 125, maxShares: 20000 },
        BITC: { name:'مؤشر البيتكوين والأصول الرقمية', basePrice: 310, maxShares: 5000 },
        GOLD: { name:'صندوق سبائك الذهب الخالص', basePrice: 220, maxShares: 10000 },
        AIX: { name:'صندوق الذكاء الاصطناعي العالمي', basePrice: 380, maxShares: 8000 }
      };

      const CAR_MAP = {
        lambo: { name:'Lamborghini Aventador ️', cost: 15000000, rentPerSec: 10000 },
        rolls: { name:'Rolls-Royce Phantom', cost: 40000000, rentPerSec: 38000 },
        shelby: { name:'Shelby Cobra 1965', cost: 120000000, rentPerSec: 145000 }
      };

      const JOBS_MAP = {
        worker: { name:'عامل باليومية', xpNeeded: 0, salary: 6 },
        cashier: { name:'محاسب صندوق', xpNeeded: 180, salary: 12 },
        accountant: { name:'محاسب مالي قانوني', xpNeeded: 600, salary: 24 },
        manager: { name:'مدير فرع وتطوير', xpNeeded: 2200, salary: 50 },
        director: { name:'مدير تنفيذي للمجموعة', xpNeeded: 6500, salary: 95 },
        ceo: { name:'رئيس مجلس الإدارة', xpNeeded: 18000, salary: 180 },
        consultant: { name:'مستشار اقتصادي ووزير سابق', xpNeeded: 45000, salary: 320 },
        bank_governor: { name:'محافظ البنك المركزي', xpNeeded: 110000, salary: 550 },
        sovereign_head: { name:'رئيس المجلس الاقتصادي الأعلى', xpNeeded: 250000, salary: 950 },
        minister: { name:'وزير المالية والاقتصاد السيادي ️', xpNeeded: 500000, salary: 1600 }
      };

      const BIZ_MAP = {
        kiosk: { name:'كشك حلوى وجرائد', baseProfitPerSec: 1 },
        coffee: { name:'عربة قهوة مختصة', baseProfitPerSec: 1 },
        tech: { name:'شركة برمجيات', baseProfitPerSec: 1 },
        logistics: { name:'مجمع خدمات لوجستية وشحن', baseProfitPerSec: 1 },
        supermarket: { name:'سلسلة سوبرماركت وتجزئة', baseProfitPerSec: 2 },
        solar_factory: { name:'مصنع ألواح الطاقة الشمسية', baseProfitPerSec: 2 },
        private_hospital: { name:'مستشفى ومجمع طبي تخصصي', baseProfitPerSec: 3 },
        media_studio: { name:'مؤسسة إنتاج إعلامي وسينمائي', baseProfitPerSec: 4 },
        private_bank: { name:'بنك استثماري وشركة وساطة', baseProfitPerSec: 6 },
        oil_refinery: { name:'مجمع مصافي البترول والطاقة', baseProfitPerSec: 8 },
        space_tech: { name:'مؤسسة استكشاف الفضاء', baseProfitPerSec: 12 }
      };

      // 1. LIQUIDITY & RAW BALANCES
      const cash = Number(p.cash || 0);
      const bank = Number(p.bank || 0);
      const dirty = Number(p.dirtyCash || p.dirty_cash || 0);
      const totalLiquid = cash + bank + dirty;
      const recordedWorth = Number(p.netWorth || p.net_worth || 0);
      const xp = Number(p.xp || 0);
      const jobId = p.jobId || p.job_id ||'worker';
      const rep = Number(p.underworldRep || 0);

      // 2. REAL ESTATE ASSETS
      let realEstateVal = 0;
      let totalAssetUnits = 0;
      let realEstateRentPerSec = 0;
      const assets = (typeof p.assets ==='object' && p.assets) ? p.assets : {};
      Object.keys(assets).forEach(k => {
        const count = Number(assets[k] || 0);
        if (count > 0 && ASSETS_MAP[k]) {
          totalAssetUnits += count;
          realEstateVal += count * ASSETS_MAP[k].cost;
          realEstateRentPerSec += count * ASSETS_MAP[k].rent;
        }
      });

      // 3. STOCKS PORTFOLIO
      let stocksVal = 0;
      let totalStocksCount = 0;
      let stockLimitViolations = [];
      const stocks = (typeof p.stocks ==='object' && p.stocks) ? p.stocks : {};
      Object.keys(stocks).forEach(sym => {
        const s = stocks[sym];
        if (s && s.shares > 0) {
          const shares = Number(s.shares || 0);
          totalStocksCount += shares;
          const price = Number(s.avgPrice || s.currentPrice || (STOCKS_MAP[sym]?.basePrice || 100));
          stocksVal += shares * price;
          if (STOCKS_MAP[sym] && shares > STOCKS_MAP[sym].maxShares) {
            stockLimitViolations.push(`${sym}: ${shares.toLocaleString()} سهم (الأقصى: ${STOCKS_MAP[sym].maxShares.toLocaleString()})`);
          }
        }
      });

      // 4. LOCKED INVESTMENTS CAPITAL
      let investmentsVal = 0;
      const investmentsList = Array.isArray(p.investments) ? p.investments : [];
      investmentsList.forEach(inv => {
        investmentsVal += Number(inv.investedAmount || 0);
      });

      // 5. EXACT MATHEMATICAL NET WORTH (OFFICIAL GAME ENGINE FORMULA)
      const calculatedWorth = totalLiquid + realEstateVal + stocksVal + investmentsVal;
      const worthVariance = recordedWorth - calculatedWorth;
      const varianceAbs = Math.abs(worthVariance);
      const variancePct = calculatedWorth > 0 ? ((varianceAbs / calculatedWorth) * 100) : 0;

      // 6. BUSINESSES & OPERATIONAL CASHFLOW
      let totalBizIncomePerSec = 0;
      let totalBizLevels = 0;
      let activeBizCount = 0;
      let franchiseCount = 0;
      const bizData = (typeof p.businesses ==='object' && p.businesses) ? p.businesses : {};
      Object.keys(bizData).forEach(bKey => {
        const b = bizData[bKey];
        if (b && typeof b ==='object' && b.level > 0) {
          activeBizCount++;
          totalBizLevels += Number(b.level || 1);
          if (b.isFranchise) franchiseCount++;
          const baseProf = (BIZ_MAP[bKey]?.baseProfitPerSec || 50);
          const workers = Number(b.workers || 0);
          const franchiseMul = b.isFranchise ? 2.5 : 1.0;
          const estSecProfit = Math.floor(baseProf * b.level * (1 + workers * 0.1) * franchiseMul);
          totalBizIncomePerSec += estSecProfit;
        }
      });

      // 7. CAR FLEET & LUXURY ASSETS
      let totalCarsVal = 0;
      let carsRentPerSec = 0;
      const ownedCars = Array.isArray(p.ownedCars) ? p.ownedCars : [];
      ownedCars.forEach(c => {
        const model = CAR_MAP[c.id];
        if (model) {
          totalCarsVal += model.cost;
          if (c.rentStatus ==='rented') {
            carsRentPerSec += model.rentPerSec;
          }
        }
      });

      // 8. TOTAL COMPREHENSIVE REVENUE PER MINUTE
      const bankInterestPerSec = Math.floor(bank * 0.000005);
      const totalIncomePerSec = totalBizIncomePerSec + carsRentPerSec + realEstateRentPerSec + bankInterestPerSec;
      const totalBizIncomePerMin = Math.floor(totalIncomePerSec * 60);

      // 9. WIRE TRANSFERS HISTORY
      let transfers = [];
      try {
        if (typeof AppDB !=='undefined' && AppDB.getPlayerTransfers && targetUser) {
          transfers = await AppDB.getPlayerTransfers(targetUser, 50);
        }
      } catch (err) {
        console.warn('[Audit Engine] Could not fetch player transfers:', err.message);
      }

      const incomingTransfers = transfers.filter(t => t.recipient === targetUser);
      const outgoingTransfers = transfers.filter(t => t.sender === targetUser);
      const totalReceived = incomingTransfers.reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const totalSent = outgoingTransfers.reduce((sum, t) => sum + Number(t.amount || 0), 0);

      const sendersMap = {};
      incomingTransfers.forEach(t => {
        if (t.sender) sendersMap[t.sender] = (sendersMap[t.sender] || 0) + Number(t.amount || 0);
      });
      const topSenders = Object.entries(sendersMap).sort((a, b) => b[1] - a[1]);
      const topSenderSummary = topSenders.length > 0 ?`${topSenders[0][0]} (+${topSenders[0][1].toLocaleString()} EGP)` :'لا يوجد';

      // ─────────────────────────────────────────────
      //  SECTOR AUDITS & FINDINGS
      // ─────────────────────────────────────────────

      // VECTOR 1: EXACT MATHEMATICAL NET WORTH
      if (variancePct <= 3.0 || varianceAbs <= 15000000) {
        findings.push({
          vector:'wealth',
          type:'success',
          badge:'مطابق تماماً',
          title:'مطابقة صافي الثروة دقيقة وسليمة رياضياً 100%',
          metrics:`المسجل: ${recordedWorth.toLocaleString()} EGP | المحسوب: ${calculatedWorth.toLocaleString()} EGP (نسبة التطابق: ${(100 - Math.min(100, variancePct)).toFixed(2)}%)`,
          desc:`تتطابق ثروة اللاعب المسجلة تماماً مع إجمالي السيولة النقدية (${totalLiquid.toLocaleString()} EGP) + الأصول العقارية (${realEstateVal.toLocaleString()} EGP) + الأسهم (${stocksVal.toLocaleString()} EGP) + الاستثمارات (${investmentsVal.toLocaleString()} EGP).`,
          recommendation:'الحساب سليم بنكياً ومطابق للمعادلة المحاسبية الرسمية للعبة.'
        });
      } else if (variancePct <= 10.0 || varianceAbs <= 100000000) {
        findings.push({
          vector:'wealth',
          type:'warning',
          badge:'تفاوت اعتيادي',
          title:'تفاوت طفيف ناتج عن أرباح التدفق اللحظي أو تقلبات البورصة',
          metrics:`المسجل: ${recordedWorth.toLocaleString()} EGP | المحسوب: ${calculatedWorth.toLocaleString()} EGP | الفارق: ${worthVariance > 0 ?'+' :''}${worthVariance.toLocaleString()} EGP (${variancePct.toFixed(2)}%)`,
          desc:'فارق طبيعي يحدث عند تراكم الأرباح اللحظية قبل لحظات الحفظ السحابي، أو نتيجة تقلبات أسعار الأسهم اللحظية.',
          recommendation:'الحساب سليم، ويمكن عمل معايرة دورية إذا رغبت في المزامنة الدقيقة.'
        });
        score -= 5;
      } else {
        findings.push({
          vector:'wealth',
          type:'danger',
          badge:'فارق ثروة غير مدعوم',
          title:'فارق شاسع بين صافي الثروة والأصول المسجلة',
          metrics:`المسجل: ${recordedWorth.toLocaleString()} EGP | المحسوب: ${calculatedWorth.toLocaleString()} EGP | الفارق غير المغطى: ${worthVariance > 0 ?'+' :''}${worthVariance.toLocaleString()} EGP (${variancePct.toFixed(1)}%)`,
          desc:`يوجد فارق ملحوظ بنسبة ${variancePct.toFixed(1)}% بين الثروة المسجلة في الحساب والأصول والسيولة الفعلية التي يمتلكها.`,
          recommendation:'استخدم زر"إعادة معايرة وضبط صافي الثروة تلقائياً" لمطابقة الثروة مع الموجودات الحقيقية.'
        });
        score -= 25;
      }

      // VECTOR 2: WIRE TRANSFERS & CAPITAL INFLUX
      if (totalReceived > 0 || totalSent > 0) {
        const netTransferFlow = totalReceived - totalSent;
        findings.push({
          vector:'transfers',
          type:'success',
          badge:'موثق بالتحويلات',
          title:'حركة الحوالات والتحويلات البنكية المعتمدة',
          metrics:`استلم: +${totalReceived.toLocaleString()} EGP (${incomingTransfers.length} حوالة) | أرسل: -${totalSent.toLocaleString()} EGP (${outgoingTransfers.length} حوالة) | أبرز الممولين: ${topSenderSummary}`,
          desc:`تم تدقيق السجل المصرفي بنجاح. سيولة وثروة اللاعب مدعومة بحوالات بنكية قانونية من لاعبين آخرين مسجلة في قاعدة بيانات البنك المركزي.`,
          recommendation:'حركة التحويلات المالية نظامية ولا تشوبها شبهات غسيل أموال وهمية.'
        });
      } else {
        findings.push({
          vector:'transfers',
          type:'success',
          badge:'حساب معتمد ذاتياً',
          title:'لا توجد حوالات خارجية واردة أو صادرة',
          metrics:'إجمالي الحوالات: 0 EGP (0 تحويلات مسجلة)',
          desc:'يعتمد اللاعب بالكامل على نموه الذاتي من أرباح مشاريعه وأصوله ولم يستلم أي تمويل خارجي من لاعبين آخرين.',
          recommendation:'الحساب مستقل مالياً ونظيف تماماً.'
        });
      }

      // VECTOR 3: BUSINESSES & OPERATIONAL CASHFLOW
      if (activeBizCount > 0) {
        findings.push({
          vector:'businesses',
          type:'success',
          badge:'إنتاج نشط',
          title:'إمبراطورية مشاريع تجارية نشطة ذات دخل تشغيلي حقيقي',
          metrics:`${activeBizCount} مشاريع نشطة (${totalBizLevels} ترقية) • ${franchiseCount} علامة تجارية مسجلة | الدخل التشغيلي: +${totalBizIncomePerMin.toLocaleString()} EGP/د (+${totalIncomePerSec.toLocaleString()} EGP/ث)`,
          desc:'يمتلك الحساب مصانع وشركات مرخصة تضخ سيولة متدفقة مستمرة تبرر نمو ثروته وتراكم أرصدته البنكية.',
          recommendation:'المشاريع تعمل بانتظام دون أي شذوذ في معدلات الدخل.'
        });
      } else {
        if (totalLiquid > 100000000 && totalReceived < 50000000) {
          findings.push({
            vector:'businesses',
            type:'danger',
            badge:'سيولة غير مبررة',
            title:'تضخم السيولة النقدية مع انعدام المشاريع والحوالات الكافية',
            metrics:`السيولة: ${totalLiquid.toLocaleString()} EGP | المشاريع: 0 | الحوالات المستلمة: ${totalReceived.toLocaleString()} EGP`,
            desc:'يمتلك اللاعب رصيد سيولة ضخم يفوق 100 مليون بدون امتلاك مشاريع إنتاجية ودون تلقي حوالات تغطي هذا الرصيد.',
            recommendation:'التحقق من سجل نشاط اللاعب وفحص مصدر السيولة.'
          });
          score -= 25;
        } else {
          findings.push({
            vector:'businesses',
            type:'warning',
            badge:'حساب مبتدئ',
            title:'حساب بدون مشاريع تجارية خاصة',
            metrics:`عدد المشاريع: 0 | الدخل الذاتي: ${totalIncomePerSec.toLocaleString()} EGP/ث`,
            desc:'اللاعب لا يمتلك أي شركات تجارية بعد، ويعتمد على الوظيفة أو المساعدات البنكية.',
            recommendation:'طبيعي للاعبين في المراحل الأولى من اللعبة.'
          });
        }
      }

      // VECTOR 4: LUXURY FLEET & CARS
      if (ownedCars.length > 0) {
        const rentedCount = ownedCars.filter(c => c.rentStatus ==='rented').length;
        findings.push({
          vector:'cars',
          type:'success',
          badge:'أسطول معتمد',
          title:'أسطول السيارات الفارهة والاستثمار التأجيري',
          metrics:`${ownedCars.length} سيارات فارهة مسجلة بقيمة ${totalCarsVal.toLocaleString()} EGP (${rentedCount} سيارة قيد التأجير) | صافي دخل التأجير: +${carsRentPerSec.toLocaleString()} EGP/ث`,
          desc:'سيارات فاخرة ونادرة مسجلة بملفات الحساب وتساهم في رفع الدخل والأرباح الدورية.',
          recommendation:'حالة أسطول السيارات سليمة تماماً.'
        });
      } else {
        findings.push({
          vector:'cars',
          type:'success',
          badge:'سليم',
          title:'لا يمتلك أسطول سيارات فارهة حالياً',
          metrics:'عدد السيارات المملوكة: 0',
          desc:'اللاعب لم يقم بشراء سيارات فارهة من المعرض حتى الآن.',
          recommendation:'سليم 100%.'
        });
      }

      // VECTOR 5: STOCK MARKET TRADING & PORTFOLIO
      if (stockLimitViolations.length > 0) {
        findings.push({
          vector:'stocks',
          type:'danger',
          badge:'تجاوز حدود الأسهم',
          title:'تجاوز الحد الأقصى القانوني المسموح به لأسهم البورصة',
          metrics: stockLimitViolations.join(' •'),
          desc:'يمتلك اللاعب كميات أسهم تتجاوز السقف المحدد لكل شركة في نظام التداول.',
          recommendation:'استخدم إعادة ضبط الأسهم لإعادة الكمية للحد القانوني.'
        });
        score -= 25;
      } else if (totalStocksCount > 0) {
        findings.push({
          vector:'stocks',
          type:'success',
          badge:'محفظة متزنة',
          title:'محفظة تداول الأسهم متوافقة مع ضوابط البورصة',
          metrics:`إجمالي الأسهم: ${totalStocksCount.toLocaleString()} سهم بقيمة ${stocksVal.toLocaleString()} EGP عبر ${Object.keys(stocks).filter(k => stocks[k].shares > 0).length} شركات`,
          desc:'كافة صفقات الأسهم المحتفظ بها ضمن الأسقف المسموحة وبأسعار البورصة المعتمدة.',
          recommendation:'سجل تداول الأسهم نظامي وخالٍ من التلاعب.'
        });
      } else {
        findings.push({
          vector:'stocks',
          type:'success',
          badge:'سليم',
          title:'لا توجد تداولات أسهم مسجلة حالياً',
          metrics:'محفظة الأسهم فارغة',
          desc:'اللاعب لم يقم بشراء أسهم في سوق البورصة.',
          recommendation:'سليم.'
        });
      }

      // VECTOR 6: CAREER PROGRESSION & XP INTEGRITY
      const jobInfo = JOBS_MAP[jobId] || { name: p.title ||'عامل مبتدئ', xpNeeded: 0 };
      if (xp < (jobInfo.xpNeeded * 0.5) && jobInfo.xpNeeded > 1000) {
        findings.push({
          vector:'career',
          type:'danger',
          badge:'رتبة غير شرعية',
          title:'ترقية وظيفية لا تتناسب مع ساعات ونقاط الخبرة',
          metrics:`الوظيفة الحالية: ${jobInfo.name} | نقاط الخبرة: ${xp.toLocaleString()} XP (المطلوب نظامياً: ${jobInfo.xpNeeded.toLocaleString()} XP)`,
          desc:'تم ترقية الرتبة الوظيفية دون جمع نقاط الخبرة الكافية المطلوبة لهذا المنصب الرفيع.',
          recommendation:'تعديل المسمى والوظيفة بما يتطابق مع نقاط الـ XP المتاحة.'
        });
        score -= 20;
      } else {
        findings.push({
          vector:'career',
          type:'success',
          badge:'سليم ومطابق',
          title:'المسار المهني ونقاط الخبرة متطابقة نظامياً',
          metrics:`المسمى: ${p.title || jobInfo.name} | نقاط الخبرة: ${xp.toLocaleString()} XP (الحد الأدنى المطلوب: ${jobInfo.xpNeeded.toLocaleString()} XP)`,
          desc:'الرتبة الوظيفية وساعات العمل المنجزة تتوافق تماماً مع نظام الترقيات المعتمد.',
          recommendation:'المسار المهني سليم 100%.'
        });
      }

      // VECTOR 7: UNDERWORLD, SMUGGLING & DIRTY CASH
      const fleet = (typeof p.smugglingFleet ==='object' && p.smugglingFleet) ? p.smugglingFleet : {};
      const totalFleet = Number(fleet.ship || 0) + Number(fleet.plane || 0) + Number(fleet.speedboat || 0);
      if (dirty > 50000000 && totalFleet === 0 && rep < 5) {
        findings.push({
          vector:'underworld',
          type:'danger',
          badge:'كاش قذر مجهول',
          title:'تضخم كاش قذر ضخم بدون امتلاك أسطول تهريب',
          metrics:`كاش قذر: ${dirty.toLocaleString()} EGP | أسطول التهريب: 0 مركبات | السمعة: ${rep} Rep`,
          desc:'أموال سوداء غير مبررة تفوق 50 مليون دون امتلاك أدوات تهريب تدعم هذه المبالغ.',
          recommendation:'استخدم زر"تصفير الكاش القذر والـ Heat" لحذف الأموال المشبوهة.'
        });
        score -= 20;
      } else if (dirty > 0 || (p.heatLevel || 0) > 0) {
        findings.push({
          vector:'underworld',
          type:'warning',
          badge:'نشاط تهريب',
          title:'نشاط في السوق السوداء ومستوى ملاحقة أمني',
          metrics:`كاش قذر: ${dirty.toLocaleString()} EGP | أسطول التهريب: ${fleet.ship || 0} سفن، ${fleet.plane || 0} طائرات، ${fleet.speedboat || 0} لنشات | Heat: ${p.heatLevel || 0}/5 | حالة السجن: ${p.jailTimer > 0 ?'مسجون' :'حر طليق'}`,
          desc:'يمارس اللاعب أنشطة تهريب قانونية وفق ميكانيكا اللعبة، وعليه رصيد كاش قذر يتطلب غسيل أموال.',
          recommendation:'متابعة عمليات غسيل الأموال في الكازينو ومكاتب الصرافة.'
        });
        score -= 5;
      } else {
        findings.push({
          vector:'underworld',
          type:'success',
          badge:'نظيف تماماً',
          title:'السجل الجنائي والأموال نظيفة بالكامل 100%',
          metrics:`كاش قذر: 0 EGP | أسطول التهريب: ${totalFleet} مركبات | مستوى Heat: 0/5`,
          desc:'لا توجد أي أموال قذرة معلقة أو سجل ملاحقة شرطية نشط.',
          recommendation:'الحساب نظيف تماماً وخالٍ من المخالفات.'
        });
      }

      // VECTOR 8: BANKING LOANS & CREDIT RISK
      const loanAmt = (typeof p.activeLoan ==='object' && p.activeLoan)
        ? Number(p.activeLoan.amount || p.activeLoan.principal || 0)
        : Number(p.activeLoan || p.bankLoan || 0);
      const debtRatio = calculatedWorth > 0 ? ((loanAmt / calculatedWorth) * 100) : 0;

      if (loanAmt === 0) {
        findings.push({
          vector:'loans',
          type:'success',
          badge:'خالٍ من الديون',
          title:'الجدارة الائتمانية ممتازة والذمة المالية بريئة تماماً',
          metrics:'لا توجد قروض بنكية معلقة أو التزامات سداد قائمة',
          desc:'الحساب لا يعاني من أي مديونيات بنكية أو مخاطر تعثر مالي.',
          recommendation:'الحالة الائتمانية ممتازة.'
        });
      } else if (debtRatio > 70 && loanAmt > 10000000) {
        findings.push({
          vector:'loans',
          type:'warning',
          badge:'مخاطر ائتمانية',
          title:'ارتفاع نسبة المديونية والقروض البنكية المعلقة',
          metrics:`قرض بنكي مستحق: ${loanAmt.toLocaleString()} EGP | نسبة الدين إلى الثروة: ${debtRatio.toFixed(1)}%`,
          desc:'الديون تستهلك نسبة كبيرة من رأس مال اللاعب، مما يعرضه لمخاطر التعثر أو مصادرة الأصول.',
          recommendation:'مطالبة اللاعب بجدولة وسداد القرض البنكي.'
        });
        score -= 10;
      } else {
        findings.push({
          vector:'loans',
          type:'success',
          badge:'قرض منتظم',
          title:'تسهيلات ائتمانية بنكية منتظمة وقابلة للسداد',
          metrics:`قيمة القرض: ${loanAmt.toLocaleString()} EGP | نسبة التغطية: ${(100 - debtRatio).toFixed(1)}% أصول حرة`,
          desc:'القرض البنكي مغطى بأصول وسيولة ممتازة ولا يشكل أي خطورة ائتمانية.',
          recommendation:'سليم.'
        });
      }

      // VECTOR 9: CASINO & BETTING AUDIT
      const casinoStats = (typeof p.casinoStats ==='object' && p.casinoStats) ? p.casinoStats : {};
      const casinoWins = Number(casinoStats.totalWon || 0);
      const casinoBets = Number(casinoStats.totalBets || 0);
      if (casinoWins > 500000000 && casinoBets < 5) {
        findings.push({
          vector:'casino',
          type:'danger',
          badge:'شبهة تلاعب',
          title:'شبهة استغلال ثغرة في الكازينو (Win Streaks Exploit)',
          metrics:`أرباح الكازينو: ${casinoWins.toLocaleString()} EGP عبر ${casinoBets} مراهنة فقط`,
          desc:'معدل أرباح كازينو مستحيل إحصائياً يشير إلى تلاعب بالنتائج المحلية أو ثغرة برمجية.',
          recommendation:'خصم أرباح الكازينو غير المبررة.'
        });
        score -= 20;
      } else {
        findings.push({
          vector:'casino',
          type:'success',
          badge:'سليم',
          title:'إحصائيات الكازينو والمراهنات طبيعية',
          metrics:`إجمالي الرهانات: ${casinoBets} | إجمالي الأرباح: ${casinoWins.toLocaleString()} EGP`,
          desc:'لا توجد أنماط فوز شاذة أو استخدام أدوات تكرار غير مصرح بها.',
          recommendation:'نشاط الكازينو ضمن المعدلات الإحصائية المعتادة.'
        });
      }

      // FINAL SCORE & VERDICT
      score = Math.max(0, Math.min(100, score));
      let status ='آمن وموثوق تماماً';
      let badgeClass ='bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';

      if (score < 40) {
        status ='حساب مخترق / متلاعب به بشدة';
        badgeClass ='bg-rose-500/20 text-rose-400 border border-rose-500/30';
      } else if (score < 70) {
        status ='شبهة اختلال مالي وشذوذ رقمي';
        badgeClass ='bg-orange-500/20 text-orange-400 border border-orange-500/30';
      } else if (score < 90) {
        status ='تحت الملاحظة وتدقيق دوري';
        badgeClass ='bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
      }

      return {
        score,
        status,
        badgeClass,
        recordedWorth,
        calculatedWorth,
        worthVariance,
        totalLiquid,
        totalBizIncomePerMin,
        activeBizCount,
        dirty,
        heat: p.heatLevel || 0,
        findings
      };
    }

    const fraudCheckBtn = document.getElementById('btn-admin-fraud-check');
    const auditModal = document.getElementById('admin-audit-modal');
    const closeAuditBtn = document.getElementById('btn-close-admin-audit');
    const closeAuditFooterBtn = document.getElementById('btn-close-admin-audit-footer');

    if (fraudCheckBtn && auditModal) {
      fraudCheckBtn.addEventListener('click', async () => {
        const targetUser = (selectedPlayer || document.getElementById('admin-p-username')?.textContent ||'').replace(/^@/,'').trim();
        if (!targetUser || targetUser ==='...' || targetUser ==='') {
          showToast('فحص الأمان','يرجى تحديد واختيار لاعب أولاً.','warning');
          return;
        }
        try {
          fraudCheckBtn.disabled = true;
          const pState = await AppDB.adminGetPlayer(targetUser);
          if (!pState) throw new Error("تعذر جلب بيانات اللاعب.");

          const report = await performAccountAudit(pState, targetUser);

          document.getElementById('audit-target-username').textContent =`@${targetUser}`;
          
          const safetyBadge = document.getElementById('audit-safety-badge');
          if (safetyBadge) {
            safetyBadge.textContent =`${report.status} (درجة النزاهة: ${report.score}%)`;
            safetyBadge.className =`px-2.5 py-1 rounded-lg font-bold text-xs ${report.badgeClass}`;
          }

          const reportBody = document.getElementById('audit-report-body');
          if (reportBody) {
            reportBody.innerHTML = report.findings.map(f => {
              let icon ='';
              let color ='text-emerald-400';
              let bg ='bg-emerald-950/20 border-emerald-500/20';
              if (f.type ==='warning') {
                icon ='';
                color ='text-yellow-400';
                bg ='bg-yellow-950/20 border-yellow-500/20';
              } else if (f.type ==='danger') {
                icon ='';
                color ='text-rose-400';
                bg ='bg-rose-950/30 border-rose-500/30';
              }
              return`<div class="p-3 rounded-xl border ${bg} space-y-1.5">
                <div class="flex items-center gap-1.5 font-bold ${color}">
                  <span>${icon}</span>
                  <span>${f.title}</span>
                </div>
                ${f.metrics ?`<div class="text-[10px] font-mono text-cyan-300 font-semibold bg-black/40 px-2 py-1 rounded-md border border-cyan-500/20">${f.metrics}</div>` :''}
                <p class="text-[11px] text-slate-300 leading-relaxed">${f.desc}</p>
                ${f.recommendation ?`<div class="text-[10px] text-amber-300/90 font-medium bg-amber-950/20 px-2 py-0.5 rounded border border-amber-500/20"> التوصية: ${f.recommendation}</div>` :''}
              </div>`;
            }).join('');
          }

          auditModal.classList.remove('hidden');

        } catch (e) {
          showToast('خطأ فحص الأمان', e.message,'error');
        } finally {
          fraudCheckBtn.disabled = false;
        }
      });
    }

    const hideAuditModal = () => {
      if (typeof playCasinoSound ==='function') playCasinoSound('click');
      if (auditModal) auditModal.classList.add('hidden');
    };

    if (closeAuditBtn) closeAuditBtn.addEventListener('click', hideAuditModal);
    if (closeAuditFooterBtn) closeAuditFooterBtn.addEventListener('click', hideAuditModal);

    if (closeLogModalBtn && logModal) {
      closeLogModalBtn.addEventListener('click', () => {
        logModal.classList.add('hidden');
      });
    }

    // Filter pills inside log modal
    const logFilterBtns = document.querySelectorAll('.btn-log-filter');
    logFilterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        logFilterBtns.forEach(b => {
          b.className ='btn-log-filter px-3 py-1 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-lg font-bold transition';
        });
        btn.className ='btn-log-filter px-3 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-lg font-bold transition';
        currentLogFilter = btn.getAttribute('data-log-filter') ||'all';
        if (selectedPlayerState) renderPlayerLogFeed(selectedPlayerState);
      });
    });

    // ─────────────────────────────────────────────
    //  MODULE: MARKET CONTROL & DIRECT PRICING
    // ─────────────────────────────────────────────
    function renderAdminStockPrices() {
      const symbols = ['COMI','EAST','ETEL','FWRY','CASH','BITC','GOLD','AIX'];
      symbols.forEach(sym => {
        const priceEl = document.getElementById(`adm-stock-price-${sym}`);
        if (priceEl && GameEngine.stockPrices[sym]) {
          const p = GameEngine.stockPrices[sym][GameEngine.stockPrices[sym].length - 1];
          priceEl.textContent =`${p.toLocaleString()} EGP`;
        }
      });
    }

    // Custom Stock Market Event Broadcast & Impact Controller
    const broadcastCustomEventBtn = document.getElementById('btn-admin-broadcast-custom-event');
    if (broadcastCustomEventBtn) {
      broadcastCustomEventBtn.addEventListener('click', () => {
        const titleInput = document.getElementById('adm-custom-news-title');
        const symbolSelect = document.getElementById('adm-custom-stock-select');
        const directionSelect = document.getElementById('adm-custom-stock-direction');
        const pctInput = document.getElementById('adm-custom-stock-pct');

        let rawTitle = (titleInput ? titleInput.value.trim() :'');
        const targetSymbol = symbolSelect ? symbolSelect.value :'ALL';
        const direction = directionSelect ? directionSelect.value :'up';
        const pctVal = pctInput ? Math.max(1, Math.min(500, parseFloat(pctInput.value) || 25)) : 25;
        const multiplier = direction ==='up' ? (1 + pctVal / 100) : Math.max(0.05, 1 - pctVal / 100);
        const isUp = direction ==='up';

        // Auto-generate title if empty
        if (!rawTitle) {
          if (targetSymbol ==='ALL') {
            rawTitle = isUp
              ?`انتعاش عام وموجة صعود قياسية لكافة الأسهم (+${pctVal}%)`
              :`تصحيح هبوطي وموجة بيع وضغط على كافة الأسهم (-${pctVal}%)`;
          } else {
            const stockName = GameEngine.STOCKS[targetSymbol]?.name || targetSymbol;
            rawTitle = isUp
              ?`أرباح قياسية وإقبال استثماري يرفع سهم ${stockName} (+${pctVal}%)`
              :`ضغوط بيعية وتراجع في أداء سهم ${stockName} (-${pctVal}%)`;
          }
        }
        const icon = isUp ?'' :'';
        const formattedTicker =`${icon} عاجل من البورصة: ${rawTitle}`;

        const targets = {};
        if (targetSymbol ==='ALL') {
          Object.keys(GameEngine.STOCKS).forEach(s => targets[s] = multiplier);
        } else {
          targets[targetSymbol] = multiplier;
        }

        if (AppDB.isFirebaseReady) {
          try {
            firebase.firestore().collection('globals').doc('market_event').set({
              title: formattedTicker,
              desc: rawTitle,
              targets: targets,
              timestamp: Date.now()
            }).then(() => {
              logAdminAction(`إطلاق خبر بورصة مخصص:"${rawTitle}" [${targetSymbol} | ${isUp ?'+' :'-'}${pctVal}%]`);
            }).catch(() => { });
          } catch (e) { }
        } else {
          showToast('إطلاق الخبر','يجب الاتصال بقاعدة البيانات لنشر أحداث البورصة.','error');
        }
      });
    }

    // Market Preset Select Dropdown Auto-filler
    const marketPresetSelect = document.getElementById('adm-market-preset-select');
    if (marketPresetSelect) {
      marketPresetSelect.addEventListener('change', () => {
        const val = marketPresetSelect.value;
        if (!val) return;
        const titleInput = document.getElementById('adm-custom-news-title');
        const symbolSelect = document.getElementById('adm-custom-stock-select');
        const directionSelect = document.getElementById('adm-custom-stock-direction');
        const pctInput = document.getElementById('adm-custom-stock-pct');

        const presetTemplates = {
          crypto_frenzy: {
            title:'صناديق استثمارية سيادية تبدأ الشراء المباشر للبيتكوين!',
            symbol:'BITC',
            dir:'up',
            pct: 50
          },
          gold_rally: {
            title:'إقبال استثماري عالمي للتحوط بسبائك الذهب عيار 24!',
            symbol:'GOLD',
            dir:'up',
            pct: 35
          },
          tech_boom: {
            title:'إطلاق نموذج ذكاء اصطناعي خارق يحقق أرباحاً قياسية لشركات التقنية!',
            symbol:'AIX',
            dir:'up',
            pct: 35
          },
          cbe_rate_hike: {
            title:'البنك المركزي يرفع الفائدة 200 نقطة لدعم القطاع المصرفي!',
            symbol:'COMI',
            dir:'up',
            pct: 30
          },
          telecom_expansion: {
            title:'المصرية للاتصالات تفوز بعقد حصري لتمرير كابلات البيانات البحرية ورخصة 5G!',
            symbol:'ETEL',
            dir:'up',
            pct: 35
          },
          tobacco_monopoly: {
            title:'توقيع عقد تصدير احتكاري ضخم لمنتجات الشرقية للدخان بالشرق الأوسط!',
            symbol:'EAST',
            dir:'up',
            pct: 40
          },
          rate_cut_rally: {
            title:'البنك المركزي يخفض الفائدة لدعم حركة التجارة وصعود كافة الأسهم!',
            symbol:'ALL',
            dir:'up',
            pct: 25
          },
          crypto_crash: {
            title:'حظر تداول العملات المشفرة في بعض البنوك المركزية يضغط على البيتكوين!',
            symbol:'BITC',
            dir:'down',
            pct: 35
          },
          tech_hack_scandal: {
            title:'تسريب وتوقف خدمات الدفع الإلكتروني يتسبب بموجة بيع على سهم فوري!',
            symbol:'FWRY',
            dir:'down',
            pct: 30
          },
          oil_scandal: {
            title:'تأخر شحنات المواد الخام يؤدي لضغوط بيعية على سهم الشرقية للدخان!',
            symbol:'EAST',
            dir:'down',
            pct: 25
          },
          market_crash: {
            title:'موجة بيع جني أرباح مكثفة تهبط بأسهم البورصة وتصحيح هبوطي عام!',
            symbol:'ALL',
            dir:'down',
            pct: 20
          }
        };

        const tpl = presetTemplates[val];
        if (tpl) {
          if (titleInput) titleInput.value = tpl.title;
          if (symbolSelect) symbolSelect.value = tpl.symbol;
          if (directionSelect) directionSelect.value = tpl.dir;
          if (pctInput) pctInput.value = tpl.pct;
          showToast('نموذج جاهز',`تم اختيار نموذج"${tpl.title.substring(0, 28)}..." وتعبئة الحقول.`,'info');
        }
      });
    }

    // Apply Direct Stock Price Buttons
    const applyStockPriceBtns = document.querySelectorAll('.btn-admin-apply-stock-price');
    applyStockPriceBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const sym = btn.getAttribute('data-symbol');
        const inp = document.getElementById(`adm-input-stock-${sym}`);
        if (!sym || !inp) return;
        const newPrice = Number(inp.value);
        if (isNaN(newPrice) || newPrice <= 0) {
          showToast('تعديل السهم','يرجى إدخال سعر صحيح أكبر من صفر.','error');
          return;
        }

        if (AppDB.isFirebaseReady) {
          firebase.firestore().collection('globals').doc('market_event').set({
            title:`تدخل إداري مباشر: تم تعديل سعر سهم (${sym}) إلى ${newPrice.toLocaleString()} ج.م`,
            desc:`تم تعديل سعر سهم (${sym}) إلى ${newPrice.toLocaleString()} ج.م`,
            targetSymbol: sym,
            directPrice: newPrice,
            timestamp: Date.now()
          }).then(() => {
            inp.value ='';
            logAdminAction(`تعديل مباشر لسعر سهم ${sym} -> ${newPrice.toLocaleString()} EGP`);
          }).catch(err => showToast('خطأ في الاتصال', err.message,'error'));
        } else {
          showToast('تعديل السعر','يجب الاتصال بقاعدة البيانات لتعديل أسعار الأسهم.','error');
        }
      });
    });

    // Reset Market to Baseline
    const resetMarketBaselineBtn = document.getElementById('btn-admin-reset-market-baseline');
    if (resetMarketBaselineBtn) {
      resetMarketBaselineBtn.addEventListener('click', () => {
        if (AppDB.isFirebaseReady) {
          firebase.firestore().collection('globals').doc('market_event').set({
            title:'إعادة ضبط البورصة',
            desc:'تم إعادة أسعار جميع الأسهم إلى القيمة الأساسية.',
            resetBaseline: true,
            timestamp: Date.now()
          }).then(() => {
            logAdminAction('إعادة ضبط أسعار كافة الأسهم في البورصة للقيمة الأساسية');
          }).catch(err => showToast('خطأ في الاتصال', err.message,'error'));
        } else {
          showToast('إعادة ضبط البورصة','يجب الاتصال بقاعدة البيانات لإعادة ضبط البورصة.','error');
        }
      });
    }

    // Market Sudden Event Triggers
    const eventBtns = document.querySelectorAll('.btn-admin-trigger-event');
    eventBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const evType = btn.getAttribute('data-event');
        const eventsMap = {
          tech_boom: {
            title:' طفرة تقنية وانتعاش الذكاء الاصطناعي',
            desc:'ارتفعت أرباح قطاع التكنولوجيا وأسهم AIX و FWRY و CASH نتيجة استثمارات قياسية!',
            targetStocks: ['AIX','FWRY','CASH'],
            multiplier: 1.35,
            toastType:'success'
          },
          crypto_frenzy: {
            title:' صعود تاريخي وانفجار سعر البيتكوين',
            desc:'صناديق استثمارية سيادية عملاقة تبدأ في الشراء المباشر للبيتكوين (+50%)!',
            targetStocks: ['BITC'],
            multiplier: 1.50,
            toastType:'success'
          },
          gold_rally: {
            title:' إقبال قياسي وطفرة في أسعار الذهب',
            desc:'توترات اقتصادية عالمية تدفع المستثمرين للتحوط بسبائك الذهب 24k (+35%)!',
            targetStocks: ['GOLD'],
            multiplier: 1.35,
            toastType:'success'
          },
          cbe_rate_hike: {
            title:'️ قرار المركزي: رفع الفائدة 200 نقطة',
            desc:'البنك المركزي يرفع الفائدة! ارتفاع قوي لسهم CIB وانتكاسة خفيفة باقي الأسهم.',
            targetStocks: ['COMI'],
            multiplier: 1.30,
            negativeTargets: ['EAST','FWRY'],
            negativeMultiplier: 0.88,
            toastType:'warning'
          },
          telecom_expansion: {
            title:' رخصة 5G للمصرية للاتصالات',
            desc:'حصول المصرية للاتصالات على رخصة الجيل الخامس وتوسعة الكابلات البحرية (+35%)!',
            targetStocks: ['ETEL'],
            multiplier: 1.35,
            toastType:'success'
          },
          tobacco_monopoly: {
            title:' اتفاقية احتكار وتصدير للشرقية للدخان',
            desc:'توقع عقد احتكاري ضخم لتصدير المنتجات للشرق الأوسط يطير بالسهم فوق 40%!',
            targetStocks: ['EAST'],
            multiplier: 1.40,
            toastType:'success'
          },
          crypto_crash: {
            title:' ضغوط تنظيمية وهبوط حاد للبيتكوين',
            desc:'حظر تداول العملات المشفرة في بعض البنوك المركزية يضغط على البيتكوين (-35%)!',
            targetStocks: ['BITC'],
            multiplier: 0.65,
            toastType:'error'
          },
          tech_hack_scandal: {
            title:'️ ثغرة وأزمة حماية لشركة فوري',
            desc:'تسريب وتوقف خدمات الدفع الإلكتروني يتسبب بموجة بيع مكثفة ومخاوف استثمارية!',
            targetStocks: ['FWRY'],
            multiplier: 0.70,
            toastType:'error'
          },
          rate_cut_rally: {
            title:' خفض الفائدة وانتعاش حركة الاستثمار',
            desc:'البنك المركزي يخفض الفائدة لدعم حركة التجارة والإنتاج! صعود متزامن لكل الأسهم (+25%).',
            targetStocks: ['COMI','FWRY','CASH','EAST','ETEL','BITC','GOLD','AIX'],
            multiplier: 1.25,
            toastType:'success'
          },
          oil_scandal: {
            title:' أزمة سلاسل الإمداد والشحن',
            desc:'تأخر شحنات التبغ والمواد الخام يؤدي لربكة ومبيعات مكثفة على سهم الشرقية للدخان!',
            targetStocks: ['EAST'],
            multiplier: 0.75,
            toastType:'error'
          },
          market_crash: {
            title:' ذعر اقتصادي وتصحيح هابط للبورصة',
            desc:'موجة بيع جني أرباح مكثفة تهبط بجميع أسهم البورصة وتصحيح هبوطي عام (-20%)!',
            targetStocks: ['COMI','FWRY','CASH','EAST','ETEL','BITC','GOLD','AIX'],
            multiplier: 0.80,
            toastType:'error'
          }
        };
        const ev = eventsMap[evType];
        if (!ev) return;

        const targets = {};
        ev.targetStocks.forEach(sym => {
          targets[sym] = ev.multiplier;
        });
        if (ev.negativeTargets) {
          ev.negativeTargets.forEach(sym => {
            targets[sym] = ev.negativeMultiplier;
          });
        }

        if (AppDB.isFirebaseReady) {
          firebase.firestore().collection('globals').doc('market_event').set({
            title: ev.title,
            desc: ev.desc,
            targets: targets,
            timestamp: Date.now()
          }).then(() => {
            logAdminAction(`افتعال حدث اقتصادي: ${ev.title}`);
          }).catch(err => showToast('خطأ في الاتصال', err.message,'error'));
        } else {
          showToast('افتعال الحدث','يجب الاتصال بقاعدة البيانات لفرض الأحداث.','error');
        }
      });
    });

    // ─────────────────────────────────────────────
    //  MODULE: BROADCAST & AIRDROP
    // ─────────────────────────────────────────────
    const broadcastPresets = document.querySelectorAll('.btn-broadcast-preset');
    broadcastPresets.forEach(btn => {
      btn.addEventListener('click', () => {
        const msg = btn.getAttribute('data-msg');
        const tx = document.getElementById('admin-broadcast-msg');
        if (tx && msg) tx.value = msg;
      });
    });

    const sendBroadcastBtn = document.getElementById('btn-admin-send-broadcast');
    if (sendBroadcastBtn) {
      sendBroadcastBtn.addEventListener('click', async () => {
        const msg = document.getElementById('admin-broadcast-msg').value.trim();
        if (!msg) {
          showToast('بث الإدارة','يرجى كتابة نص الرسالة أولاً.','error');
          return;
        }
        try {
          await AppDB.sendBroadcast(msg);
          showToast('نجاح البث','تم إرسال البث لجميع المشتركين بنجاح.','success');
          document.getElementById('admin-broadcast-msg').value ='';
          logAdminAction(`إرسال إشعار عام:"${msg}"`);
        } catch (err) {
          showToast('فشل البث', err.message,'error');
        }
      });
    }

    const airdropPresets = document.querySelectorAll('.btn-airdrop-preset');
    airdropPresets.forEach(btn => {
      btn.addEventListener('click', () => {
        const amt = btn.getAttribute('data-airdrop');
        const inp = document.getElementById('admin-airdrop-amount');
        if (inp && amt) inp.value = amt;
      });
    });

    const sendAirdropBtn = document.getElementById('btn-admin-send-airdrop');
    if (sendAirdropBtn) {
      sendAirdropBtn.addEventListener('click', async () => {
        const amount = Number(document.getElementById('admin-airdrop-amount').value);
        const target = (document.getElementById('admin-airdrop-target')?.value ||'ALL').trim();

        if (isNaN(amount) || amount <= 0) {
          showToast('مكافأة الإدارة','يرجى إدخال مبلغ صحيح أكبر من صفر.','error');
          return;
        }
        try {
          await AppDB.sendAirdrop(amount, target);
          showToast('نجاح التوزيع',`تم توزيع المكافأة (+${amount.toLocaleString()} EGP) للمستهدفين (${target}) بنجاح.`,'success');
          document.getElementById('admin-airdrop-amount').value ='';
          logAdminAction(`توزيع مكافأة مالية: +${amount.toLocaleString()} EGP -> ${target}`);
        } catch (err) {
          showToast('فشل التوزيع', err.message,'error');
        }
      });
    }

    // ─────────────────────────────────────────────
    //  MODULE: SYSTEM & DANGER ZONE
    // ─────────────────────────────────────────────
    const maintToggleBtn = document.getElementById('btn-admin-toggle-maintenance');
    if (maintToggleBtn && !maintToggleBtn.dataset.bound) {
      maintToggleBtn.dataset.bound ='true';
      AppDB.getMaintenanceStatus().then(st => {
        updateMaintenanceUIState(st && st.enabled);
      });

      maintToggleBtn.addEventListener('click', async () => {
        const currentSt = await AppDB.getMaintenanceStatus();
        const nextState = !Boolean(currentSt && currentSt.enabled);

        const confirmMsg = nextState
          ?"هل أنت متأكد من رغبتك في إغلاق اللعبة وتفعيل وضع الصيانة لجميع اللاعبين؟"
          :"هل تريد إنهاء وضع الصيانة وإتاحة اللعبة للجميع مجدداً؟";

        if (!confirm(confirmMsg)) return;

        try {
          await AppDB.setMaintenanceMode(nextState);
          updateMaintenanceUIState(nextState);
          if (nextState) {
            showToast('وضع الصيانة نشط','تم إغلاق الخوادم وتفعيل وضع الصيانة.','warning');
            logAdminAction('تفعيل وضع الصيانة الشامل وإغلاق الخوادم');
          } else {
            showToast('إنهاء الصيانة','تم إنهاء وضع الصيانة وفتح الخوادم للجميع.','success');
            logAdminAction('إلغاء وضع الصيانة وإعادة فتح الخوادم');
          }
        } catch (err) {
          showToast('فشل وضع الصيانة', err.message,'error');
        }
      });
    }

    // RESET ALL PLAYERS' ECONOMY
    const resetAllEconomyBtn = document.getElementById('btn-admin-reset-all-economy');
    if (resetAllEconomyBtn) {
      resetAllEconomyBtn.addEventListener('click', async () => {
        const confirmMsg ="️ تحذير خطير: هل أنت متأكد من تصفير أرصدة وممتلكات المنظومة لكافة اللاعبين المسجلين؟\nسيتم تصفير كاش وبنك وأصول وأسهم وشركات ومخزون كافة الحسابات بالكامل مع الإبقاء على الحسابات وأرقامها السرية.";
        if (!confirm(confirmMsg)) return;

        try {
          const count = await AppDB.adminResetAllPlayers();

          if (GameEngine.activeUsername) {
            applyCompleteZeroStateToGameEngine(GameEngine.activeUsername);
            renderAll();
          }

          showToast('تصفير أرصدة المنظومة',`تم تصفير حسابات وأرصدة ${count} لاعب في المنظومة بالكامل بنجاح.`,'success');
          logAdminAction(`تصفير شامل لأرصدة المنظومة — تم تصفير ${count} حساب لاعب بالكامل`);
          loadAdminPlayersDirectory(false);
          renderAdminAnalyticsDashboard();
        } catch (err) {
          showToast('خطأ تصفير المنظومة', err.message,'error');
        }
      });
    }

    // WIPE ALL PLAYERS DATA (FULL DATABASE WIPE)
    const wipeLeaderboardBtn = document.getElementById('btn-admin-wipe-leaderboard');
    if (wipeLeaderboardBtn) {
      wipeLeaderboardBtn.addEventListener('click', async () => {
        const confirmMsg ="️ تحذير نهائي وقاطع: هل أنت متأكد من حذف كافة حسابات اللاعبين نهائياً من قاعدة البيانات عدا حساب الأدمن الرئيسي؟\nهذا الإجراء لا يمكن التراجع عنه!";
        if (!confirm(confirmMsg)) return;

        try {
          const count = await AppDB.adminWipeLeaderboard();
          showToast('مسح الحسابات',`تم حذف ${count} حساب لاعب نهائياً ومسح قائمة المتصدرين.`,'success');
          logAdminAction(`مسح وتطهير شامل لقاعدة البيانات — تم حذف ${count} حساب`);
          loadAdminPlayersDirectory(false);
          renderAll();
        } catch (err) {
          showToast('خطأ مسح الحسابات', err.message,'error');
        }
      });
    }

    // REBUILD CENTRALIZED LEADERBOARD (UNIFY TOP 25 WORLDWIDE)
    const rebuildLeaderboardBtn = document.getElementById('btn-admin-rebuild-leaderboard');
    if (rebuildLeaderboardBtn) {
      rebuildLeaderboardBtn.addEventListener('click', async () => {
        try {
          rebuildLeaderboardBtn.disabled = true;
          rebuildLeaderboardBtn.innerHTML ='<i class="fa-solid fa-spinner fa-spin"></i> جاري الفرز والمزامنة...';
          const topList = await AppDB.adminRebuildLeaderboard();
          showToast('توحيد المتصدرين',`تم فرز وتوحيد ليدربورد الأثرياء بنجاح (${topList.length} لاعب في القمة). سيظهر نفس الترتيب لجميع اللاعبين فوراً!`,'success');
          logAdminAction(`إعادة فرز وتوحيد ليدربورد المتصدرين سحابياً (${topList.length} لاعب)`);
        } catch (err) {
          showToast('خطأ المزامنة', err.message,'error');
        } finally {
          rebuildLeaderboardBtn.disabled = false;
          rebuildLeaderboardBtn.innerHTML ='<i class="fa-solid fa-crown"></i> <span>فرز وتوحيد عرش الأثرياء الآن</span>';
        }
      });
    }

    // Clear Wire Transfers logs
    const clearTransfersBtn = document.getElementById('btn-admin-clear-transfers-log');
    if (clearTransfersBtn) {
      clearTransfersBtn.addEventListener('click', async () => {
        if (!confirm("هل تريد تفريغ سجل التحويلات المالية القديمة لتنظيف قاعدة البيانات؟")) return;
        try {
          const count = await AppDB.adminClearTransfers();
          showToast('تفريغ السجل',`تم مسح ${count} حركة تحويل مالي من السجل.`,'success');
          logAdminAction(`تفريغ وتنظيف سجل التحويلات المالية (${count} عملية)`);
          renderAdminTransfersMonitor();
        } catch (err) {
          showToast('خطأ تفريغ السجل', err.message,'error');
        }
      });
    }

    // Refresh Transfers Audit Button
    const refreshTransfersBtn = document.getElementById('btn-admin-refresh-transfers');
    if (refreshTransfersBtn) {
      refreshTransfersBtn.addEventListener('click', () => {
        renderAdminTransfersMonitor();
        showToast('تحديث التحويلات','تم جلب أحدث سجلات التحويلات المالية.','success');
      });
    }

    // Refresh Stats Button
    const refreshStatsBtn = document.getElementById('btn-admin-refresh-stats');
    if (refreshStatsBtn) {
      refreshStatsBtn.addEventListener('click', () => {
        renderAdminAnalyticsDashboard();
        showToast('تحديث الإحصائيات','تم تحديث لوحة الإحصائيات الحية بنجاح.','success');
      });
    }

    // Tax Policy Settings (Admin) - Synchronized across Stats and Market Tabs
    function getTaxInputs() {
      const mul = document.getElementById('adm-tax-multiplier-mkt') || document.getElementById('adm-tax-multiplier');
      const sil = document.getElementById('adm-tax-silver-mkt') || document.getElementById('adm-tax-silver');
      const maj = document.getElementById('adm-tax-major-mkt') || document.getElementById('adm-tax-major');
      const wha = document.getElementById('adm-tax-whale-mkt') || document.getElementById('adm-tax-whale');
      return {
        rateMultiplier: mul ? Number(mul.value) : 1.0,
        silverRate: sil ? Number(sil.value) : 0.000003,
        majorRate: maj ? Number(maj.value) : 0.000006,
        whaleRate: wha ? Number(wha.value) : 0.000010
      };
    }

    function syncTaxInputs(cfg) {
      if (!cfg) return;
      ['adm-tax-multiplier','adm-tax-multiplier-mkt'].forEach(id => {
        const el = document.getElementById(id);
        if (el && document.activeElement !== el) el.value = cfg.rateMultiplier;
      });
      ['adm-tax-silver','adm-tax-silver-mkt'].forEach(id => {
        const el = document.getElementById(id);
        if (el && document.activeElement !== el) el.value = cfg.silverRate;
      });
      ['adm-tax-major','adm-tax-major-mkt'].forEach(id => {
        const el = document.getElementById(id);
        if (el && document.activeElement !== el) el.value = cfg.majorRate;
      });
      ['adm-tax-whale','adm-tax-whale-mkt'].forEach(id => {
        const el = document.getElementById(id);
        if (el && document.activeElement !== el) el.value = cfg.whaleRate;
      });
    }
    window._adminSyncTaxInputs = syncTaxInputs;

    async function handleSaveTaxPolicy(btnEl, isMarketTab = false) {
      let rateMultiplier, silverRate, majorRate, whaleRate;
      if (isMarketTab) {
        rateMultiplier = Number(document.getElementById('adm-tax-multiplier-mkt').value);
        silverRate = Number(document.getElementById('adm-tax-silver-mkt').value);
        majorRate = Number(document.getElementById('adm-tax-major-mkt').value);
        whaleRate = Number(document.getElementById('adm-tax-whale-mkt').value);
      } else {
        rateMultiplier = Number(document.getElementById('adm-tax-multiplier').value);
        silverRate = Number(document.getElementById('adm-tax-silver').value);
        majorRate = Number(document.getElementById('adm-tax-major').value);
        whaleRate = Number(document.getElementById('adm-tax-whale').value);
      }

      if (isNaN(rateMultiplier) || rateMultiplier <= 0 || isNaN(silverRate) || silverRate < 0 || isNaN(majorRate) || majorRate < 0 || isNaN(whaleRate) || whaleRate < 0) {
        showToast('خطأ إدخال','يرجى التأكد من إدخال قيم صحيحة للضرائب وموجبة.','error');
        return;
      }

      try {
        if (btnEl) {
          btnEl.disabled = true;
          btnEl.textContent ='جاري الحفظ والتعميم...';
        }

        const cfg = { rateMultiplier, silverRate, majorRate, whaleRate };
        await AppDB.adminSaveTaxConfig(cfg);
        syncTaxInputs(cfg);

        showToast('تم الحفظ','تم تحديث ونشر السياسة الضريبية الجديدة لجميع اللاعبين بنجاح.','success');
        logAdminAction(`تعديل الضرائب: مضاعف ${rateMultiplier}x | فضية ${silverRate} | كبار ${majorRate} | حيتان ${whaleRate}`);
      } catch (err) {
        showToast('فشل حفظ الضرائب', err.message,'error');
      } finally {
        if (btnEl) {
          btnEl.disabled = false;
          btnEl.innerHTML ='<i class="fa-solid fa-floppy-disk"></i> <span>تحديث السياسة الضريبية فوراً</span>';
        }
      }
    }

    const saveTaxPolicyBtn = document.getElementById('btn-admin-save-tax-policy');
    if (saveTaxPolicyBtn) {
      saveTaxPolicyBtn.addEventListener('click', () => handleSaveTaxPolicy(saveTaxPolicyBtn, false));
    }
    const saveTaxPolicyBtnMkt = document.getElementById('btn-admin-save-tax-policy-mkt');
    if (saveTaxPolicyBtnMkt) {
      saveTaxPolicyBtnMkt.addEventListener('click', () => handleSaveTaxPolicy(saveTaxPolicyBtnMkt, true));
    }

    // Store Items Configuration Event Listeners (Admin)
    const itemSelect = document.getElementById('admin-item-config-select');
    if (itemSelect) {
      itemSelect.addEventListener('change', () => {
        const itemId = itemSelect.value;
        const item = GameEngine.STORE_ITEMS[itemId];
        if (item) {
          document.getElementById('admin-item-config-cost').value = item.cost;
          document.getElementById('admin-item-config-duration').value = item.durationTicks * 3;
        }
      });
    }

    const saveItemConfigBtn = document.getElementById('btn-admin-save-item-config');
    if (saveItemConfigBtn) {
      saveItemConfigBtn.addEventListener('click', async () => {
        const itemId = document.getElementById('admin-item-config-select').value;
        const cost = Number(document.getElementById('admin-item-config-cost').value);
        const durationSec = Number(document.getElementById('admin-item-config-duration').value);

        if (isNaN(cost) || cost <= 0 || isNaN(durationSec) || durationSec <= 0) {
          showToast('خطأ إعدادات','يرجى إدخال قيم صحيحة وموجبة للسعر والمدة.','error');
          return;
        }

        try {
          saveItemConfigBtn.disabled = true;
          saveItemConfigBtn.textContent ='جاري حفظ التعديلات...';

          await AppDB.adminSaveItemConfig(itemId, cost, durationSec);

          await GameEngine.syncItemsConfig();

          showToast('تحديث الإعدادات',`تم حفظ وتعميم إعدادات الأداة بنجاح! السعر: ${cost.toLocaleString()} ج.م، المدة: ${durationSec} ثانية.`,'success');
          logAdminAction(`تحديث إعدادات الأداة (${itemId}): سعر ${cost.toLocaleString()} ج.م، مدة ${durationSec}ث`);
          renderAll();
        } catch (err) {
          showToast('فشل حفظ الإعدادات', err.message,'error');
        } finally {
          saveItemConfigBtn.disabled = false;
          saveItemConfigBtn.innerHTML ='<i class="fa-solid fa-floppy-disk"></i> <span>حفظ وتعميم إعدادات الأداة فوراً</span>';
        }
      });
    }

    // Admin Auctions creation button listener
    const btnCreateAuction = document.getElementById('btn-admin-create-auction');
    if (btnCreateAuction) {
      btnCreateAuction.addEventListener('click', async () => {
        const name = document.getElementById('admin-auction-name').value.trim();
        const desc = document.getElementById('admin-auction-desc').value.trim();
        const price = Number(document.getElementById('admin-auction-price').value);
        const qty = Number(document.getElementById('admin-auction-qty').value);

        if (!name || isNaN(price) || price <= 0 || isNaN(qty) || qty < 0) {
          showToast('خطأ إعدادات','يرجى إدخال قيم صحيحة وموجبة للاسم، السعر، والكمية.','error');
          return;
        }

        try {
          btnCreateAuction.disabled = true;
          btnCreateAuction.textContent ='جاري نشر المزاد...';

          await AppDB.adminCreateAuctionItem(name, desc, price, qty);

          showToast('تم النشر',`تم طرح الغرض"${name}" بنجاح في صفحة المزادات.`,'success');
          logAdminAction(`طرح غرض في المزاد: ${name} (سعر ${price.toLocaleString()} ج.م، كمية ${qty})`);

          // Clear inputs
          document.getElementById('admin-auction-name').value ='';
          document.getElementById('admin-auction-desc').value ='';
          document.getElementById('admin-auction-price').value ='';
          document.getElementById('admin-auction-qty').value ='';

          // Re-render
          fetchAndRenderAdminAuctions();
        } catch (err) {
          showToast('فشل إنشاء المزاد', err.message,'error');
        } finally {
          btnCreateAuction.disabled = false;
          btnCreateAuction.innerHTML ='<i class="fa-solid fa-plus"></i> <span>طرح الغرض للبيع فوراً في المزادات</span>';
        }
      });
    }

    // Admin Gift Codes Select Change Listener
    const giftRewardTypeSelect = document.getElementById('admin-gift-reward-type');
    if (giftRewardTypeSelect) {
      giftRewardTypeSelect.addEventListener('change', () => {
        const type = giftRewardTypeSelect.value;
        document.getElementById('admin-gift-box-cash').classList.toggle('hidden', type !=='cash');
        document.getElementById('admin-gift-box-business').classList.toggle('hidden', type !=='business');
        document.getElementById('admin-gift-box-item').classList.toggle('hidden', type !=='item');
      });
    }

    // Admin Create Gift Code Click Listener
    const btnCreateGiftCode = document.getElementById('btn-admin-create-giftcode');
    if (btnCreateGiftCode) {
      btnCreateGiftCode.addEventListener('click', async () => {
        const code = document.getElementById('admin-gift-code').value.trim();
        const type = document.getElementById('admin-gift-reward-type').value;
        const maxUses = Number(document.getElementById('admin-gift-max-uses').value) || 0;

        if (!code) {
          showToast('خطأ إدخال','يرجى إدخال رمز كود الهدية.','error');
          return;
        }

        const details = {};
        if (type ==='cash') {
          const amt = Number(document.getElementById('admin-gift-cash-amount').value);
          if (isNaN(amt) || amt <= 0) {
            showToast('خطأ إدخال','يرجى إدخال مبلغ مالي صحيح وموجب.','error');
            return;
          }
          details.amount = amt;
        } else if (type ==='business') {
          const bId = document.getElementById('admin-gift-business-id').value;
          const lvl = Number(document.getElementById('admin-gift-business-lvl').value);
          const workers = Number(document.getElementById('admin-gift-business-workers').value);
          if (isNaN(lvl) || lvl <= 0 || isNaN(workers) || workers < 0) {
            showToast('خطأ إدخال','يرجى إدخال مستوى وعدد عمال صحيحين.','error');
            return;
          }
          details.businessId = bId;
          details.level = lvl;
          details.workers = workers;
        } else if (type ==='item') {
          const itemId = document.getElementById('admin-gift-item-id').value;
          details.itemId = itemId;
        }

        try {
          btnCreateGiftCode.disabled = true;
          btnCreateGiftCode.textContent ='جاري توليد الكود...';

          await AppDB.adminCreateGiftCode(code, type, details, maxUses);

          showToast('تم إنشاء الكود',`تم نشر كود الهدية"${code.toUpperCase()}" بنجاح في المنظومة.`,'success');
          logAdminAction(`إنشاء كود الهدية: ${code.toUpperCase()} (النوع: ${type})`);

          // Clear inputs
          document.getElementById('admin-gift-code').value ='';
          document.getElementById('admin-gift-max-uses').value ='0';
          document.getElementById('admin-gift-cash-amount').value ='';

          fetchAndRenderAdminGiftCodes();
        } catch (err) {
          showToast('فشل الإنشاء', err.message,'error');
        } finally {
          btnCreateGiftCode.disabled = false;
          btnCreateGiftCode.innerHTML ='<i class="fa-solid fa-plus"></i> <span>توليد ونشر كود الهدية فوراً</span>';
        }
      });
    }

    // Expose loader to global scope of module
    window._adminReloadPlayers = loadAdminPlayersDirectory;
    window._adminRenderStockPrices = renderAdminStockPrices;
  }

  async function renderAdminAnalyticsDashboard() {
    try {
      const stats = await AppDB.getSystemStats();
      window._adminLastTotalPlayers = stats.totalPlayers || 0;

      const elP = document.getElementById('adm-stat-players');
      const elC = document.getElementById('adm-stat-cash');
      const elB = document.getElementById('adm-stat-bank');
      const elNW = document.getElementById('adm-stat-networth');
      const elJ = document.getElementById('adm-stat-jailed');
      const elBan = document.getElementById('adm-stat-banned');

      if (elP) {
        let badgeHtml ='';
        if (stats.isFromCache || stats.quotaExceeded) {
          badgeHtml =` <span class="text-[10px] px-1.5 py-0.5 rounded font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30" title="تم قراءة بعض البيانات من الكاش المحلي نظراً لبلوغ سقف كوتة Firebase المجانية">كاش </span>`;
        } else {
          badgeHtml =` <span class="text-[10px] px-1.5 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" title="بيانات حية مباشرة من السيرفر السحابي">حي </span>`;
        }
        elP.innerHTML =`${(stats.totalPlayers || 0).toLocaleString()}${badgeHtml}`;
      }
      if (elC) elC.textContent =`${(stats.totalCash || 0).toLocaleString()} EGP`;
      if (elB) elB.textContent =`${(stats.totalBank || 0).toLocaleString()} EGP`;
      if (elNW) elNW.textContent =`${(stats.totalNetWorth || 0).toLocaleString()} EGP`;
      if (elJ) elJ.textContent = (stats.jailedCount || 0).toLocaleString();
      if (elBan) elBan.textContent = (stats.bannedCount || 0).toLocaleString();

      // Show Quota Notice Banner if quota is exceeded
      let quotaBanner = document.getElementById('adm-ui-quota-notice-banner');
      const statsContainer = document.getElementById('admin-subpanel-stats');
      if (stats.quotaExceeded) {
        if (!quotaBanner && statsContainer) {
          quotaBanner = document.createElement('div');
          quotaBanner.id ='adm-ui-quota-notice-banner';
          quotaBanner.className ='p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-start gap-2.5 shadow-lg';
          quotaBanner.innerHTML =`
            <i class="fa-solid fa-triangle-exclamation text-amber-400 text-sm mt-0.5 shrink-0"></i>
            <div>
              <strong class="block font-bold text-amber-300 mb-0.5">تنبيه سقف كوتة القراءات السحابية (Firebase Quota 429)</strong>
              <span class="text-[11px] text-amber-300/80 leading-relaxed">
                مشروع Firebase استنفد الحد الأقصى اليومي للقراءات المجانية (Resource Exhausted). الإحصائيات معروضة استناداً إلى العدادات التراكمية والكاش المحلي، وستعود المزامنة السحابية الكاملة للعمل تلقائياً فور تجدد الكوتة اليومية من Google.
              </span>
            </div>`;
          statsContainer.insertBefore(quotaBanner, statsContainer.firstChild);
        }
      } else if (quotaBanner) {
        quotaBanner.remove();
      }

      // Populate tax inputs from current engine config (if not focused to avoid interrupting admin input)
      const currentCfg = GameEngine.getTaxConfig ? GameEngine.getTaxConfig() : null;
      if (currentCfg) {
        const mul = document.getElementById('adm-tax-multiplier');
        const sil = document.getElementById('adm-tax-silver');
        const maj = document.getElementById('adm-tax-major');
        const wha = document.getElementById('adm-tax-whale');
        if (mul && document.activeElement !== mul) mul.value = currentCfg.rateMultiplier;
        if (sil && document.activeElement !== sil) sil.value = currentCfg.silverRate;
        if (maj && document.activeElement !== maj) maj.value = currentCfg.majorRate;
        if (wha && document.activeElement !== wha) wha.value = currentCfg.whaleRate;
      }

      // 1. Render Wealth Distribution
      const wealthDistContainer = document.getElementById('adm-wealth-distribution-container');
      if (wealthDistContainer && stats.wealthBrackets) {
        const brackets = stats.wealthBrackets;
        const total = stats.totalPlayers || 1;
        const getPct = num => ((num / total) * 100).toFixed(1);

        wealthDistContainer.innerHTML =`
          <!-- Billionaires -->
          <div class="space-y-1">
            <div class="flex justify-between text-[11px] font-bold">
              <span class="text-amber-400">المليارديرات (+50M)</span>
              <span class="numbers-font text-white">${brackets.billionaires} (${getPct(brackets.billionaires)}%)</span>
            </div>
            <div class="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-805">
              <div class="h-full bg-gradient-to-l from-yellow-600 to-yellow-400 rounded-full transition-all duration-500" style="width: ${getPct(brackets.billionaires)}%"></div>
            </div>
          </div>
          <!-- Millionaires -->
          <div class="space-y-1">
            <div class="flex justify-between text-[11px] font-bold">
              <span class="text-sky-400">المليونيرات (5M - 50M)</span>
              <span class="numbers-font text-white">${brackets.millionaires} (${getPct(brackets.millionaires)}%)</span>
            </div>
            <div class="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-805">
              <div class="h-full bg-sky-500 rounded-full transition-all duration-500" style="width: ${getPct(brackets.millionaires)}%"></div>
            </div>
          </div>
          <!-- Middle Class -->
          <div class="space-y-1">
            <div class="flex justify-between text-[11px] font-bold">
              <span class="text-emerald-400">الطبقة المتوسطة (500k - 5M)</span>
              <span class="numbers-font text-white">${brackets.middleClass} (${getPct(brackets.middleClass)}%)</span>
            </div>
            <div class="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-805">
              <div class="h-full bg-emerald-500 rounded-full transition-all duration-500" style="width: ${getPct(brackets.middleClass)}%"></div>
            </div>
          </div>
          <!-- Working Class -->
          <div class="space-y-1">
            <div class="flex justify-between text-[11px] font-bold">
              <span class="text-slate-400">الطبقة الكادحة (&lt;500k)</span>
              <span class="numbers-font text-white">${brackets.workingClass} (${getPct(brackets.workingClass)}%)</span>
            </div>
            <div class="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-805">
              <div class="h-full bg-slate-500 rounded-full transition-all duration-500" style="width: ${getPct(brackets.workingClass)}%"></div>
            </div>
          </div>`;
      }

      // 2. Render Top 5 Richest comparison
      const topRichestContainer = document.getElementById('adm-top-richest-container');
      if (topRichestContainer && stats.topRichest) {
        const top5 = stats.topRichest;
        const maxWorth = top5.length > 0 ? (top5[0].netWorth || 1) : 1;

        topRichestContainer.innerHTML ='';
        if (top5.length === 0) {
          topRichestContainer.innerHTML ='<div class="text-[11px] text-slate-500 text-center py-4">لا توجد بيانات متاحة حالياً.</div>';
        } else {
          top5.forEach((p, idx) => {
            const widthPct = Math.max(8, Math.min(100, (p.netWorth / maxWorth) * 100));
            const bar = document.createElement('div');
            bar.className ='space-y-1';
            bar.innerHTML =`
              <div class="flex justify-between items-center text-[10px]">
                <span class="font-bold text-slate-200 flex items-center gap-1.5">
                  <span class="w-4 h-4 rounded bg-slate-800 text-slate-300 font-mono text-[9px] flex items-center justify-center font-bold">${idx + 1}</span>
                  <span class="text-yellow-400">${p.username}</span>
                  <span class="text-slate-500">(${p.title})</span>
                </span>
                <span class="numbers-font font-bold text-slate-300">${(p.netWorth).toLocaleString()} EGP</span>
              </div>
              <div class="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-850">
                <div class="h-full bg-gradient-to-l from-yellow-500 to-amber-500 rounded-full transition-all duration-500" style="width: ${widthPct}%"></div>
              </div>`;
            topRichestContainer.appendChild(bar);
          });
        }
      }

      // 3. Render Suspicious Accounts
      const suspiciousTbody = document.getElementById('adm-suspicious-accounts-tbody');
      if (suspiciousTbody) {
        const suspects = stats.suspiciousPlayers || [];
        suspiciousTbody.innerHTML ='';

        if (suspects.length === 0) {
          suspiciousTbody.innerHTML =`
            <tr>
              <td colspan="5" class="py-6 text-center text-slate-500">لا توجد حسابات مشبوهة مرصودة حالياً. السيرفر آمن تماماً!</td>
            </tr>`;
        } else {
          suspects.forEach(p => {
            const tr = document.createElement('tr');
            tr.className ='hover:bg-slate-900 border-b border-slate-800/40 transition duration-150';
            tr.innerHTML =`
              <td class="p-2.5 font-bold text-white">${p.username}</td>
              <td class="p-2.5 font-bold text-yellow-500 numbers-font">${(p.netWorth).toLocaleString()} EGP</td>
              <td class="p-2.5 text-center font-bold text-sky-400 numbers-font">${(p.xp).toLocaleString()}</td>
              <td class="p-2.5 text-rose-400 font-bold">${p.reason}</td>
              <td class="p-2.5 text-left flex gap-1.5 justify-end">
                <button onclick="UIController.adminQuickJailAction('${p.username}')" class="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 font-bold rounded-lg text-[10px] transition duration-150 flex items-center gap-1">
                  <i class="fa-solid fa-handcuffs"></i> سجن
                </button>
                <button onclick="UIController.adminQuickBanAction('${p.username}')" class="px-2 py-1 bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 font-bold rounded-lg text-[10px] transition duration-150 flex items-center gap-1">
                  <i class="fa-solid fa-ban"></i> حظر
                </button>
              </td>`;
            suspiciousTbody.appendChild(tr);
          });
        }
      }

      logAdminAction(`تحديث الإحصائيات — الحسابات: ${stats.totalPlayers} | الثروة الكلية: ${(stats.totalNetWorth || 0).toLocaleString()} EGP`);
    } catch (e) {
      console.warn('[Admin Dashboard] Failed to load stats:', e);
    }
  }

  async function renderAdminTransfersMonitor() {
    const tbody = document.getElementById('admin-transfers-table-body');
    if (!tbody) return;
    tbody.innerHTML ='<tr><td colspan="5" class="py-4 text-center text-slate-400">جاري تحميل سجل التحويلات...</td></tr>';

    try {
      const transfers = await AppDB.adminGetTransfers();
      if (!transfers || transfers.length === 0) {
        tbody.innerHTML ='<tr><td colspan="5" class="py-6 text-center text-slate-500">لا يوجد عمليات تحويل مالية مسجلة حالياً.</td></tr>';
        return;
      }

      tbody.innerHTML ='';
      transfers.forEach(trf => {
        const tr = document.createElement('tr');
        tr.className ='hover:bg-slate-850 transition';
        const dateStr = new Date(trf.timestamp).toLocaleTimeString('ar-EG', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
        tr.innerHTML =`
          <td class="p-2.5 font-bold text-white">${trf.sender}</td>
          <td class="p-2.5 font-bold text-yellow-400">${trf.recipient}</td>
          <td class="p-2.5 text-center numbers-font font-bold text-emerald-400">+${(trf.amount || 0).toLocaleString()} EGP</td>
          <td class="p-2.5 text-center numbers-font text-slate-400 text-[11px]">${dateStr}</td>
          <td class="p-2.5 text-left"><span class="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-bold text-[10px]">${trf.status ||'مكتملة'}</span></td>`;
        tbody.appendChild(tr);
      });
    } catch (e) {
      tbody.innerHTML =`<tr><td colspan="5" class="py-4 text-center text-rose-400">فشل تحميل سجل التحويلات: ${e.message}</td></tr>`;
    }
  }

  let adminCorpsUnsubscribe = null;

  function renderAdminCorporationsPanel() {
    const tbody = document.getElementById('admin-corporations-list');
    if (!tbody) return;

    tbody.innerHTML ='<tr><td colspan="6" class="py-4 text-center text-slate-500">جاري تحميل الشركات...</td></tr>';

    if (adminCorpsUnsubscribe) {
      adminCorpsUnsubscribe();
      adminCorpsUnsubscribe = null;
    }

    adminCorpsUnsubscribe = AppDB.listenToCorporations(corps => {
      tbody.innerHTML ='';
      if (!corps || corps.length === 0) {
        tbody.innerHTML ='<tr><td colspan="6" class="py-4 text-center text-slate-500">لا توجد شركات مشتركة مسجلة حالياً.</td></tr>';
        return;
      }

      corps.forEach(corp => {
        const tr = document.createElement('tr');
        tr.className ='hover:bg-slate-850 transition border-b border-slate-800/40';

        const projKeys = Array.isArray(corp.projects) ? corp.projects : Object.keys(corp.projects || {}).filter(k => corp.projects[k] === true);
        const projNames = projKeys.map(k => {
          const p = GameEngine.CORP_PROJECTS[k];
          return p ? p.name : k;
        }).join('،') ||'لا توجد مشاريع';

        tr.innerHTML =`
          <td class="p-2.5 font-bold text-white">
            <div>${corp.name}</div>
            <div class="text-[10px] text-slate-500 font-normal">${corp.desc ||'لا يوجد وصف'}</div>
          </td>
          <td class="p-2.5 font-bold text-slate-300">${corp.founder}</td>
          <td class="p-2.5 text-center font-mono text-emerald-400 font-bold">${(corp.treasury || 0).toLocaleString()} EGP</td>
          <td class="p-2.5 text-center font-mono text-slate-300 font-bold">${(corp.members || []).length} عضو</td>
          <td class="p-2.5 text-center text-slate-400 max-w-[200px] truncate" title="${projNames}">${projNames}</td>
          <td class="p-2.5 text-left space-x-1 space-x-reverse">
            <button data-id="${corp.id}" data-name="${corp.name}" class="btn-admin-edit-corp-treasury py-1 px-2.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/20 rounded font-bold transition text-[10px]">تعديل الخزينة</button>
            <button data-id="${corp.id}" data-name="${corp.name}" class="btn-admin-delete-corp py-1 px-2.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/20 rounded font-bold transition text-[10px]">تفكيك</button>
          </td>`;

        // Bind Edit Treasury Button
        const btnEdit = tr.querySelector('.btn-admin-edit-corp-treasury');
        btnEdit.addEventListener('click', async () => {
          const corpId = btnEdit.dataset.id;
          const corpName = btnEdit.dataset.name;
          const currentTreasury = corp.treasury || 0;
          const val = prompt(`أدخل الرصيد الجديد لخزينة شركة"${corpName}":`, currentTreasury);
          if (val === null || val.trim() ==='') return;
          try {
            await AppDB.adminEditCorporationTreasury(corpId, val);
            showToast('تعديل الخزينة',`تم تعديل رصيد خزينة شركة ${corpName} بنجاح.`,'success');
            logAdminAction(`تعديل خزينة الشركة المشتركة: ${corpName}`);
          } catch (e) {
            showToast('خطأ تعديل الخزينة', e.message,'error');
          }
        });

        // Bind Delete Button
        const btnDel = tr.querySelector('.btn-admin-delete-corp');
        btnDel.addEventListener('click', async () => {
          const corpId = btnDel.dataset.id;
          const corpName = btnDel.dataset.name;
          if (!confirm(`هل أنت متأكد تماماً من تفكيك وحذف شركة"${corpName}" نهائياً من قاعدة البيانات؟\nلا يمكن استرجاع هذا الإجراء.`)) return;
          try {
            await AppDB.adminDeleteCorporation(corpId);
            showToast('تفكيك شركة',`تم تفكيك وحذف شركة ${corpName} بنجاح.`,'success');
            logAdminAction(`تفكيك وحذف الشركة المشتركة: ${corpName}`);
          } catch (e) {
            showToast('خطأ تفكيك شركة', e.message,'error');
          }
        });

        tbody.appendChild(tr);
      });
    });
  }

  function switchAdminTab(tabId) {
    const subtabs = ['stats','players','transfers','chat','market','broadcast','auctions','giftcodes','system','corporations'];
    subtabs.forEach(t => {
      const btn = document.getElementById(`tab-admin-${t}`);
      const mobPill = document.getElementById(`mobtab-admin-${t}`);
      const panel = document.getElementById(`admin-subpanel-${t}`);
      if (!panel) return;
      if (t === tabId) {
        if (btn) {
          btn.classList.add('border-yellow-500/40','bg-yellow-500/10','text-yellow-400','active-admin-tab','active-admin-sidebar-btn');
          btn.classList.remove('border-transparent','text-slate-400','hover:bg-slate-900/60');
        }
        if (mobPill) {
          mobPill.classList.add('active-admin-mob-pill');
          mobPill.classList.remove('text-slate-300','border-transparent','bg-slate-800/60');
          try {
            mobPill.scrollIntoView({ behavior:'smooth', inline:'center', block:'nearest' });
          } catch (e) {}
        }
        panel.classList.remove('hidden');
      } else {
        if (btn) {
          btn.classList.remove('border-yellow-500/40','bg-yellow-500/10','text-yellow-400','active-admin-tab','active-admin-sidebar-btn');
          btn.classList.add('border-transparent','text-slate-400');
        }
        if (mobPill) {
          mobPill.classList.remove('active-admin-mob-pill');
          mobPill.classList.add('text-slate-300','border-transparent','bg-slate-800/60');
        }
        panel.classList.add('hidden');
      }
    });

    // Auto-collapse mobile sidebar on tab change
    if (typeof toggleAdminSidebarAction ==='function') {
      toggleAdminSidebarAction(false);
    }

    if (tabId ==='stats') {
      renderAdminAnalyticsDashboard();
    } else if (tabId ==='players') {
      if (window._adminReloadPlayers) window._adminReloadPlayers(false);
    } else if (tabId ==='transfers') {
      renderAdminTransfersMonitor();
    } else if (tabId ==='chat') {
      if (typeof renderAdminChatMonitor ==='function') renderAdminChatMonitor();
    } else if (tabId ==='market') {
      if (window._adminRenderStockPrices) window._adminRenderStockPrices();
    } else if (tabId ==='auctions') {
      fetchAndRenderAdminAuctions();
    } else if (tabId ==='giftcodes') {
      fetchAndRenderAdminGiftCodes();
    } else if (tabId ==='corporations') {
      renderAdminCorporationsPanel();
    } else if (tabId ==='system') {
      const itSelect = document.getElementById('admin-item-config-select');
      if (itSelect) {
        const initItem = GameEngine.STORE_ITEMS[itSelect.value];
        if (initItem) {
          document.getElementById('admin-item-config-cost').value = initItem.cost;
          document.getElementById('admin-item-config-duration').value = initItem.durationTicks * 3;
        }
      }
    }
    window.switchAdminTab = switchAdminTab;
  }

  function updateStatsBarServerBoostIndicator() {
    const mult = window.serverBoostMultiplier || 1.0;
    const banner = document.getElementById('hud-server-boost-banner');
    const valText = document.getElementById('hud-server-boost-val');
    
    if (banner && valText) {
      if (mult > 1.0) {
        banner.classList.remove('hidden');
        valText.textContent =`${mult.toFixed(1)}x أرباح وخبرة مضاعفة!`;
      } else {
        banner.classList.add('hidden');
      }
    }
  }

  function toggleAdminSidebarAction(forceState) {
    const sidebar = document.getElementById('admin-sidebar');
    const backdrop = document.getElementById('admin-sidebar-backdrop');
    if (!sidebar) return;

    const isCurrentlyOpen = !sidebar.classList.contains('translate-x-full');
    const shouldOpen = (typeof forceState ==='boolean') ? forceState : !isCurrentlyOpen;

    if (shouldOpen) {
      sidebar.classList.remove('translate-x-full');
      sidebar.classList.add('translate-x-0');
      if (backdrop) backdrop.classList.remove('hidden');
    } else {
      sidebar.classList.add('translate-x-full');
      sidebar.classList.remove('translate-x-0');
      if (backdrop) backdrop.classList.add('hidden');
    }
  }

  async function toggleServerBoostAction() {
    const currentBoost = window.serverBoostMultiplier || 1.0;
    const newBoost = currentBoost > 1.0 ? 1.0 : 2.0;
    const toggleBtn = document.getElementById('btn-adm-toggle-boost');
    
    try {
      if (toggleBtn) {
        toggleBtn.disabled = true;
        toggleBtn.innerHTML ='<i class="fa-solid fa-spinner animate-spin"></i>';
      }
      
      await AppDB.adminSaveServerConfig({
        boostMultiplier: newBoost
      });
      
      showToast('مضاعف السيرفر', newBoost > 1.0 ?'تم تفعيل وضع مضاعف الأرباح والخبرة 2x للجميع!' :'تم إيقاف مضاعف السيرفر والعودة للوضع الاعتيادي.','success');
      logAdminAction(`تحديث مضاعف السيرفر: تم تعيين المضاعف على ${newBoost.toFixed(1)}x`);
      
      await AppDB.sendBroadcast(
        newBoost > 1.0 ?' تفعيل مضاعف السيرفر (Server Boost)!' :'ℹ️ انتهاء مضاعف السيرفر (Server Boost)',
        newBoost > 1.0 ?'قام الأدمن بتفعيل وضع مضاعف الأرباح والخبرة (Double XP & Cash) لجميع اللاعبين حياً!' :'انتهى وضع مضاعف الأرباح والخبرة وعاد السيرفر للمعدل الطبيعي.'
      );
      
    } catch (err) {
      showToast('خطأ في تغيير المضاعف', err.message,'error');
    } finally {
      if (toggleBtn) {
        toggleBtn.disabled = false;
        toggleBtn.innerHTML ='<i class="fa-solid fa-bolt text-sm"></i>';
      }
    }
  }

  function logAdminAction(msg) {
    const targets = [
      document.getElementById('admin-action-logs'),
      document.getElementById('admin-stats-live-log')
    ];

    const time = new Date().toLocaleTimeString('ar-EG');
    targets.forEach(logBox => {
      if (!logBox) return;
      if (logBox.innerHTML.includes("لا يوجد عمليات مسجلة") || logBox.innerHTML.includes("Dyn live logs")) {
        logBox.innerHTML ='';
      }
      const entry = document.createElement('div');
      entry.className ='border-b border-slate-900/60 pb-1 mb-1';
      entry.innerHTML =`<span class="text-yellow-500 font-bold ml-1 font-mono">[${time}]</span> ${msg}`;
      logBox.insertBefore(entry, logBox.firstChild);
    });
  }

  // ─────────────────────────────────────────────
  //  TRANSFER REQUESTS — UI Rendering & State
  // ─────────────────────────────────────────────
  let lastRequestsFetchTime = 0;
  let cachedIncomingRequests = [];
  let cachedSentRequests = [];
  let requestsTabActive ='incoming';

  async function fetchAndRenderTransferRequests(force = false) {
    const s = GameEngine.state;
    if (!GameEngine.activeUsername || !s) return;
    const username = GameEngine.activeUsername;

    const now = Date.now();
    if (force || now - lastRequestsFetchTime > 10000) {
      lastRequestsFetchTime = now;
      try {
        const [incoming, sent] = await Promise.all([
          AppDB.getIncomingTransferRequests(username),
          AppDB.getSentTransferRequests(username)
        ]);
        cachedIncomingRequests = incoming;
        cachedSentRequests = sent;
      } catch (err) {
        console.error('Error fetching transfer requests:', err);
      }
    }

    renderRequestsListDOM();
  }

  function renderRequestsListDOM() {
    const username = GameEngine.activeUsername;
    const incomingList = document.getElementById('incoming-requests-list');
    const sentList = document.getElementById('sent-requests-list');
    const countIncomingEl = document.getElementById('count-incoming-reqs');
    const countSentEl = document.getElementById('count-sent-reqs');

    if (!incomingList || !sentList) return;

    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;

    const pendingIncomingCount = cachedIncomingRequests.filter(r => r.status ==='pending' && (now - r.timestamp <= twentyFourHours)).length;
    const pendingSentCount = cachedSentRequests.filter(r => r.status ==='pending' && (now - r.timestamp <= twentyFourHours)).length;

    if (countIncomingEl) countIncomingEl.textContent = pendingIncomingCount;
    if (countSentEl) countSentEl.textContent = pendingSentCount;

    // Render Incoming Requests
    if (cachedIncomingRequests.length === 0) {
      incomingList.innerHTML =`<div class="text-center text-slate-500 text-xs py-8">لا يوجد طلبات واردة حالياً.</div>`;
    } else {
      incomingList.innerHTML ='';
      cachedIncomingRequests.forEach(r => {
        const age = now - r.timestamp;
        const isExpired = r.status ==='pending' && age > twentyFourHours;
        const remainingMs = twentyFourHours - age;

        let statusText ='';
        let statusClass ='';
        let actionButtons ='';

        if (r.status ==='accepted') {
          statusText ='تم القبول والتحويل ️';
          statusClass ='text-emerald-400 font-bold';
        } else if (r.status ==='rejected') {
          statusText ='تم الرفض';
          statusClass ='text-rose-400 font-bold';
        } else if (isExpired) {
          statusText ='منتهي الصلاحية (24س) ️';
          statusClass ='text-slate-500 font-bold';
        } else {
          const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
          const remainingMins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
          statusText =`معلق - متبقي ${remainingHours}س و ${remainingMins}د`;
          statusClass ='text-yellow-400 font-bold';

          actionButtons =`
            <div class="flex gap-1.5 mt-2">
              <button data-id="${r.id}" class="btn-req-accept flex-grow py-1 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black rounded text-[10px] transition">قبول ودفع</button>
              <button data-id="${r.id}" class="btn-req-reject flex-grow py-1 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/20 rounded text-[10px] transition">رفض</button>
            </div>`;
        }

        const div = document.createElement('div');
        div.className ='glass-panel p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between text-xs mb-2';
        div.innerHTML =`
          <div class="flex justify-between items-center mb-1">
            <span class="font-bold text-white">المرسل: ${r.sender}</span>
            <span class="numbers-font text-yellow-500 font-bold text-sm">${r.amount.toLocaleString()} EGP</span>
          </div>
          <div class="flex justify-between items-center text-[10px] text-slate-400">
            <span>الحالة: <span class="${statusClass}">${statusText}</span></span>
            <span class="numbers-font">${new Date(r.timestamp).toLocaleTimeString('ar-EG')}</span>
          </div>
          ${actionButtons}`;

        const acceptBtn = div.querySelector('.btn-req-accept');
        const rejectBtn = div.querySelector('.btn-req-reject');
        if (acceptBtn) {
          acceptBtn.addEventListener('click', async () => {
            try {
              acceptBtn.disabled = true;
              if (rejectBtn) rejectBtn.disabled = true;
              acceptBtn.textContent ='جاري المعالجة...';

              // If player has insufficient cash in wallet but enough in bank, auto-withdraw difference
              const curCash = Number(GameEngine.state.cash) || 0;
              const curBank = Number(GameEngine.state.bank) || 0;
              if (curCash < r.amount) {
                const diff = r.amount - curCash;
                if (curBank >= diff) {
                  GameEngine.state.bank -= diff;
                  GameEngine.state.cash += diff;
                  await AppDB.savePlayerState(username, GameEngine.state, true);
                } else {
                  throw new Error(`رصيدك الإجمالي (كاش + بنك) غير كافٍ لسداد هذا الطلب.`);
                }
              }

              await AppDB.acceptTransferRequest(r.id, username);
              showToast('موافقة الطلب',`تم قبول طلب التحويل ودفع ${r.amount.toLocaleString()} EGP بنجاح!`,'success');

              const updatedState = await AppDB.getPlayerState(username);
              if (updatedState) {
                GameEngine.state.cash = updatedState.cash;
                GameEngine.state.bank = updatedState.bank;
                GameEngine.state.netWorth = updatedState.netWorth;
              }
              await fetchAndRenderTransferRequests(true);
              if (typeof loadTransferHistory ==='function') {
                loadTransferHistory(true);
              }
              renderAll();
            } catch (err) {
              showToast('خطأ في قبول الطلب', err.message,'error');
              acceptBtn.disabled = false;
              if (rejectBtn) rejectBtn.disabled = false;
              acceptBtn.textContent ='قبول ودفع';
            }
          });
        }
        if (rejectBtn) {
          rejectBtn.addEventListener('click', async () => {
            try {
              if (acceptBtn) acceptBtn.disabled = true;
              rejectBtn.disabled = true;
              rejectBtn.textContent ='جاري الرفض...';

              await AppDB.rejectTransferRequest(r.id, username);
              showToast('رفض الطلب','تم رفض طلب التحويل بنجاح.','info');

              await fetchAndRenderTransferRequests(true);
            } catch (err) {
              showToast('خطأ في رفض الطلب', err.message,'error');
              if (acceptBtn) acceptBtn.disabled = false;
              rejectBtn.disabled = false;
              rejectBtn.textContent ='رفض';
            }
          });
        }

        incomingList.appendChild(div);
      });
    }

    // Render Sent Requests
    if (cachedSentRequests.length === 0) {
      sentList.innerHTML =`<div class="text-center text-slate-500 text-xs py-8">لا يوجد طلبات مرسلة حالياً.</div>`;
    } else {
      sentList.innerHTML ='';
      cachedSentRequests.forEach(r => {
        const age = now - r.timestamp;
        const isExpired = r.status ==='pending' && age > twentyFourHours;
        const remainingMs = twentyFourHours - age;

        let statusText ='';
        let statusClass ='';

        if (r.status ==='accepted') {
          statusText ='تم القبول والتحويل ️';
          statusClass ='text-emerald-400 font-bold';
        } else if (r.status ==='rejected') {
          statusText ='تم الرفض';
          statusClass ='text-rose-400 font-bold';
        } else if (isExpired) {
          statusText ='منتهي الصلاحية ️';
          statusClass ='text-slate-500 font-bold';
        } else {
          const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
          const remainingMins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
          statusText =`معلق - متبقي ${remainingHours}س و ${remainingMins}د`;
          statusClass ='text-yellow-400 font-bold';
        }

        const div = document.createElement('div');
        div.className ='glass-panel p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between text-xs mb-2';
        div.innerHTML =`
          <div class="flex justify-between items-center mb-1">
            <span class="font-bold text-white">المستلم: ${r.recipient}</span>
            <span class="numbers-font text-yellow-500 font-bold text-sm">${r.amount.toLocaleString()} EGP</span>
          </div>
          <div class="flex justify-between items-center text-[10px] text-slate-400">
            <span>الحالة: <span class="${statusClass}">${statusText}</span></span>
            <span class="numbers-font">${new Date(r.timestamp).toLocaleTimeString('ar-EG')}</span>
          </div>`;
        sentList.appendChild(div);
      });
    }
  }

  // ─────────────────────────────────────────────
  //  AUCTIONS & SPECIAL DEALS — UI Rendering & State
  // ─────────────────────────────────────────────
  async function fetchAndRenderAuctions() {
    const shelf = document.getElementById('auctions-shelf');
    if (!shelf) return;

    shelf.innerHTML =`<div class="col-span-full text-center text-slate-500 text-xs py-12 flex flex-col items-center justify-center gap-2">
      <i class="fa-solid fa-spinner animate-spin text-amber-500 text-lg"></i>
      <span>جاري تحميل الصفقات المعروضة من السيرفر...</span>
    </div>`;

    try {
      const items = await AppDB.getAuctionItems();
      renderAuctionsShelfDOM(items);
    } catch (e) {
      shelf.innerHTML =`<div class="col-span-full text-center text-rose-400 text-xs py-12">فشل تحميل صفقات المزادات: ${e.message}</div>`;
    }

    renderPlayerCollectiblesDOM();
  }

  function renderAuctionsShelfDOM(items) {
    const shelf = document.getElementById('auctions-shelf');
    if (!shelf) return;

    if (!items || items.length === 0) {
      shelf.innerHTML =`<div class="col-span-full text-center text-slate-500 text-xs py-12">لا توجد مزادات أو صفقات نشطة حالياً.</div>`;
      return;
    }

    shelf.innerHTML ='';
    items.forEach(item => {
      const totalQty = Number(item.quantity || 0);
      const sold = Number(item.soldCount || 0);
      const remaining = Math.max(0, totalQty - sold);

      const isSoldOut = remaining <= 0;
      let btnHtml ='';

      if (isSoldOut) {
        btnHtml =`<button disabled class="w-full py-2 bg-slate-800 text-slate-500 font-bold rounded-lg text-xs cursor-not-allowed">نفذت الكمية </button>`;
      } else {
        btnHtml =`<button data-id="${item.id}" class="btn-buy-auction-item w-full py-2 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-black rounded-lg text-xs transition duration-200 shadow-md">شراء الآن </button>`;
      }

      const card = document.createElement('div');
      card.className ='glass-panel p-4.5 rounded-xl border border-slate-800 flex flex-col justify-between space-y-3 relative overflow-hidden';
      if (isSoldOut) card.classList.add('opacity-60');

      card.innerHTML =`
        <div>
          <div class="flex justify-between items-start gap-2 mb-1.5">
            <h4 class="text-xs font-black text-white">${item.name}</h4>
            <span class="text-[10px] px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/25 rounded font-bold whitespace-nowrap">صفقة نادرة</span>
          </div>
          <p class="text-[10px] text-slate-400 leading-relaxed">${item.description ||'لا يوجد وصف متوفر.'}</p>
        </div>

        <div class="space-y-2 border-t border-slate-800/40 pt-2.5">
          <div class="flex justify-between items-center text-[10px]">
            <span class="text-slate-500">سعر الشراء الفوري</span>
            <span class="numbers-font text-yellow-500 font-black text-sm">${item.price.toLocaleString()} EGP</span>
          </div>
          <div class="flex justify-between items-center text-[10px]">
            <span class="text-slate-500">الكمية المتبقية</span>
            <span class="font-bold text-slate-300">${isSoldOut ?'انتهى المعروض' :`${remaining} / ${totalQty} قطعة`}</span>
          </div>
        </div>

        ${btnHtml}`;

      const buyBtn = card.querySelector('.btn-buy-auction-item');
      if (buyBtn) {
        buyBtn.addEventListener('click', async () => {
          try {
            buyBtn.disabled = true;
            buyBtn.textContent ='جاري الشراء...';

            const result = await AppDB.purchaseAuctionItem(item.id, GameEngine.activeUsername);

            showToast('تم الشراء بنجاح',`تهانينا! قمت بشراء"${result.name}" بسعر ${result.price.toLocaleString()} ج.م. تم إضافته لمقتنياتك النادرة.`,'success');
            playMenuSound('success');

            GameEngine.state.cash = result.newCash;
            GameEngine.state.netWorth = result.newNetWorth;
            if (!GameEngine.state.customItems) GameEngine.state.customItems = [];
            GameEngine.state.customItems.push({
              auctionId: item.id,
              name: item.name,
              description: item.description,
              price: item.price,
              timestamp: Date.now()
            });

            fetchAndRenderAuctions();
            renderAll();
          } catch (err) {
            showToast('فشل الشراء', err.message,'error');
            buyBtn.disabled = false;
            buyBtn.textContent ='شراء الآن';
          }
        });
      }

      shelf.appendChild(card);
    });
  }

  function renderPlayerCollectiblesDOM() {
    const container = document.getElementById('player-collectibles');
    if (!container) return;

    const items = (GameEngine.state && GameEngine.state.customItems) || [];
    if (items.length === 0) {
      container.innerHTML =`<div class="col-span-full text-center text-slate-500 text-xs py-8">لم تقم بشراء أي مقتنيات نادرة من المزادات حتى الآن.</div>`;
      return;
    }

    container.innerHTML ='';
    items.forEach(item => {
      const card = document.createElement('div');
      card.className ='glass-panel p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/[0.02] flex flex-col justify-between space-y-2';

      const timeStr = new Date(item.timestamp).toLocaleDateString('ar-EG', {
        month:'short',
        day:'numeric',
        hour:'2-digit',
        minute:'2-digit'
      });

      card.innerHTML =`
        <div>
          <div class="flex justify-between items-center mb-1">
            <span class="font-black text-amber-400 text-xs flex items-center gap-1.5">
              <i class="fa-solid fa-gem text-[10px]"></i>
              <span>${item.name}</span>
            </span>
            <span class="numbers-font text-[10px] text-slate-500 font-bold">${item.price.toLocaleString()} ج.م</span>
          </div>
          <p class="text-[10px] text-slate-400">${item.description ||'لا يوجد وصف متوفر.'}</p>
        </div>
        <div class="text-[9px] text-slate-500 text-left border-t border-slate-800/40 pt-1.5 mt-1 font-mono">
          تملكها منذ: ${timeStr}
        </div>`;
      container.appendChild(card);
    });
  }

  function renderAuctionsTab() {
    const aucCashEl = document.getElementById('auction-player-cash');
    if (aucCashEl && GameEngine.state) {
      aucCashEl.textContent =`${GameEngine.state.cash.toLocaleString()} EGP`;
    }
    renderPlayerCollectiblesDOM();
  }

  async function fetchAndRenderAdminAuctions() {
    const tbody = document.getElementById('admin-auctions-list');
    if (!tbody) return;

    try {
      const items = await AppDB.getAuctionItems();
      if (items.length === 0) {
        tbody.innerHTML =`<tr><td colspan="5" class="py-6 text-center text-slate-500">لا توجد أغراض معروضة في المزادات حالياً.</td></tr>`;
        return;
      }

      tbody.innerHTML ='';
      items.forEach(item => {
        const tr = document.createElement('tr');
        tr.className ='border-b border-slate-800/60 hover:bg-slate-900/30 text-xs';

        const total = Number(item.quantity || 0);
        const sold = Number(item.soldCount || 0);
        const remaining = Math.max(0, total - sold);

        tr.innerHTML =`
          <td class="py-2.5 font-bold text-white">${item.name}</td>
          <td class="py-2.5 text-slate-400 max-w-[200px] truncate">${item.description ||'-'}</td>
          <td class="py-2.5 text-center font-bold text-yellow-500 font-mono">${item.price.toLocaleString()} ج.م</td>
          <td class="py-2.5 text-center font-bold font-mono text-slate-300">${sold} مبيعة / ${remaining} متبقي (${total} إجمالي)</td>
          <td class="py-2.5 text-left">
            <button data-id="${item.id}" class="btn-admin-delete-auction py-1 px-3 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/20 rounded font-bold transition text-[10px]">حذف المعروض</button>
          </td>`;

        const deleteBtn = tr.querySelector('.btn-admin-delete-auction');
        if (deleteBtn) {
          deleteBtn.addEventListener('click', async () => {
            if (!confirm(`هل أنت متأكد من حذف الغرض"${item.name}" من المزادات؟`)) return;
            try {
              deleteBtn.disabled = true;
              deleteBtn.textContent ='جاري الحذف...';
              await AppDB.adminDeleteAuctionItem(item.id);
              showToast('تم الحذف','تم حذف غرض المزاد بنجاح.','info');
              logAdminAction(`حذف غرض المزاد: ${item.name}`);
              fetchAndRenderAdminAuctions();
            } catch (err) {
              showToast('فشل الحذف', err.message,'error');
              deleteBtn.disabled = false;
              deleteBtn.textContent ='حذف المعروض';
            }
          });
        }

        tbody.appendChild(tr);
      });
    } catch (e) {
      tbody.innerHTML =`<tr><td colspan="5" class="py-4 text-center text-rose-400">فشل تحميل قائمة المزادات الإدارية: ${e.message}</td></tr>`;
    }
  }

  async function fetchAndRenderAdminGiftCodes() {
    const tbody = document.getElementById('admin-giftcodes-list');
    if (!tbody) return;

    try {
      const codes = await AppDB.adminGetGiftCodes();
      if (codes.length === 0) {
        tbody.innerHTML =`<tr><td colspan="5" class="py-6 text-center text-slate-500">لا توجد أكواد هدايا نشطة حالياً.</td></tr>`;
        return;
      }

      tbody.innerHTML ='';
      codes.forEach(code => {
        const tr = document.createElement('tr');
        tr.className ='border-b border-slate-800/60 hover:bg-slate-900/30 text-xs';

        let rewardDesc ='';
        if (code.rewardType ==='cash') {
          rewardDesc =`${Number(code.rewardDetails.amount || 0).toLocaleString()} ج.م`;
        } else if (code.rewardType ==='business') {
          const businessNames = {
            coffee:'عربة قهوة مختصة',
            supermarket:'سوبر ماركت',
            tech:'شركة برمجيات وتطبيقات',
            logistics:'شركة شحن ولوجستيات',
            solar_factory:'محطة طاقة شمسية',
            private_hospital:'مستشفى خاص',
            media_studio:'ستوديو إنتاج إعلامي',
            private_bank:'بنك استثماري خاص',
            oil_refinery:'مصفاة بترول وتكرير',
            space_tech:'شركة استكشاف الفضاء'
          };
          const bName = businessNames[code.rewardDetails.businessId] || code.rewardDetails.businessId;
          rewardDesc =`${bName} (مستوى ${code.rewardDetails.level} | عمال ${code.rewardDetails.workers})`;
        } else if (code.rewardType ==='item') {
          const itemNames = {
            gold_pen:'القلم الذهبي للمدراء',
            premium_lawyer:'توكيل محامٍ دولي',
            energy_drink:'مشروب الطاقة والتركيز',
            tax_shield:'درع الإعفاء الضريبي',
            market_scanner:'ماسح البورصة والتداول',
            vip_casino_pass:'بطاقة VIP للكازينو',
            quantum_cpu:'معالج الحوسبة الكمومية',
            diamond_card:'عضوية النادي الماسي',
            cronos_gear:'ساعة الكرونوس'
          };
          const itName = itemNames[code.rewardDetails.itemId] || code.rewardDetails.itemId;
          rewardDesc = itName;
        }

        const maxStr = code.maxUses > 0 ?`${code.maxUses}` :'️';
        const usageText =`${code.usedCount || 0} / ${maxStr}`;

        tr.innerHTML =`
          <td class="py-2.5 font-black text-emerald-400 font-mono">${code.id}</td>
          <td class="py-2.5 text-slate-300 font-bold">${code.rewardType ==='cash' ?'مالي' : code.rewardType ==='business' ?'أملاك/شركة' :'أداة'}</td>
          <td class="py-2.5 text-center text-slate-400 font-bold">${rewardDesc}</td>
          <td class="py-2.5 text-center font-bold font-mono text-slate-300">${usageText}</td>
          <td class="py-2.5 text-left">
            <button data-id="${code.id}" class="btn-admin-delete-giftcode py-1 px-3 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/20 rounded font-bold transition text-[10px]">حذف الكود</button>
          </td>`;

        const deleteBtn = tr.querySelector('.btn-admin-delete-giftcode');
        if (deleteBtn) {
          deleteBtn.addEventListener('click', async () => {
            if (!confirm(`هل أنت متأكد من حذف كود الهدية"${code.id}"؟`)) return;
            try {
              deleteBtn.disabled = true;
              deleteBtn.textContent ='جاري الحذف...';
              await AppDB.adminDeleteGiftCode(code.id);
              showToast('تم الحذف','تم حذف كود الهدية بنجاح.','info');
              logAdminAction(`حذف كود الهدية: ${code.id}`);
              fetchAndRenderAdminGiftCodes();
            } catch (err) {
              showToast('فشل الحذف', err.message,'error');
              deleteBtn.disabled = false;
              deleteBtn.textContent ='حذف الكود';
            }
          });
        }

        tbody.appendChild(tr);
      });
    } catch (e) {
      tbody.innerHTML =`<tr><td colspan="5" class="py-4 text-center text-rose-400">فشل تحميل الأكواد: ${e.message}</td></tr>`;
    }
  }

  // ─────────────────────────────────────────────
  //  V2 variables & handlers
  // ─────────────────────────────────────────────
  let lastChatSent = 0;
  let currentActiveDMUser ='';
  let mailboxActiveTab ='inbox';
  let selectedRestoreFileContent = null;
  window.employeesCache = {};

  function setupV2UIHandlers() {
    const chatTrigger = document.getElementById('btn-floating-chat-trigger');
    const closeChatDrawer = document.getElementById('btn-close-chat-drawer');
    const chatDrawer = document.getElementById('chat-drawer');
    const chatInput = document.getElementById('chat-message-input');
    const chatSendBtn = document.getElementById('btn-send-chat-message');
    const charCounter = document.getElementById('chat-char-counter');

    if (chatTrigger && chatDrawer) {
      chatTrigger.addEventListener('click', () => {
        chatDrawer.classList.toggle('chat-drawer-open');
        chatDrawer.classList.toggle('translate-x-full');
        const unreadDot = document.getElementById('chat-unread-dot');
        if (unreadDot) {
          unreadDot.classList.add('hidden');
          unreadDot.textContent ='0';
        }
        if (chatDrawer.classList.contains('chat-drawer-open')) {
          if (typeof AppDB !=='undefined' && typeof AppDB.triggerImmediateChatSync ==='function') {
            AppDB.triggerImmediateChatSync();
          }
          setTimeout(() => {
            if (chatInput) chatInput.focus();
          }, 100);
        }
      });
    }
    if (closeChatDrawer && chatDrawer) {
      closeChatDrawer.addEventListener('click', () => {
        chatDrawer.classList.remove('chat-drawer-open');
        chatDrawer.classList.add('translate-x-full');
      });
    }

    if (chatInput && charCounter) {
      chatInput.addEventListener('input', () => {
        charCounter.textContent =`${chatInput.value.length} / 200`;
      });
    }

    if (chatSendBtn && chatInput) {
      const doSendChat = async () => {
        const text = chatInput.value.trim();
        if (!text) return;

        const timeSinceLast = Date.now() - lastChatSent;
        if (timeSinceLast < 800) {
          return;
        }

        const username = GameEngine.activeUsername || (GameEngine.state && GameEngine.state.username) ||'لاعب';
        const userTitle = (GameEngine.state && GameEngine.state.title) ||'عامل مبتدئ';

        try {
          chatSendBtn.disabled = true;
          chatInput.value ='';
          if (charCounter) charCounter.textContent ='0 / 200';
          lastChatSent = Date.now();
          const isFb = Boolean(GameEngine.state && (GameEngine.state.facebookVerified || (GameEngine.state.badges && GameEngine.state.badges.includes('facebook'))));
          await AppDB.sendChatMessage(username, userTitle, text, isFb);
        } catch (err) {
          showToast('خطأ إرسال', err.message,'error');
          chatInput.value = text;
        } finally {
          chatSendBtn.disabled = false;
          setTimeout(() => {
            if (chatInput) chatInput.focus();
          }, 50);
        }
      };

      chatSendBtn.addEventListener('click', doSendChat);

      chatInput.addEventListener('keydown', (e) => {
        if (e.key ==='Enter') {
          e.preventDefault();
          doSendChat();
        }
      });
    }

    // Live Chat automatic subscription
    if (typeof AppDB.listenToChatMessages ==='function' && !window._chatListenerInitialized) {
      window._chatListenerInitialized = true;
      let lastMsgCount = 0;
      AppDB.listenToChatMessages((msgs) => {
        renderChatMessages(msgs);
        if (msgs && msgs.length > lastMsgCount && lastMsgCount > 0) {
          const chatDrawer = document.getElementById('chat-drawer');
          const unreadDot = document.getElementById('chat-unread-dot');
          if (chatDrawer && !chatDrawer.classList.contains('chat-drawer-open') && unreadDot) {
            unreadDot.classList.remove('hidden');
            const diff = msgs.length - lastMsgCount;
            unreadDot.textContent = diff > 9 ?'+9' : String(diff);
          }
        }
        lastMsgCount = msgs ? msgs.length : 0;
      });
    }

    const adminSendMsgBtn = document.getElementById('btn-admin-send-monitoring-msg');
    if (adminSendMsgBtn) {
      adminSendMsgBtn.addEventListener('click', async () => {
        try {
          adminSendMsgBtn.disabled = true;
          const msg ="️ تنبيه من الإدارة: الإدارة تراقب الشات حالياً. يرجى الالتزام بالقوانين.";
          await AppDB.sendChatMessage("الإدارة","رسمي", msg);
          showToast('تم الإرسال','تم إرسال تنبيه مراقبة الشات بنجاح.','success');
        } catch (err) {
          showToast('خطأ إرسال', err.message,'error');
        } finally {
          adminSendMsgBtn.disabled = false;
        }
      });
    }

    const btnIndustryQuick = document.getElementById('btn-open-industry-quick');
    const btnIndustryMobile = document.getElementById('btn-open-industry-mobile');
    if (btnIndustryQuick) {
      btnIndustryQuick.addEventListener('click', () => switchTab('industry'));
    }
    if (btnIndustryMobile) {
      btnIndustryMobile.addEventListener('click', () => switchTab('industry'));
    }

    const btnCloseProfile = document.getElementById('btn-close-profile-modal');
    if (btnCloseProfile) {
      btnCloseProfile.addEventListener('click', () => {
        document.getElementById('player-profile-modal').classList.add('hidden');
      });
    }

    const playerProfileModal = document.getElementById('player-profile-modal');
    if (playerProfileModal) {
      playerProfileModal.addEventListener('click', (e) => {
        if (e.target === playerProfileModal) {
          playerProfileModal.classList.add('hidden');
        }
      });
    }

    // Cashflow Breakdown Modal Listeners
    const btnCfDesktop = document.getElementById('btn-cashflow-breakdown-desktop');
    if (btnCfDesktop) {
      btnCfDesktop.addEventListener('click', openCashflowBreakdownModal);
    }
    const btnCfMobile = document.getElementById('btn-cashflow-breakdown-mobile');
    if (btnCfMobile) {
      btnCfMobile.addEventListener('click', openCashflowBreakdownModal);
    }
    const btnCloseCf = document.getElementById('btn-close-cashflow-modal');
    if (btnCloseCf) {
      btnCloseCf.addEventListener('click', closeCashflowBreakdownModal);
    }
    const btnCloseCfFooter = document.getElementById('btn-close-cashflow-modal-footer');
    if (btnCloseCfFooter) {
      btnCloseCfFooter.addEventListener('click', closeCashflowBreakdownModal);
    }
    const cfModalEl = document.getElementById('cashflow-breakdown-modal');
    if (cfModalEl) {
      cfModalEl.addEventListener('click', (e) => {
        if (e.target === cfModalEl) {
          closeCashflowBreakdownModal();
        }
      });
    }

    // Daily Quests Modal Listeners
    const btnOpenDq = document.getElementById('btn-open-daily-quests');
    if (btnOpenDq) {
      btnOpenDq.addEventListener('click', openDailyQuestsModal);
    }
    const btnCloseDq = document.getElementById('btn-close-daily-quests-modal');
    if (btnCloseDq) {
      btnCloseDq.addEventListener('click', closeDailyQuestsModal);
    }
    const btnCloseDqFooter = document.getElementById('btn-close-daily-quests-modal-footer');
    if (btnCloseDqFooter) {
      btnCloseDqFooter.addEventListener('click', closeDailyQuestsModal);
    }
    const dqModalEl = document.getElementById('daily-quests-modal');
    if (dqModalEl) {
      dqModalEl.addEventListener('click', (e) => {
        if (e.target === dqModalEl) {
          closeDailyQuestsModal();
        }
      });
    }
    const btnClaimGrandBonus = document.getElementById('btn-claim-grand-daily-bonus');
    if (btnClaimGrandBonus) {
      btnClaimGrandBonus.addEventListener('click', () => {
        try {
          const res = GameEngine.claimGrandDailyBonus();
          if (typeof playMenuSound ==='function') playMenuSound('jackpot');
          showToast('مبروك! صندوق المكافأة الكبرى',`فتحت الصندوق الأكبر وحصلت على +${res.cash.toLocaleString('ar-EG')} EGP و +${res.xp} XP!`,'success');
          renderDailyQuests();
          renderStatsBar();
          renderDashboard();
        } catch (err) {
          showToast('تنبيه', err.message,'error');
        }
      });
    }

    const btnAddFriend = document.getElementById('btn-profile-add-friend');
    const btnProfileDM = document.getElementById('btn-profile-dm');
    const btnProfileJob = document.getElementById('btn-profile-job-offer');
    const btnProfilePartnership = document.getElementById('btn-profile-partnership');
    const btnProfileBlock = document.getElementById('btn-profile-block-player');

    if (btnAddFriend) {
      btnAddFriend.addEventListener('click', async () => {
        const target = btnAddFriend.dataset.username;
        if (!target) return;
        try {
          await AppDB.sendMail(GameEngine.state.username, target,'friend_request', {});
          showToast('طلب صداقة',`تم إرسال طلب صداقة إلى ${target} بنجاح!`,'success');
        } catch (err) {
          showToast('خطأ طلب صداقة', err.message,'error');
        }
      });
    }

    if (btnProfileDM) {
      btnProfileDM.addEventListener('click', () => {
        const target = btnProfileDM.dataset.username;
        if (!target) return;
        document.getElementById('player-profile-modal').classList.add('hidden');
        mailboxModal.classList.remove('hidden');
        switchMailboxTab('dms');
        openPrivateChat(target);
      });
    }

    if (btnProfileJob) {
      btnProfileJob.addEventListener('click', () => {
        const target = btnProfileJob.dataset.username;
        if (!target) return;
        openJobOfferForm(target);
      });
    }

    if (btnProfilePartnership) {
      btnProfilePartnership.addEventListener('click', () => {
        const target = btnProfilePartnership.dataset.username;
        if (!target) return;
        openPartnershipForm(target);
      });
    }

    if (btnProfileBlock) {
      btnProfileBlock.addEventListener('click', () => {
        const target = btnProfileBlock.dataset.username;
        if (!target) return;
        GameEngine.state.blockedUsers = GameEngine.state.blockedUsers || [];
        if (GameEngine.state.blockedUsers.includes(target)) {
          GameEngine.state.blockedUsers = GameEngine.state.blockedUsers.filter(u => u !== target);
          btnProfileBlock.innerHTML ='<i class="fa-solid fa-ban"></i> <span>حظر اللاعب</span>';
          showToast('إلغاء حظر',`تم إلغاء حظر اللاعب ${target}.`,'info');
        } else {
          GameEngine.state.blockedUsers.push(target);
          btnProfileBlock.innerHTML ='<i class="fa-solid fa-ban"></i> <span class="text-rose-500">إلغاء الحظر</span>';
          showToast('حظر اللاعب',`تم حظر اللاعب ${target}. لن تظهر رسائله في الشات العام.`,'warning');
        }
        AppDB.savePlayerState(GameEngine.activeUsername, GameEngine.state);
        renderAll();
      });
    }

    const closeJobBtn = document.getElementById('btn-close-job-offer-modal');
    if (closeJobBtn) closeJobBtn.addEventListener('click', () => document.getElementById('job-offer-form-modal').classList.add('hidden'));

    const closePartBtn = document.getElementById('btn-close-partnership-modal');
    if (closePartBtn) closePartBtn.addEventListener('click', () => document.getElementById('partnership-form-modal').classList.add('hidden'));

    const submitJobBtn = document.getElementById('btn-submit-job-offer');
    if (submitJobBtn) {
      submitJobBtn.addEventListener('click', async () => {
        const target = document.getElementById('job-offer-target-username').value;
        const bizSelect = document.getElementById('job-offer-business-select');
        const roleSelect = document.getElementById('job-offer-role-select');
        const salaryInput = document.getElementById('job-offer-salary-input');

        const businessId = bizSelect.value;
        const role = roleSelect.value;
        const salary = parseInt(salaryInput.value ||'0');

        if (!businessId || !role || salary <= 0) {
          showToast('خطأ إدخال','يرجى ملء جميع حقول عقد التوظيف براتب صحيح أكبر من الصفر.','error');
          return;
        }

        try {
          const bizName = GameEngine.state.businesses[businessId].name || businessId;
          await AppDB.sendMail(GameEngine.state.username, target,'job_offer', {
            businessId,
            businessName: bizName,
            role,
            salary
          });
          document.getElementById('job-offer-form-modal').classList.add('hidden');
          showToast('عقد توظيف',`تم إرسال عرض العمل إلى ${target} بنجاح!`,'success');
        } catch (err) {
          showToast('خطأ عقد التوظيف', err.message,'error');
        }
      });
    }

    const submitPartnershipBtn = document.getElementById('btn-submit-partnership');
    if (submitPartnershipBtn) {
      submitPartnershipBtn.addEventListener('click', async () => {
        const target = document.getElementById('partnership-target-username').value;
        const bizSelect = document.getElementById('partnership-business-select');
        const shareInput = document.getElementById('partnership-share-input');

        const businessId = bizSelect.value;
        const sharePct = parseInt(shareInput.value ||'0');

        if (!businessId || sharePct <= 0 || sharePct >= 100) {
          showToast('خطأ إدخال','يرجى إدخال نسبة مئوية صحيحة بين 1% و 99%.','error');
          return;
        }

        try {
          const bizName = GameEngine.state.businesses[businessId].name || businessId;
          await AppDB.sendMail(GameEngine.state.username, target,'partnership_invite', {
            businessId,
            businessName: bizName,
            sharePct: sharePct / 100
          });
          document.getElementById('partnership-form-modal').classList.add('hidden');
          showToast('دعوة شراكة',`تم إرسال دعوة الشراكة الاستثمارية إلى ${target} بنجاح!`,'success');
        } catch (err) {
          showToast('خطأ الشراكة', err.message,'error');
        }
      });
    }

    const submitRiddleBtn = document.getElementById('btn-submit-riddle');
    if (submitRiddleBtn) {
      submitRiddleBtn.addEventListener('click', () => {
        const answerInput = document.getElementById('riddle-answer-input');
        const typedVal = parseInt(answerInput.value ||'');
        if (typedVal === window.activeRiddleAnswer) {
          GameEngine.state.lastPuzzleSolved = Date.now();
          AppDB.savePlayerState(GameEngine.activeUsername, GameEngine.state);
          document.getElementById('riddle-verification-modal').classList.add('hidden');
          showToast('تم التحقق بنجاح!','لقد أثبت وجودك البشري، تم صرف راتبك وتنشيط بونوص الشركة +30% لـ 24 ساعة القادمة.','success');
          renderAll();
        } else {
          showToast('إجابة خاطئة','المعادلة الرياضية خاطئة، يرجى المحاولة والتركيز ثانية.','error');
        }
      });
    }

    const adminDownloadSelectedBtn = document.getElementById('btn-admin-download-selected-backup');
    const adminRestoreSelectedBtn = document.getElementById('btn-admin-restore-selected-backup');
    const adminBackupsSelect = document.getElementById('admin-player-backups-select');

    if (adminDownloadSelectedBtn) {
      adminDownloadSelectedBtn.addEventListener('click', async () => {
        const targetUser = document.getElementById('admin-p-username').textContent;
        const selectedDate = adminBackupsSelect.value;
        if (!selectedDate) {
          showToast('خطأ اختيار','يرجى اختيار نسخة احتياطية أولاً.','error');
          return;
        }
        const bState = await AppDB.getPlayerBackupState(targetUser, selectedDate);
        if (bState) {
          const blob = new Blob([JSON.stringify(bState, null, 2)], { type:'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download =`backup_${targetUser}_${selectedDate}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          showToast('تم التنزيل','تم تحميل ملف النسخة الاحتياطية بنجاح.','success');
        }
      });
    }

    if (adminRestoreSelectedBtn) {
      adminRestoreSelectedBtn.addEventListener('click', async () => {
        const targetUser = document.getElementById('admin-p-username').textContent;
        const selectedDate = adminBackupsSelect.value;
        if (!selectedDate) {
          showToast('خطأ اختيار','يرجى اختيار تاريخ للنسخة الاحتياطية.','error');
          return;
        }
        if (confirm(`هل أنت متأكد من رغبتك في استعادة حساب اللاعب ${targetUser} إلى نسخة تاريخ ${selectedDate}؟ سيتم محو البيانات الحالية.`)) {
          const bState = await AppDB.getPlayerBackupState(targetUser, selectedDate);
          if (bState) {
            await AppDB.adminRestorePlayerFromState(targetUser, bState);
            showToast('تم الاسترجاع',`تمت استعادة حساب اللاعب ${targetUser} بنجاح من قاعدة البيانات.`,'success');
            const updatedState = await AppDB.getPlayerState(targetUser);
            if (updatedState) loadAdminPlayerWorkspace(updatedState);
          }
        }
      });
    }

    const fileInput = document.getElementById('admin-restore-file-input');
    const triggerFileBtn = document.getElementById('btn-trigger-file-restore');
    const uploadRestoreBtn = document.getElementById('btn-admin-upload-restore');

    if (triggerFileBtn && fileInput) {
      triggerFileBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            try {
              const parsed = JSON.parse(event.target.result);
              const targetUser = document.getElementById('admin-p-username').textContent;
              if (parsed.username !== targetUser) {
                showToast('تنبيه عدم مطابقة',`اسم اللاعب في ملف الاحتياطي (${parsed.username}) لا يطابق اللاعب الذي تقوم بفحصه حالياً (${targetUser})!`,'warning');
              }
              selectedRestoreFileContent = parsed;
              document.getElementById('restore-file-name-label').textContent = file.name;
              uploadRestoreBtn.disabled = false;
            } catch (err) {
              showToast('خطأ قراءة ملف','الملف الاحتياطي غير صالح أو معطوب.','error');
              selectedRestoreFileContent = null;
              uploadRestoreBtn.disabled = true;
            }
          };
          reader.readAsText(file);
        }
      });
    }

    if (uploadRestoreBtn) {
      uploadRestoreBtn.addEventListener('click', async () => {
        const targetUser = document.getElementById('admin-p-username').textContent;
        if (!selectedRestoreFileContent) return;
        if (confirm(`هل أنت متأكد من استيراد ورفع ملف JSON الخارجي لاستعادة حساب اللاعب ${targetUser}؟ سيتم استبدال كامل الحساب الحالي.`)) {
          try {
            await AppDB.adminRestorePlayerFromState(targetUser, selectedRestoreFileContent);
            showToast('استيراد ناجح!',`تم رفع الملف الخارجي واستعادة الحساب بالكامل لـ ${targetUser}.`,'success');
            selectedRestoreFileContent = null;
            document.getElementById('restore-file-name-label').textContent ='اختر ملف JSON الاحتياطي...';
            uploadRestoreBtn.disabled = true;
            fileInput.value ='';

            const updatedState = await AppDB.getPlayerState(targetUser);
            if (updatedState) loadAdminPlayerWorkspace(updatedState);
          } catch (err) {
            showToast('فشل الاستعادة', err.message,'error');
          }
        }
      });
    }

    const adminCreateLiveAuctionBtn = document.getElementById('btn-admin-create-live-auction');
    if (adminCreateLiveAuctionBtn) {
      adminCreateLiveAuctionBtn.addEventListener('click', async () => {
        const nameInput = document.getElementById('admin-live-auction-name');
        const typeSelect = document.getElementById('admin-live-auction-type');
        const priceInput = document.getElementById('admin-live-auction-baseprice');
        const condTypeSelect = document.getElementById('admin-live-auction-cond-type');
        const condValInput = document.getElementById('admin-live-auction-cond-value');

        const name = nameInput.value.trim();
        const type = typeSelect.value;
        const basePrice = parseInt(priceInput.value ||'0');
        const condType = condTypeSelect.value;
        const condVal = parseInt(condValInput.value ||'0');

        if (!name || basePrice <= 0 || condVal <= 0) {
          showToast('خطأ إدخال','يرجى ملء جميع تفاصيل المزاد الحي الجديد بقيم صحيحة.','error');
          return;
        }

        try {
          adminCreateLiveAuctionBtn.disabled = true;
          let startVal = condVal;
          if (condType ==='time') {
            startVal = Date.now() + (condVal * 60 * 1000);
          }

          await AppDB.adminCreateLiveAuction(type,'live_' + Math.random().toString(36).substr(2, 9), name, basePrice, condType, startVal);
          showToast('تم إطلاق المزاد الحي',`تم إدراج المزاد الحي (${name}) في السيرفر بنجاح وهو بانتظار المسجلين.`,'success');

          nameInput.value ='';
          priceInput.value ='';
          condValInput.value ='';
        } catch (err) {
          showToast('فشل المزاد', err.message,'error');
        } finally {
          adminCreateLiveAuctionBtn.disabled = false;
        }
      });
    }

    // ──────── Facebook Community Verification & Badge Claim ────────
    const fbMenuBtn = document.getElementById('btn-menu-facebook');
    const fbSidebarBtn = document.getElementById('btn-sidebar-facebook');
    const fbMobileBtn = document.getElementById('btn-mobile-facebook');

    [fbMenuBtn, fbSidebarBtn, fbMobileBtn].forEach(btn => {
      if (btn) {
        btn.addEventListener('click', (e) => {
          claimFacebookReward(e);
        });
      }
    });
  }

  // ── Facebook Official Verification & Reward Engine ──
  async function claimFacebookReward(e) {
    const s = GameEngine.state;
    if (!s) {
      showToast('يرجى بدء اللعب أولاً ️','اضغط على (متابعة اللعب) أو سجل دخولك لحسابك أولاً، ثم اضغط زر فيسبوك لتوثيق حسابك واستلام الهدية والشارة!','warning',
        5000
      );
      return;
    }

    if (s.facebookVerified) {
      showToast('حسابك موثق بالفعل','أهلاً بك مجدداً! حسابك موثق رسمياً ويحمل شارة فيسبوك الزرقاء في الشات وقائمة المتصدرين.','info'
      );
      return;
    }

    // Grant Verified Status & Badge
    s.facebookVerified = true;
    if (!Array.isArray(s.badges)) s.badges = [];
    if (!s.badges.includes('facebook')) s.badges.push('facebook');

    // Welcome Cash Bonus (100,000 EGP)
    const bonusReward = 100000;
    s.cash = (Number(s.cash) || 0) + bonusReward;
    s.netWorth = (Number(s.netWorth) || 0) + bonusReward;

    // Cloud Save immediately
    if (GameEngine.activeUsername && AppDB.savePlayerState) {
      await AppDB.savePlayerState(GameEngine.activeUsername, s, true);
    }

    if (typeof playMenuSound ==='function') playMenuSound('start');

    updateFacebookButtonUI();
    renderStatsBar();

    showToast(' تهانينا! تم توثيق حسابك بنجاح!',`أصبحت عضواً رسمياً في مجتمع اللعبة! حصلت على شارة فيسبوك الزرقاء بجانب اسمك في الشات والمتصدرين + مكافأة ${bonusReward.toLocaleString()} EGP!`,'success',
      8000
    );
  }

  function updateFacebookButtonUI() {
    const s = GameEngine.state;
    const isVerified = Boolean(s && (s.facebookVerified || (s.badges && s.badges.includes('facebook'))));

    const menuBadge = document.getElementById('badge-menu-facebook');
    if (menuBadge) {
      if (isVerified) {
        menuBadge.className ='text-[9px] px-1.5 py-0.5 rounded-full bg-blue-900/80 text-blue-300 font-bold border border-blue-500/40 shadow-sm';
        menuBadge.innerHTML ='<i class="fa-brands fa-facebook mr-0.5"></i> موثق';
      } else {
        menuBadge.className ='text-[9px] px-1.5 py-0.5 rounded-full bg-blue-600/90 text-white font-black animate-pulse shadow-sm';
        menuBadge.textContent ='وثّق حسابك';
      }
    }

    const sidebarBadge = document.getElementById('badge-sidebar-facebook');
    if (sidebarBadge) {
      if (isVerified) {
        sidebarBadge.className ='text-[9px] px-1.5 py-0.5 rounded-full bg-blue-900/80 text-blue-300 font-bold border border-blue-500/40 shadow-sm';
        sidebarBadge.innerHTML ='<i class="fa-brands fa-facebook mr-0.5"></i> موثق';
      } else {
        sidebarBadge.className ='text-[9px] px-1.5 py-0.5 rounded-full bg-blue-600 text-white font-black animate-pulse shadow-sm';
        sidebarBadge.textContent ='وثّق';
      }
    }

    const mobileBadge = document.getElementById('badge-mobile-facebook');
    if (mobileBadge) {
      if (isVerified) {
        mobileBadge.className ='w-2 h-2 rounded-full bg-blue-400';
      } else {
        mobileBadge.className ='w-2 h-2 rounded-full bg-blue-500 animate-ping';
      }
    }
  }

  function renderChatMessages(msgs) {
    const container = document.getElementById('chat-messages-container');
    if (!container) return;

    container.innerHTML ='';

    if (!msgs || msgs.length === 0) {
      container.innerHTML ='<div class="text-center text-slate-500 text-xs py-8">لا توجد رسائل سابقة. كن أول من يكتب! </div>';
      return;
    }

    const curUser = GameEngine.activeUsername || (GameEngine.state && GameEngine.state.username);
    const blocked = (GameEngine.state && GameEngine.state.blockedUsers) || [];

    msgs.forEach(msg => {
      if (blocked.includes(msg.sender)) return;

      const isSystem = msg.sender ==='الإدارة';
      const isMe = !isSystem && curUser && msg.sender === curUser;
      
      let bubbleClass = isMe ?'chat-bubble-sent' :'chat-bubble-received';
      let alignClass = isMe ?'text-left flex flex-col items-end' :'text-right flex flex-col items-start';
      
      if (isSystem) {
        bubbleClass ='bg-red-950/40 border border-red-500/30 text-red-200 w-full text-center py-2 px-3 rounded-xl shadow-lg shadow-red-950/20';
        alignClass ='text-center flex flex-col items-center w-full';
      }

      const timeStr = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }) :'';

      const msgDiv = document.createElement('div');
      msgDiv.className =`w-full flex flex-col ${alignClass}`;
      
      const safeSender = String(msg.sender ||'لاعب').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]);
      const safeTitle = String(msg.senderTitle ||'مبتدئ').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]);
      const safeMsg = String(msg.message ||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]);

      if (isSystem) {
        msgDiv.innerHTML =`
          <div class="flex items-center gap-1 mb-1 justify-center">
            <span class="text-[9px] text-slate-500 font-bold">${timeStr}</span>
            <span class="text-[10px] font-black text-red-400"><i class="fa-solid fa-shield-halved text-[9px] mr-1"></i>${safeSender}</span>
            <span class="text-[8px] px-1 bg-red-950 border border-red-800 rounded-md text-red-300 font-bold">${safeTitle}</span>
          </div>
          <div class="chat-message-bubble ${bubbleClass}">
            ${safeMsg}
          </div>`;
      } else {
        const isMyMsg = curUser && msg.sender === curUser;
        const isSenderVerifiedInLeaderboard = Boolean((cachedLeaderboard || window.cachedLeaderboard) && Array.isArray(cachedLeaderboard || window.cachedLeaderboard) && (cachedLeaderboard || window.cachedLeaderboard).some(p => p.username === msg.sender && p.facebookVerified));
        const hasFb = Boolean(msg.facebookVerified || msg.isFbVerified || isSenderVerifiedInLeaderboard || (isMyMsg && GameEngine.state && (GameEngine.state.facebookVerified || (GameEngine.state.badges && GameEngine.state.badges.includes('facebook')))));
        const fbIconHtml = hasFb ?'<span class="fb-vip-badge" title="عضو موثق في مجتمع فيسبوك">f</span>' :'';
        msgDiv.innerHTML =`
          <div class="flex items-center gap-1.5 mb-0.5">
            <span class="text-[9px] text-slate-500 font-bold">${timeStr}</span>
            <span class="text-[10px] font-bold text-yellow-400 cursor-pointer hover:underline inline-flex items-center gap-1" onclick="window.UI.openPlayerProfileCard('${safeSender}')">
              <span>${safeSender}</span>
              ${fbIconHtml}
            </span>
            <span class="text-[8px] px-1 bg-slate-900 border border-slate-800 rounded-md text-slate-400">${safeTitle}</span>
          </div>
          <div class="chat-message-bubble ${bubbleClass}">
            ${safeMsg}
          </div>`;
      }
      container.appendChild(msgDiv);
    });

    container.scrollTop = container.scrollHeight;
  }

  let _currentMailboxFilter ='all';

  function renderMailbox(mails) {
    window.lastMailsCache = mails || [];
    const inboxPanel = document.getElementById('mailbox-inbox-panel');
    const unreadBadge = document.getElementById('mailbox-unread-badge');
    const unreadBadgeMobile = document.getElementById('mailbox-unread-badge-mobile');
    const counterEl = document.getElementById('modal-mailbox-counter');

    let pendingCount = 0;
    const allRequests = (mails || []).filter(m => m.type !=='dm');

    allRequests.forEach(m => {
      if (m.status ==='pending' || m.status ==='unread') pendingCount++;
    });

    if (unreadBadge) {
      unreadBadge.textContent = pendingCount;
      unreadBadge.classList.toggle('hidden', pendingCount === 0);
    }
    if (unreadBadgeMobile) {
      unreadBadgeMobile.textContent = pendingCount;
      unreadBadgeMobile.classList.toggle('hidden', pendingCount === 0);
    }
    if (counterEl) {
      counterEl.textContent =`${pendingCount} جديد`;
    }

    if (!inboxPanel) return;
    inboxPanel.innerHTML ='';

    processInboxSystemMessages(mails);

    // Apply Filter
    let filteredList = allRequests;
    if (_currentMailboxFilter ==='topup') {
      filteredList = allRequests.filter(m => m.type ==='topup_receipt' || (m.payload && m.payload.topupDetails));
    } else if (_currentMailboxFilter ==='system') {
      filteredList = allRequests.filter(m => m.type ==='system_announcement' || m.type ==='system_notification' || m.sender ==='SYSTEM' || m.sender ==='SYSTEM_ACQUISITION' || m.sender ==='SYSTEM_DIVIDEND');
    } else if (_currentMailboxFilter ==='requests') {
      filteredList = allRequests.filter(m => ['friend_request','job_offer','partnership_invite','transfer_request','transfer_received'].includes(m.type));
    }

    if (filteredList.length === 0) {
      inboxPanel.innerHTML =`
        <div class="p-8 text-center text-slate-500 text-xs">
          <i class="fa-solid fa-envelope-open text-2xl mb-2 text-slate-600 block"></i>
          <span>لا توجد رسائل أو إشعارات في هذا القسم حالياً.</span>
        </div>`;
      return;
    }

    filteredList.forEach(mail => {
      const isUnread = (mail.status ==='pending' || mail.status ==='unread');
      const mailDiv = document.createElement('div');
      
      const mailTime = Number(mail.timestamp || mail.created_at || Date.now());
      const timeStr = new Date(mailTime).toLocaleString('ar-EG', {
        month:'numeric',
        day:'numeric',
        hour:'2-digit',
        minute:'2-digit'
      });

      // 1. Top-up Receipt Card
      if (mail.type ==='topup_receipt' || (mail.payload && mail.payload.topupDetails)) {
        const details = (mail.payload && mail.payload.topupDetails) || {};
        const isApproved = (details.status ==='approved');

        if (isApproved) {
          // Render Approved Receipt
          const itemsObj = details.items || {};
          let itemsListHtml ='';
          const itemKeys = Object.keys(itemsObj);
          if (itemKeys.length > 0) {
            const chips = itemKeys.map(k => {
              const count = itemsObj[k];
              const itemDef = (typeof INVENTORY_ITEM_CATALOG !=='undefined' && INVENTORY_ITEM_CATALOG[k]) || (GameEngine.STORE_ITEMS && GameEngine.STORE_ITEMS[k]);
              const name = itemDef ? itemDef.name : k;
              return`<span class="px-2 py-0.5 rounded-lg bg-yellow-500/15 border border-yellow-500/30 text-yellow-300 font-bold text-[10px]">${name} (x${count})</span>`;
            }).join('');
            itemsListHtml =`
              <div class="pt-2 border-t border-slate-800/80">
                <span class="text-[10px] text-slate-400 font-bold block mb-1"> المقتنيات والأدوات المضافة لحقيبتك:</span>
                <div class="flex flex-wrap gap-1.5">${chips}</div>
              </div>`;
          }

          mailDiv.className =`p-4 rounded-2xl border ${isUnread ?'bg-gradient-to-r from-amber-500/10 via-slate-900/90 to-emerald-950/20 border-amber-500/50 shadow-lg shadow-amber-500/5' :'bg-slate-900/40 border-slate-800'} text-xs text-slate-200 space-y-3`;
          mailDiv.innerHTML =`
            <div class="flex justify-between items-center border-b border-slate-800/80 pb-2.5">
              <div class="flex items-center gap-2">
                <div class="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center text-xs font-black">
                  
                </div>
                <div>
                  <h4 class="font-black text-amber-300 text-xs sm:text-sm">إيصال اعتماد شحن [${details.packageName ||'باقة شحن'}]</h4>
                  <span class="text-[10px] text-emerald-400 font-bold">معتمد ومودع بحسابك بنجاح </span>
                </div>
              </div>
              <span class="text-[10px] text-slate-400 numbers-font font-bold">${timeStr}</span>
            </div>

            <p class="text-xs text-slate-300 leading-relaxed">${mail.payload.message ||'تم اعتماد تحويلك بنجاح وإيداع كافة مزايا الباقة بحسابك.'}</p>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pt-1">
              <div class="p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                <span class="text-[10px] text-slate-400 block font-bold">المبلغ المدفوع</span>
                <span class="text-xs font-black text-white numbers-font">${(Number(details.price) || 0).toLocaleString()} ج.م</span>
              </div>
              <div class="p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                <span class="text-[10px] text-slate-400 block font-bold">كاش مضاف</span>
                <span class="text-xs font-black text-yellow-400 numbers-font">+${(Number(details.cash) || 0).toLocaleString()}</span>
              </div>
              <div class="p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                <span class="text-[10px] text-slate-400 block font-bold">إيداع بالبنك</span>
                <span class="text-xs font-black text-emerald-400 numbers-font">+${(Number(details.bank) || 0).toLocaleString()}</span>
              </div>
              <div class="p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                <span class="text-[10px] text-slate-400 block font-bold">نقاط خبرة XP</span>
                <span class="text-xs font-black text-sky-400 numbers-font">+${(Number(details.xp) || 0).toLocaleString()}</span>
              </div>
            </div>

            ${itemsListHtml}

            ${details.reviewerNote ?`<div class="p-2 bg-slate-950/60 rounded-xl border border-slate-800 text-[10px] text-slate-400"><strong class="text-slate-300">ملاحظة الإدارة:</strong> ${details.reviewerNote}</div>` :''}

            <div class="flex justify-between items-center pt-1 border-t border-slate-800/60">
              <span class="text-[10px] text-slate-500">رقم الوصل: <span class="font-mono text-slate-400">${details.receiptNumber ||'معتمد آلياً'}</span></span>
              <button onclick="window.UI.deleteMail('${mail.id}')" class="text-[10px] text-rose-400 hover:underline cursor-pointer">
                <i class="fa-solid fa-trash mr-1"></i> حذف الإيصال
              </button>
            </div>`;
        } else {
          // Render Rejected Notice
          mailDiv.className =`p-4 rounded-2xl border ${isUnread ?'bg-rose-950/20 border-rose-500/50' :'bg-slate-900/40 border-slate-800'} text-xs text-slate-200 space-y-3`;
          mailDiv.innerHTML =`
            <div class="flex justify-between items-center border-b border-slate-800/80 pb-2">
              <div class="flex items-center gap-2">
                <div class="w-7 h-7 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center text-xs font-black">
                  ️
                </div>
                <div>
                  <h4 class="font-black text-rose-300 text-xs sm:text-sm">تعذر اعتماد طلب شحن [${details.packageName ||'باقة شحن'}]</h4>
                  <span class="text-[10px] text-rose-400 font-bold">تم رفض الطلب </span>
                </div>
              </div>
              <span class="text-[10px] text-slate-400 numbers-font font-bold">${timeStr}</span>
            </div>

            <div class="p-3 bg-rose-950/30 border border-rose-500/20 rounded-xl text-xs text-slate-300 leading-relaxed">
              <strong class="text-rose-300 block mb-1">سبب تعذر الاعتماد:</strong>
              ${details.reviewerNote || mail.payload.message ||'بيانات التحويل غير مطابقة أو لم يتم العثور على الإشعار.'}
            </div>

            <div class="flex justify-between items-center pt-1 border-t border-slate-800/60">
              <button onclick="window.UI.openTopupModal()" class="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 rounded-lg text-amber-300 text-[10px] font-bold transition">
                إعادة المحاولة من المتجر
              </button>
              <button onclick="window.UI.deleteMail('${mail.id}')" class="text-[10px] text-rose-400 hover:underline cursor-pointer">
                <i class="fa-solid fa-trash mr-1"></i> حذف الإشعار
              </button>
            </div>`;
        }

        inboxPanel.appendChild(mailDiv);
        return;
      }

      // 2. System Announcement Card
      if (mail.type ==='system_announcement' || mail.type ==='system_notification') {
        const title = (mail.payload && mail.payload.title) ||'إشعار من إدارة رأس المال';
        const message = (mail.payload && mail.payload.message) ||'';
        
        mailDiv.className =`p-4 rounded-2xl border ${isUnread ?'bg-slate-900/80 border-sky-500/40' :'bg-slate-900/30 border-slate-800'} text-xs text-slate-200 space-y-3`;
        mailDiv.innerHTML =`
          <div class="flex justify-between items-center border-b border-slate-800/80 pb-2">
            <div class="flex items-center gap-2">
              <div class="w-7 h-7 rounded-lg bg-sky-500/20 border border-sky-500/40 text-sky-400 flex items-center justify-center text-xs font-black">
                
              </div>
              <h4 class="font-black text-sky-300 text-xs sm:text-sm">${title}</h4>
            </div>
            <span class="text-[10px] text-slate-400 numbers-font font-bold">${timeStr}</span>
          </div>
          <p class="text-xs text-slate-300 leading-relaxed whitespace-pre-line">${message}</p>
          <div class="flex justify-end items-center pt-1 border-t border-slate-800/60">
            <button onclick="window.UI.deleteMail('${mail.id}')" class="text-[10px] text-rose-400 hover:underline cursor-pointer">
              <i class="fa-solid fa-trash mr-1"></i> حذف الرسالة
            </button>
          </div>`;
        inboxPanel.appendChild(mailDiv);
        return;
      }

      // 3. Interactive Social / Wire / Job Requests
      mailDiv.className =`p-4 rounded-xl border ${isUnread ?'bg-slate-900/60 border-emerald-500/20' :'bg-slate-900/20 border-slate-800'} text-xs text-slate-300 space-y-3`;

      let contentHtml ='';
      let actionsHtml ='';
      const isActionPending = isUnread;

      if (mail.type ==='friend_request') {
        contentHtml =`يريد اللاعب <strong class="text-white cursor-pointer hover:underline" onclick="window.UI.openPlayerProfileCard('${mail.sender}')">${mail.sender}</strong> إضافتك كصديق في اللعبة.`;
        if (isActionPending) {
          actionsHtml =`
            <div class="flex gap-2">
              <button onclick="window.UI.handleMailAction('${mail.id}','friend_accept')" class="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg font-black transition">قبول الصداقة</button>
              <button onclick="window.UI.handleMailAction('${mail.id}','reject')" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg transition">رفض</button>
            </div>`;
        } else if (mail.status ==='accepted') {
          actionsHtml =`<span class="text-[10px] text-emerald-400 font-bold">تم قبول الصداقة </span>`;
        } else {
          actionsHtml =`<span class="text-[10px] text-rose-400 font-bold">تم الرفض </span>`;
        }
      } else if (mail.type ==='job_offer') {
        contentHtml =`يعرض عليك اللاعب <strong class="text-white cursor-pointer hover:underline" onclick="window.UI.openPlayerProfileCard('${mail.sender}')">${mail.sender}</strong> العمل كمساعد في شركته: (<span class="text-sky-400 font-bold">${mail.payload && mail.payload.businessName ? mail.payload.businessName :'مشروع'}</span>) براتب دوري قدره <strong class="text-yellow-500 numbers-font font-bold">${(mail.payload && mail.payload.salary ? mail.payload.salary : 0).toLocaleString()} EGP</strong> لكل ثانية عمل.`;
        if (isActionPending) {
          actionsHtml =`
            <div class="flex gap-2">
              <button onclick="window.UI.handleMailAction('${mail.id}','job_accept')" class="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg font-black transition">قبول عقد العمل</button>
              <button onclick="window.UI.handleMailAction('${mail.id}','reject')" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg transition">رفض</button>
            </div>`;
        } else if (mail.status ==='accepted') {
          actionsHtml =`<span class="text-[10px] text-emerald-400 font-bold">تم قبول عقد العمل </span>`;
        } else {
          actionsHtml =`<span class="text-[10px] text-rose-400 font-bold">تم الرفض </span>`;
        }
      } else if (mail.type ==='partnership_invite') {
        const pct = Math.round(((mail.payload && mail.payload.sharePct) || 0) * 100);
        contentHtml =`يدعوك اللاعب <strong class="text-white cursor-pointer hover:underline" onclick="window.UI.openPlayerProfileCard('${mail.sender}')">${mail.sender}</strong> لتكون شريكاً استثمارياً مساهماً في شركته: (<span class="text-emerald-400 font-bold">${mail.payload && mail.payload.businessName ? mail.payload.businessName :'مشروع'}</span>) مقابل نسبة توزيع أرباح قدرها <strong class="text-emerald-400 font-bold">${pct}%</strong> من صافي العائد.`;
        if (isActionPending) {
          actionsHtml =`
            <div class="flex gap-2">
              <button onclick="window.UI.handleMailAction('${mail.id}','partnership_accept')" class="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg font-black transition">قبول الشراكة</button>
              <button onclick="window.UI.handleMailAction('${mail.id}','reject')" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg transition">رفض</button>
            </div>`;
        } else if (mail.status ==='accepted') {
          actionsHtml =`<span class="text-[10px] text-emerald-400 font-bold">تم قبول الشراكة </span>`;
        } else {
          actionsHtml =`<span class="text-[10px] text-rose-400 font-bold">تم الرفض </span>`;
        }
      } else if (mail.type ==='transfer_request') {
        const amt = Number(mail.payload && mail.payload.amount ? mail.payload.amount : 0);
        contentHtml =`
          <div class="space-y-1.5">
            <div class="text-slate-200">
              يطلب منك اللاعب <strong class="text-white cursor-pointer hover:underline" onclick="window.UI.openPlayerProfileCard('${mail.sender}')">${mail.sender}</strong> تحويل مبلغ مالي كاش قدره: <strong class="text-yellow-400 font-black numbers-font text-sm">${amt.toLocaleString()} EGP</strong>.
            </div>
          </div>`;
        if (isActionPending) {
          actionsHtml =`
            <div class="flex gap-2">
              <button onclick="window.UI.handleMailAction('${mail.id}','transfer_request_accept')" class="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg font-black transition">قبول ودفع المبلغ</button>
              <button onclick="window.UI.handleMailAction('${mail.id}','transfer_request_reject')" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg transition">رفض</button>
            </div>`;
        } else if (mail.status ==='accepted') {
          actionsHtml =`<span class="text-[10px] text-emerald-400 font-bold">تم قبول ودفع الطلب بنجاح </span>`;
        } else {
          actionsHtml =`<span class="text-[10px] text-rose-400 font-bold">تم رفض الطلب </span>`;
        }
      } else if (mail.type ==='transfer_received') {
        const amt = Number(mail.payload && mail.payload.amount ? mail.payload.amount : 0);
        contentHtml =`
          <div class="space-y-1">
            <div class="text-slate-200">
              وصلتك حوالة مالية بقيمة <strong class="text-emerald-400 font-black numbers-font text-sm">+${amt.toLocaleString()} EGP</strong> من اللاعب <strong class="text-white hover:underline cursor-pointer" onclick="window.UI.openPlayerProfileCard('${mail.sender}')">${mail.sender}</strong>.
            </div>
            <div class="text-[11px] text-emerald-400/90 flex items-center gap-1.5 font-medium pt-0.5">
              <i class="fa-solid fa-circle-check text-xs"></i> تم إيداع المبلغ بنجاح في كاشك.
            </div>
          </div>`;
        actionsHtml =`
          <button onclick="window.switchTab('bank')" class="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-[11px] font-bold transition flex items-center gap-1">
            <i class="fa-solid fa-building-columns"></i> فتح البنك
          </button>`;
      }

      const badgeText = mail.type ==='friend_request' ?'طلب صداقة' :
                        mail.type ==='job_offer' ?'عقد عمل' :
                        mail.type ==='partnership_invite' ?'دعوة شراكة' :
                        mail.type ==='transfer_request' ?'طلب تحويل أموال' :
                        mail.type ==='transfer_received' ?'حوالة بنكية' :'رسالة';

      mailDiv.innerHTML =`
        <div class="flex justify-between items-center border-b border-slate-800/80 pb-2">
          <span class="text-[10px] text-slate-500 font-bold numbers-font">${timeStr}</span>
          <span class="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[9px] text-slate-400 font-bold">${badgeText}</span>
        </div>
        <div>${contentHtml}</div>
        <div class="flex justify-between items-center pt-1">
          ${actionsHtml}
          <button onclick="window.UI.deleteMail('${mail.id}')" class="text-[10px] text-rose-400 hover:underline cursor-pointer"><i class="fa-solid fa-trash mr-1"></i> حذف الرسالة</button>
        </div>`;
      inboxPanel.appendChild(mailDiv);
    });

    renderDMsConversationList(mails);
  }

  function renderDMsConversationList(mails) {
    const container = document.getElementById('dm-friends-list');
    if (!container) return;
    container.innerHTML ='';

    const chats = {};
    const dms = mails.filter(m => m.type ==='dm');

    if (GameEngine.state.friends) {
      GameEngine.state.friends.forEach(f => {
        chats[f] = { username: f, lastMsg:'اضغط لبدء المحادثة الخاصة...', timestamp: 0 };
      });
    }

    dms.forEach(m => {
      const partner = m.sender === GameEngine.state.username ? m.recipient : m.sender;
      if (!chats[partner] || m.timestamp > chats[partner].timestamp) {
        chats[partner] = {
          username: partner,
          lastMsg: m.payload.message,
          timestamp: m.timestamp
        };
      }
    });

    const list = Object.values(chats);
    if (list.length === 0) {
      container.innerHTML ='<div class="text-[10px] text-slate-500 text-center py-6">قم بإضافة أصدقاء لبدء دردشة خاصة.</div>';
    } else {
      list.forEach(c => {
        const item = document.createElement('div');
        item.className =`p-2.5 rounded-lg border ${currentActiveDMUser === c.username ?'bg-emerald-500/10 border-emerald-500/30' :'bg-slate-900/40 border-slate-900'} cursor-pointer hover:bg-slate-800/40 transition`;
        item.innerHTML =`
          <div class="flex justify-between items-center mb-0.5">
            <span class="font-bold text-white text-xs truncate">${c.username}</span>
          </div>
          <p class="text-[9px] text-slate-400 truncate">${c.lastMsg}</p>`;
        item.addEventListener('click', () => openPrivateChat(c.username));
        container.appendChild(item);
      });
    }
  }

  function openPrivateChat() {}
  function switchMailboxTab() {}

  // --- Real-Time Live Cashflow Breakdown & Projections Modal ---
  function renderCashflowBreakdown() {
    if (!GameEngine || !GameEngine.getDetailedCashflowBreakdown) return;
    const breakdown = GameEngine.getDetailedCashflowBreakdown();
    if (!breakdown) return;

    // 1. Time Projections Cards
    const secEl = document.getElementById('cf-proj-sec');
    const minEl = document.getElementById('cf-proj-min');
    const hourEl = document.getElementById('cf-proj-hour');
    const dayEl = document.getElementById('cf-proj-day');
    const totalNetEl = document.getElementById('cf-modal-total-net');

    if (secEl) secEl.textContent =`+${(breakdown.totalNetPerHour / 3600).toFixed(2)} EGP`;
    if (minEl) minEl.textContent =`+${Math.round(breakdown.totalNetPerHour / 60).toLocaleString()} EGP`;
    if (hourEl) hourEl.textContent =`+${Math.round(breakdown.totalNetPerHour).toLocaleString()} EGP`;
    if (dayEl) dayEl.textContent =`+${Math.round(breakdown.totalNetPerHour * 24).toLocaleString()} EGP`;
    if (totalNetEl) totalNetEl.textContent =`+${Math.round(breakdown.totalNetPerHour).toLocaleString()}`;

    // 2. Businesses Section
    const bizSubtotalEl = document.getElementById('cf-subtotal-businesses');
    const bizListEl = document.getElementById('cf-list-businesses');
    if (bizListEl) {
      let bizTotal = 0;
      if (breakdown.businesses.length === 0) {
        bizListEl.innerHTML =`<div class="text-[11px] text-slate-500 py-1">لا توجد مشاريع نشطة حالياً. يمكنك تأسيس مشاريعك الحرة من قسم الأعمال لجني تدفقات ضخمة!</div>`;
      } else {
        let html ='';
        breakdown.businesses.forEach(b => {
          const pVal = Number(b.profitPerHour !== undefined ? b.profitPerHour : b.profitPerSec);
          bizTotal += pVal;
          const badges = [];
          if (b.isFranchise) badges.push('<span class="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30">علامة تجارية +25%</span>');
          if (b.marketingActive) badges.push('<span class="text-[9px] bg-yellow-500/20 text-yellow-300 px-1.5 py-0.5 rounded border border-yellow-500/30">ترويج نشط +40%</span>');
          if (b.synergyMultiplier > 1) badges.push(`<span class="text-[9px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-500/30">سلاسل إمداد x${b.synergyMultiplier}</span>`);
          if (b.employeeBoost > 1) badges.push(`<span class="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/30">موظفين x${b.employeeBoost.toFixed(1)}</span>`);

          html +=`
            <div class="flex justify-between items-center bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
              <div>
                <div class="font-bold text-white flex items-center gap-1.5">
                  <span>${b.name}</span>
                  <span class="text-[10px] text-slate-400 font-normal">(مستوى ${b.level} • ${b.workers} عمال)</span>
                </div>
                <div class="flex gap-1 flex-wrap mt-1">${badges.join('')}</div>
              </div>
              <span class="numbers-font font-black text-emerald-400 text-xs sm:text-sm">+${pVal.toLocaleString()} EGP/س</span>
            </div>`;
        });
        bizListEl.innerHTML = html;
      }
      if (bizSubtotalEl) bizSubtotalEl.textContent =`+${bizTotal.toLocaleString()} EGP/س`;
    }

    // 3. Real Estate Assets Section
    const assetSubtotalEl = document.getElementById('cf-subtotal-assets');
    const assetListEl = document.getElementById('cf-list-assets');
    if (assetListEl) {
      let assetTotal = 0;
      if (breakdown.assets.length === 0) {
        assetListEl.innerHTML =`<div class="text-[11px] text-slate-500 py-1">لا توجد عقارات مؤجرة حالياً. اشترِ العقارات لجني إيجارات لحظية مستقرة تنمي ثروتك!</div>`;
      } else {
        let html ='';
        breakdown.assets.forEach(a => {
          const rVal = Number(a.rentPerHour !== undefined ? a.rentPerHour : a.rentPerSec);
          assetTotal += rVal;
          html +=`
            <div class="flex justify-between items-center bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
              <div class="text-white font-bold">
                <span>${a.name}</span>
                <span class="text-[10px] text-slate-400 font-normal block">(${a.count} وحدات • +${Number(a.rentPerUnit || 0).toLocaleString()} EGP/س للوحدة)</span>
              </div>
              <span class="numbers-font font-black text-emerald-400 text-xs sm:text-sm">+${rVal.toLocaleString()} EGP/س</span>
            </div>`;
        });
        assetListEl.innerHTML = html;
      }
      if (assetSubtotalEl) assetSubtotalEl.textContent =`+${assetTotal.toLocaleString()} EGP/س`;
    }

    // 4. Rented Cars Section
    const carsSubtotalEl = document.getElementById('cf-subtotal-cars');
    const carsListEl = document.getElementById('cf-list-cars');
    if (carsListEl) {
      let carsTotal = 0;
      if (breakdown.cars.length === 0) {
        carsListEl.innerHTML =`<div class="text-[11px] text-slate-500 py-1">لا توجد سيارات بحالة الإيجار. اشترِ سيارات فارهة وقم بتأجيرها من قسم الأصول!</div>`;
      } else {
        let html ='';
        breakdown.cars.forEach(c => {
          const cVal = Number(c.netProfitPerHour !== undefined ? c.netProfitPerHour : c.netProfitPerSec);
          carsTotal += cVal;
          html +=`
            <div class="flex justify-between items-center bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
              <div>
                <span class="text-white font-bold">${c.name}</span>
                <span class="text-[10px] text-slate-400 block">(إيجار: +${c.grossRent.toLocaleString()} • صيانة: -${c.maintenance.toLocaleString()})</span>
              </div>
              <span class="numbers-font font-black text-emerald-400 text-xs sm:text-sm">+${cVal.toLocaleString()} EGP/س</span>
            </div>`;
        });
        carsListEl.innerHTML = html;
      }
      if (carsSubtotalEl) carsSubtotalEl.textContent =`+${carsTotal.toLocaleString()} EGP/س`;
    }

    // 5. Bank Interest Section
    const bankSubtotalEl = document.getElementById('cf-subtotal-bank');
    const bankListEl = document.getElementById('cf-list-bank');
    if (bankListEl) {
      const b = breakdown.bank;
      const bankVal = Number(b.profitPerHour !== undefined ? b.profitPerHour : b.profitPerSec);
      if (bankSubtotalEl) bankSubtotalEl.textContent =`+${bankVal.toLocaleString()} EGP/س`;
      const rollsBadge = b.hasRollsBonus ?' <span class="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30 font-bold">+5% بونص رولز رويس</span>' :'';
      bankListEl.innerHTML =`
        <div class="flex justify-between items-center bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
          <div>
            <span class="text-white font-bold">عائد الفائدة المركبة على الودائع</span>
            <span class="text-[10px] text-slate-400 block">رصيد الوديعة: ${b.balance.toLocaleString()} EGP • النسبة: 0.015%/س${rollsBadge} (سقف اليوم: ${Number(b.dailyEarned || 0).toLocaleString()} / 250,000 EGP)</span>
          </div>
          <span class="numbers-font font-black text-emerald-400 text-xs sm:text-sm">+${bankVal.toLocaleString()} EGP/س</span>
        </div>`;
    }

    // 6. Joint Corporation Section
    const corpSection = document.getElementById('cf-section-corp');
    const corpSubtotalEl = document.getElementById('cf-subtotal-corp');
    const corpListEl = document.getElementById('cf-list-corp');
    if (corpSection && corpListEl) {
      if (breakdown.corp.active) {
        corpSection.classList.remove('hidden');
        const corpVal = Number(breakdown.corp.profitPerHour !== undefined ? breakdown.corp.profitPerHour : breakdown.corp.profitPerSec);
        if (corpSubtotalEl) corpSubtotalEl.textContent =`+${corpVal.toLocaleString()} EGP/س`;
        corpListEl.innerHTML =`
          <div class="flex justify-between items-center bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
            <div>
              <span class="text-white font-bold">${breakdown.corp.name}</span>
              <span class="text-[10px] text-slate-400 block">مستوى ${breakdown.corp.level} • حصة المساهمة الشخصية: ${breakdown.corp.sharePct}%</span>
            </div>
            <span class="numbers-font font-black text-purple-400 text-xs sm:text-sm">+${corpVal.toLocaleString()} EGP/س</span>
          </div>`;
      } else {
        corpSection.classList.add('hidden');
      }
    }

    // 7. Hired Job Section
    const hiredSection = document.getElementById('cf-section-hired');
    const hiredSubtotalEl = document.getElementById('cf-subtotal-hired');
    const hiredListEl = document.getElementById('cf-list-hired');
    if (hiredSection && hiredListEl) {
      if (breakdown.hiredJob.active) {
        hiredSection.classList.remove('hidden');
        const hiredVal = Number(breakdown.hiredJob.salaryPerHour !== undefined ? breakdown.hiredJob.salaryPerHour : breakdown.hiredJob.salaryPerSec);
        if (hiredSubtotalEl) hiredSubtotalEl.textContent =`+${hiredVal.toLocaleString()} EGP/س`;
        hiredListEl.innerHTML =`
          <div class="flex justify-between items-center bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
            <div>
              <span class="text-white font-bold">${breakdown.hiredJob.name}</span>
              <span class="text-[10px] text-slate-400 block">عقد موثق • تم حل اللغز اليومي بنجاح</span>
            </div>
            <span class="numbers-font font-black text-blue-400 text-xs sm:text-sm">+${hiredVal.toLocaleString()} EGP/س</span>
          </div>`;
      } else {
        hiredSection.classList.add('hidden');
      }
    }

    // 8. Wealth Tax Section
    const taxSubtotalEl = document.getElementById('cf-subtotal-tax');
    const taxListEl = document.getElementById('cf-list-tax');
    if (taxListEl) {
      if (breakdown.tax.active) {
        const taxVal = Number(breakdown.tax.taxPerHour !== undefined ? breakdown.tax.taxPerHour : breakdown.tax.taxPerSec);
        if (taxSubtotalEl) taxSubtotalEl.textContent =`-${taxVal.toLocaleString()} EGP/س`;
        taxListEl.innerHTML =`
          <div class="flex justify-between items-center bg-rose-950/20 p-2.5 rounded-xl border border-rose-900/40">
            <div>
              <span class="text-rose-400 font-bold">ضريبة الثروة الدورية (5M+ EGP)</span>
              <span class="text-[10px] text-slate-400 block">تُخصم دورياً للحسابات ذات الثروات والسيولة العالية</span>
            </div>
            <span class="numbers-font font-black text-rose-400 text-xs sm:text-sm">-${taxVal.toLocaleString()} EGP/س</span>
          </div>`;
      } else {
        if (taxSubtotalEl) taxSubtotalEl.textContent ='0 EGP/س (معفي)';
        taxListEl.innerHTML =`
          <div class="text-[11px] text-emerald-400/90 bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-900/30 flex items-center gap-1.5">
            <i class="fa-solid fa-shield-halved text-emerald-400 text-xs"></i>
            <span>${breakdown.tax.exemptReason ||'لا توجد ضرائب مطبقة حالياً.'}</span>
          </div>`;
      }
    }
  }

  function openCashflowBreakdownModal() {
    renderCashflowBreakdown();
    const modal = document.getElementById('cashflow-breakdown-modal');
    if (modal) {
      modal.classList.remove('hidden');
      if (typeof playMenuSound ==='function') playMenuSound('click');
    }
  }

  function closeCashflowBreakdownModal() {
    const modal = document.getElementById('cashflow-breakdown-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  // --- Daily Quests System Rendering & Handlers ---
  function openDailyQuestsModal() {
    renderDailyQuests();
    const modal = document.getElementById('daily-quests-modal');
    if (modal) {
      modal.classList.remove('hidden');
      if (typeof playMenuSound ==='function') playMenuSound('click');
    }
  }

  function closeDailyQuestsModal() {
    const modal = document.getElementById('daily-quests-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  function formatCountdownHMS(totalSec) {
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return`${hours.toString().padStart(2,'0')}:${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;
  }

  function renderDailyQuests() {
    if (!GameEngine || !GameEngine.state) return;
    if (typeof GameEngine.ensureDailyQuests ==='function') {
      GameEngine.ensureDailyQuests();
    }
    const dq = GameEngine.state.dailyQuests;
    if (!dq || !Array.isArray(dq.quests)) return;

    const remainingSec = typeof GameEngine.getDailyResetRemainingSeconds ==='function'
      ? GameEngine.getDailyResetRemainingSeconds()
      : 0;
    const formattedTimer = formatCountdownHMS(remainingSec);

    const completedCount = dq.quests.filter(q => q.completed).length;
    const claimedCount = dq.quests.filter(q => q.claimed).length;
    const totalCount = dq.quests.length;
    const allClaimed = claimedCount === totalCount;
    const grandBonusClaimed = Boolean(dq.grandBonusClaimed);

    // 1. Update Dashboard Banner
    const badgeTextEl = document.getElementById('daily-quests-badge-text');
    const badgeEl = document.getElementById('daily-quests-badge');
    const bannerProgressBar = document.getElementById('daily-quests-progress-bar');
    const bannerCountdown = document.getElementById('daily-quests-countdown');

    if (badgeTextEl) {
      if (grandBonusClaimed) {
        badgeTextEl.textContent ='تم إكمال كافة المهام والصندوق!';
      } else if (allClaimed) {
        badgeTextEl.textContent ='الصندوق جاهز للفتح!';
      } else {
        badgeTextEl.textContent =`${claimedCount} / ${totalCount} مستلمة (${completedCount} جاهزة)`;
      }
    }

    if (badgeEl) {
      if (grandBonusClaimed) {
        badgeEl.className ='text-[10px] px-2.5 py-0.5 rounded-full font-black border bg-emerald-500/20 text-emerald-300 border-emerald-500/30 flex items-center gap-1';
      } else if (allClaimed) {
        badgeEl.className ='text-[10px] px-2.5 py-0.5 rounded-full font-black border bg-yellow-500/20 text-yellow-300 border-yellow-500/30 flex items-center gap-1 animate-pulse';
      } else {
        badgeEl.className ='text-[10px] px-2.5 py-0.5 rounded-full font-black border bg-amber-500/20 text-amber-300 border-amber-500/30 flex items-center gap-1';
      }
    }

    if (bannerProgressBar) {
      const pct = Math.round((claimedCount / totalCount) * 100);
      bannerProgressBar.style.width =`${pct}%`;
      if (grandBonusClaimed) {
        bannerProgressBar.className ='bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-500';
      } else {
        bannerProgressBar.className ='bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 h-full transition-all duration-500';
      }
    }

    if (bannerCountdown) {
      bannerCountdown.textContent =`تتجدد خلال ${formattedTimer}`;
    }

    // 2. Update Modal Elements (if modal is open or present)
    const modalTimer = document.getElementById('daily-modal-timer');
    if (modalTimer) modalTimer.textContent = formattedTimer;

    const modalProgressCount = document.getElementById('daily-modal-progress-count');
    if (modalProgressCount) {
      modalProgressCount.textContent =`${claimedCount} / ${totalCount}`;
    }

    // 3. Render Quest Items in Modal
    const questsListEl = document.getElementById('daily-quests-list');
    if (questsListEl) {
      questsListEl.innerHTML = dq.quests.map(q => {
        const pct = Math.min(100, Math.round(((q.progress || 0) / (q.target || 1)) * 100));
        let actionButtonHtml ='';

        if (q.claimed) {
          actionButtonHtml =`
            <div class="px-3 py-1.5 rounded-xl bg-slate-900 border border-emerald-500/30 text-emerald-400 font-bold text-[11px] flex items-center gap-1.5 shrink-0">
              <i class="fa-solid fa-circle-check text-emerald-400"></i>
              <span>مستلمة </span>
            </div>`;
        } else if (q.completed) {
          actionButtonHtml =`
            <button type="button" data-quest-id="${q.id}" class="btn-claim-daily-quest px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black rounded-xl text-[11px] shadow-lg shadow-amber-500/20 transition transform hover:scale-105 active:scale-95 flex items-center gap-1.5 shrink-0 cursor-pointer animate-pulse">
              <i class="fa-solid fa-gift"></i>
              <span>استلام الجائزة</span>
            </button>`;
        } else {
          actionButtonHtml =`
            <div class="px-3 py-1.5 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-400 font-medium text-[11px] flex items-center gap-1 shrink-0">
              <span class="numbers-font">${q.progress || 0} / ${q.target}</span>
            </div>`;
        }

        return`
          <div class="p-3 bg-slate-900/70 border ${q.completed && !q.claimed ?'border-amber-500/50 bg-amber-950/20' :'border-slate-800'} rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition">
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <div class="w-10 h-10 rounded-xl ${q.claimed ?'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : (q.completed ?'bg-amber-500/20 text-amber-400 border border-amber-500/40' :'bg-slate-800 text-slate-400')} flex items-center justify-center shrink-0">
                <i class="fa-solid ${q.icon ||'fa-star'} text-sm"></i>
              </div>
              <div class="min-w-0 flex-1 space-y-1">
                <div class="flex items-center gap-2 flex-wrap">
                  <h5 class="text-xs font-bold text-white truncate">${q.title}</h5>
                  <span class="text-[10px] text-amber-400 font-black numbers-font bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                    +${(q.cashReward || 0).toLocaleString()} EGP
                  </span>
                  <span class="text-[10px] text-sky-400 font-black numbers-font bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
                    +${q.xpReward || 0} XP
                  </span>
                </div>
                <p class="text-[11px] text-slate-400 leading-tight">${q.desc}</p>
                <div class="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800/80 mt-1">
                  <div class="${q.completed ?'bg-emerald-400' :'bg-amber-400'} h-full transition-all duration-300" style="width: ${pct}%"></div>
                </div>
              </div>
            </div>
            <div class="w-full sm:w-auto flex justify-end">
              ${actionButtonHtml}
            </div>
          </div>`;
      }).join('');

      // Attach claim listeners to buttons
      questsListEl.querySelectorAll('.btn-claim-daily-quest').forEach(btn => {
        btn.onclick = () => {
          const qId = btn.dataset.questId;
          try {
            const res = GameEngine.claimDailyQuestReward(qId);
            if (typeof playMenuSound ==='function') playMenuSound('cash');
            showToast('تم استلام المكافأة!',`حصلت على +${res.cash.toLocaleString('ar-EG')} EGP و +${res.xp} XP بنجاح!`,'success');
            renderDailyQuests();
            renderStatsBar();
            renderDashboard();
          } catch (err) {
            showToast('تنبيه', err.message,'error');
          }
        };
      });
    }

    // 4. Update Grand Chest Card
    const sampleQ = dq.quests[0];
    const grandCash = (sampleQ ? sampleQ.cashReward : 1000) * 3;
    const grandXP = (sampleQ ? sampleQ.xpReward : 25) * 3;

    const grandCashEl = document.getElementById('daily-grand-cash-preview');
    if (grandCashEl) grandCashEl.textContent =` +${grandCash.toLocaleString()} EGP`;

    const grandXpEl = document.getElementById('daily-grand-xp-preview');
    if (grandXpEl) grandXpEl.textContent =`⭐ +${grandXP} XP`;

    const btnGrandEl = document.getElementById('btn-claim-grand-daily-bonus');
    const btnGrandText = document.getElementById('btn-claim-grand-text');
    const grandChestCard = document.getElementById('daily-grand-chest-card');

    if (btnGrandEl) {
      if (grandBonusClaimed) {
        btnGrandEl.disabled = true;
        btnGrandEl.className ='w-full py-2.5 px-4 bg-slate-800 text-slate-400 font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-not-allowed';
        if (btnGrandText) btnGrandText.textContent ='تم استلام صندوق المكافأة الكبرى لليوم';
        if (grandChestCard) grandChestCard.className ='p-4 rounded-2xl border border-emerald-500/30 bg-slate-900/60 text-center space-y-2.5 relative overflow-hidden';
      } else if (allClaimed) {
        btnGrandEl.disabled = false;
        btnGrandEl.className ='w-full py-3 px-4 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400 hover:from-yellow-300 hover:to-amber-400 text-slate-950 font-black rounded-xl text-xs transition duration-200 shadow-xl shadow-yellow-500/30 flex items-center justify-center gap-2 cursor-pointer transform hover:scale-[1.02] active:scale-[0.98] animate-bounce';
        if (btnGrandText) btnGrandText.textContent ='افتح الصندوق الأكبر الآن واستلم الجائزة!';
        if (grandChestCard) grandChestCard.className ='p-4 rounded-2xl border-2 border-amber-400 bg-gradient-to-b from-amber-950/40 via-yellow-950/20 to-slate-950 text-center space-y-2.5 relative overflow-hidden shadow-xl shadow-amber-500/10';
      } else {
        btnGrandEl.disabled = true;
        btnGrandEl.className ='w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black rounded-xl text-xs opacity-40 cursor-not-allowed flex items-center justify-center gap-2';
        if (btnGrandText) btnGrandText.textContent =`افتح الصندوق الأكبر (المتبقي: ${totalCount - claimedCount} مهام)`;
        if (grandChestCard) grandChestCard.className ='p-4 rounded-2xl border-2 border-dashed border-amber-500/40 bg-gradient-to-b from-amber-950/30 via-slate-900 to-slate-950 text-center space-y-2.5 relative overflow-hidden';
      }
    }
  }

  const profileCache = new Map();

  async function openPlayerProfileCard(username) {
    if (!username) return;
    try {
      let pState;
      const now = Date.now();
      const cached = profileCache.get(username);
      if (cached && (now - cached.timestamp < 20000)) {
        pState = cached.data;
      } else {
        pState = await AppDB.adminGetPlayer(username);
        if (pState) {
          profileCache.set(username, { data: pState, timestamp: now });
        }
      }

      if (!pState) {
        showToast('خطأ بروفايل','الملف التعريفي للاعب غير موجود.','error');
        return;
      }

      const hasFbVerified = Boolean(pState.facebookVerified === true || (pState.state && pState.state.facebookVerified) || (pState.badges && pState.badges.includes('facebook')));
      const uCardEl = document.getElementById('profile-card-username');
      if (uCardEl) {
        const fbIconHtml = hasFbVerified ?' <span class="fb-vip-badge" title="عضو موثق في مجتمع فيسبوك">f</span>' :'';
        uCardEl.innerHTML = (pState.username ||'---') + fbIconHtml;
      }
      document.getElementById('profile-card-title').textContent = pState.title ||'عامل مبتدئ';
      const pwEl = document.getElementById('profile-card-networth');
      if (pwEl) {
        const nw = pState.netWorth || 0;
        if (nw >= 1000000) {
          pwEl.innerHTML =`<span class="break-all">${nw.toLocaleString()} EGP</span> <span class="text-xs text-yellow-400 font-bold ml-1 bg-yellow-500/10 px-2 py-0.5 rounded-lg border border-yellow-500/20 inline-block numbers-font">(${formatCompactNumber(nw)})</span>`;
        } else {
          pwEl.textContent =`${nw.toLocaleString()} EGP`;
        }
      }
      document.getElementById('profile-card-reputation').textContent =`${(pState.underworldRep || 0).toLocaleString()} ⭐`;
      document.getElementById('profile-card-createdat').textContent = pState.createdAt ? new Date(pState.createdAt).toLocaleDateString() :'غير معروف';

      const jobConfig = GameEngine.JOBS && GameEngine.JOBS[pState.jobId];
      const jobName = jobConfig ? jobConfig.name : (pState.jobId ||'عامل باليومية');
      document.getElementById('profile-card-job').textContent = jobName;

      // Populate Season Honors & Badges
      const badgesListEl = document.getElementById('profile-card-badges-list');
      if (badgesListEl) {
        badgesListEl.innerHTML ='';

        let badgeCount = 0;

        if (hasFbVerified) {
          badgeCount++;
          const fbBadge = document.createElement('div');
          fbBadge.className ='flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-950/80 border-2 border-blue-500 text-blue-300 text-xs font-black shadow-md shadow-blue-950/60';
          fbBadge.innerHTML ='<span class="fb-vip-badge">f</span><span>متابع رسمي لصفحة اللعبة على فيسبوك </span>';
          badgesListEl.appendChild(fbBadge);
        }

        const titleStr = pState.title ||'';
        const hasDiamond = pState.s1Badge ==='diamond' || titleStr.includes('مستثمر ألماسي') || titleStr.includes('ألماسي');
        const hasGold = pState.s1Badge ==='gold' || titleStr.includes('مستثمر ذهبي') || titleStr.includes('ذهبي');
        const hasBronze = pState.s1Badge ==='bronze' || titleStr.includes('مستثمر برونزي') || titleStr.includes('برونزي');
        const hasVeteran = pState.s1Veteran || pState.s1Badge ==='veteran' || titleStr.includes('مستثمر مخضرم') || titleStr.includes('مخضرم');

        if (hasDiamond) {
          badgeCount++;
          const dBadge = document.createElement('div');
          dBadge.className ='flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-950/80 border-2 border-cyan-400 text-cyan-300 text-xs font-black shadow-md shadow-cyan-950/60';
          dBadge.innerHTML ='<i class="fa-solid fa-gem text-cyan-300 text-sm"></i><span>وسام مستثمر ألماسي (بطل S1 #1)</span>';
          badgesListEl.appendChild(dBadge);
        }

        if (hasGold) {
          badgeCount++;
          const gBadge = document.createElement('div');
          gBadge.className ='flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-950/80 border-2 border-yellow-400 text-yellow-300 text-xs font-black shadow-md shadow-amber-950/60';
          gBadge.innerHTML ='<i class="fa-solid fa-crown text-yellow-300 text-sm"></i><span>وسام مستثمر ذهبي (وصيف S1 #2)</span>';
          badgesListEl.appendChild(gBadge);
        }

        if (hasBronze) {
          badgeCount++;
          const bBadge = document.createElement('div');
          bBadge.className ='flex items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-950/80 border-2 border-orange-500 text-amber-300 text-xs font-black shadow-md shadow-orange-950/60';
          bBadge.innerHTML ='<i class="fa-solid fa-award text-amber-300 text-sm"></i><span>وسام مستثمر برونزي (برونزية S1 #3)</span>';
          badgesListEl.appendChild(bBadge);
        }

        if (hasVeteran) {
          badgeCount++;
          const vBadge = document.createElement('div');
          vBadge.className ='flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-950/80 border-2 border-purple-400 text-purple-300 text-xs font-black shadow-md shadow-purple-950/60';
          vBadge.innerHTML ='<i class="fa-solid fa-certificate text-purple-300 text-sm"></i><span>وسام مستثمر مخضرم S1 (نخبة التوب 25)</span>';
          badgesListEl.appendChild(vBadge);
        }

        if (badgeCount === 0) {
          badgesListEl.innerHTML ='<div class="text-[11px] text-slate-500 py-1 flex items-center gap-1.5"><i class="fa-solid fa-circle-info text-[10px]"></i><span>لم يحصل هذا الحساب على أوسمة مواسم حتى الآن. شارك في الموسم الثاني للمنافسة!</span></div>';
        }

        // Dynamic Avatar styling according to honors
        const avatarBox = document.getElementById('profile-card-avatar-box');
        const avatarIcon = document.getElementById('profile-card-avatar-icon');
        if (avatarBox && avatarIcon) {
          if (hasDiamond) {
            avatarBox.className ='w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 via-sky-500 to-blue-600 border-2 border-cyan-200 flex items-center justify-center text-slate-950 shadow-lg shadow-cyan-500/40 shrink-0';
            avatarIcon.className ='fa-solid fa-gem text-2xl';
          } else if (hasGold) {
            avatarBox.className ='w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-600 border-2 border-yellow-200 flex items-center justify-center text-slate-950 shadow-lg shadow-yellow-500/40 shrink-0';
            avatarIcon.className ='fa-solid fa-crown text-2xl';
          } else if (hasBronze) {
            avatarBox.className ='w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-600 via-orange-600 to-amber-800 border-2 border-amber-400 flex items-center justify-center text-amber-100 shadow-lg shadow-orange-900/40 shrink-0';
            avatarIcon.className ='fa-solid fa-award text-2xl';
          } else if (hasVeteran) {
            avatarBox.className ='w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 via-indigo-600 to-purple-800 border-2 border-purple-400 flex items-center justify-center text-purple-100 shadow-lg shadow-purple-900/40 shrink-0';
            avatarIcon.className ='fa-solid fa-certificate text-2xl';
          } else {
            avatarBox.className ='w-14 h-14 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400 shrink-0';
            avatarIcon.className ='fa-solid fa-user text-2xl';
          }
        }
      }

      const summaryContainer = document.getElementById('profile-card-assets-summary');
      summaryContainer.innerHTML ='';

      let bizList = [];
      if (pState.businesses) {
        Object.keys(pState.businesses).forEach(k => {
          const biz = pState.businesses[k];
          if (biz && biz.level > 0) {
            const config = GameEngine.BUSINESSES && GameEngine.BUSINESSES[k];
            const bizName = config ? config.name : k;
            bizList.push(`${bizName} (مستوى ${biz.level})`);
          }
        });
      }

      let assetList = [];
      if (pState.assets) {
        Object.keys(pState.assets).forEach(k => {
          const qty = pState.assets[k] || 0;
          if (qty > 0) {
            const config = GameEngine.ASSETS && GameEngine.ASSETS[k];
            const assetName = config ? config.name : k;
            assetList.push(`${assetName} (عدد: ${qty})`);
          }
        });
      }

      const p1 = document.createElement('div');
      p1.className ='mb-2';
      p1.innerHTML =`<span class="text-slate-400"> المشاريع التجارية:</span><div class="pl-2 mt-1 text-white font-bold">${bizList.length > 0 ? bizList.map(b =>`• ${b}`).join('<br>') :'لا توجد مشاريع نشطة'}</div>`;
      summaryContainer.appendChild(p1);

      const p2 = document.createElement('div');
      p2.innerHTML =`<span class="text-slate-400"> العقارات والأصول:</span><div class="pl-2 mt-1 text-white font-bold">${assetList.length > 0 ? assetList.map(a =>`• ${a}`).join('<br>') :'لا توجد عقارات مملوكة'}</div>`;
      summaryContainer.appendChild(p2);

      const isMe = pState.username === GameEngine.state.username;

      const btnAddFriend = document.getElementById('btn-profile-add-friend');
      const btnProfileJob = document.getElementById('btn-profile-job-offer');
      const btnProfilePartnership = document.getElementById('btn-profile-partnership');
      const btnProfileBlock = document.getElementById('btn-profile-block-player');

      if (isMe) {
        if (btnAddFriend) btnAddFriend.classList.add('hidden');
        if (btnProfileJob) btnProfileJob.classList.add('hidden');
        if (btnProfilePartnership) btnProfilePartnership.classList.add('hidden');
        if (btnProfileBlock) btnProfileBlock.classList.add('hidden');
      } else {
        if (btnAddFriend) {
          btnAddFriend.classList.remove('hidden');
          btnAddFriend.dataset.username = username;
          if (GameEngine.state.friends && GameEngine.state.friends.includes(username)) {
            btnAddFriend.disabled = true;
            btnAddFriend.innerHTML ='<i class="fa-solid fa-check"></i> <span>صديق بالفعل</span>';
          } else {
            btnAddFriend.disabled = false;
            btnAddFriend.innerHTML ='<i class="fa-solid fa-user-plus"></i> <span>إضافة صديق</span>';
          }
        }
        if (btnProfileJob) {
          btnProfileJob.classList.remove('hidden');
          btnProfileJob.dataset.username = username;
        }
        if (btnProfilePartnership) {
          btnProfilePartnership.classList.remove('hidden');
          btnProfilePartnership.dataset.username = username;
        }
        if (btnProfileBlock) {
          btnProfileBlock.classList.remove('hidden');
          btnProfileBlock.dataset.username = username;
          if (GameEngine.state.blockedUsers && GameEngine.state.blockedUsers.includes(username)) {
            btnProfileBlock.innerHTML ='<i class="fa-solid fa-ban"></i> <span class="text-rose-500">إلغاء الحظر</span>';
          } else {
            btnProfileBlock.innerHTML ='<i class="fa-solid fa-ban"></i> <span>حظر اللاعب</span>';
          }
        }
      }

      const isOnline = pState.lastSeen && (Date.now() - pState.lastSeen < 120000);
      const onlineBadge = document.getElementById('profile-card-online-badge');
      if (onlineBadge) {
        if (isOnline) {
          onlineBadge.innerHTML ='<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block ml-1"></span> متصل الآن';
          onlineBadge.className ='px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/20 text-emerald-400 text-[9px]';
        } else {
          onlineBadge.innerHTML ='<span class="w-1.5 h-1.5 rounded-full bg-slate-500 inline-block ml-1"></span> غير متصل';
          onlineBadge.className ='px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 text-[9px] border border-slate-800';
        }
      }

      document.getElementById('player-profile-modal').classList.remove('hidden');

      if (!isMe && typeof firebase !=='undefined' && AppDB.isFirebaseReady) {
        firebase.firestore().collection('players').doc(username).get()
          .then(doc => {
            if (doc.exists) {
              window.employeesCache[username] = doc.data();
            }
          }).catch(() => {});
      }
    } catch (err) {
      showToast('خطأ بروفايل', err.message,'error');
    }
  }

  async function handleMailAction(mailId, action) {
    try {
      const mailDoc = (window.lastMailsCache || []).find(m => m.id === mailId);
      if (!mailDoc) return;

      if (action ==='friend_accept') {
        GameEngine.state.friends = GameEngine.state.friends || [];
        if (!GameEngine.state.friends.includes(mailDoc.sender)) {
          GameEngine.state.friends.push(mailDoc.sender);
        }
        await AppDB.savePlayerState(GameEngine.activeUsername, GameEngine.state);
        await AppDB.updateMailStatus(mailId,'accepted');
        showToast('تم قبول الصداقة',`أنت واللاعب ${mailDoc.sender} أصدقاء الآن!`,'success');

        await AppDB.sendMail(GameEngine.state.username, mailDoc.sender,'dm', { message:'مرحباً بك! لقد قبلت طلب الصداقة، يمكننا الآن التنسيق في الصفقات والشراكات.' });
        await AppDB.sendMail(GameEngine.state.username, mailDoc.sender,'system_add_friend', { friend: GameEngine.state.username });
      } else if (action ==='job_accept') {
        GameEngine.state.hiredJob = {
          employer: mailDoc.sender,
          businessId: mailDoc.payload.businessId,
          businessName: mailDoc.payload.businessName,
          role: mailDoc.payload.role,
          salary: mailDoc.payload.salary
        };
        GameEngine.state.lastPuzzleSolved = Date.now();

        await AppDB.savePlayerState(GameEngine.activeUsername, GameEngine.state);
        await AppDB.updateMailStatus(mailId,'accepted');
        showToast('تم التوظيف!',`لقد التحقت بالعمل لدى ${mailDoc.sender} براتب دوري قدره ${mailDoc.payload.salary} EGP!`,'success');

        await AppDB.sendMail(GameEngine.state.username, mailDoc.sender,'dm', { message:`مرحباً! لقد قبلت عرض التوظيف في شركتك (${mailDoc.payload.businessName}). بدأت في العمل الآن.` });

        await AppDB.sendMail(GameEngine.state.username, mailDoc.sender,'system_add_employee', {
          employee: GameEngine.state.username,
          businessId: mailDoc.payload.businessId,
          role: mailDoc.payload.role,
          salary: mailDoc.payload.salary
        });
      } else if (action ==='partnership_accept') {
        GameEngine.state.partnerships = GameEngine.state.partnerships || [];
        GameEngine.state.partnerships.push({
          employer: mailDoc.sender,
          businessId: mailDoc.payload.businessId,
          businessName: mailDoc.payload.businessName,
          sharePct: mailDoc.payload.sharePct
        });
        await AppDB.savePlayerState(GameEngine.activeUsername, GameEngine.state);
        await AppDB.updateMailStatus(mailId,'accepted');
        showToast('شراكة معتمدة!',`أصبحت شريكاً رسمياً بنسبة ${Math.round(mailDoc.payload.sharePct * 100)}% من عوائد المشروع!`,'success');

        await AppDB.sendMail(GameEngine.state.username, mailDoc.sender,'dm', { message:`مرحباً شريكي! لقد قبلت دعوة الشراكة الاستثمارية في المشروع. لنعمل على تنمية الأرباح.` });

        await AppDB.sendMail(GameEngine.state.username, mailDoc.sender,'system_add_partner', {
          partner: GameEngine.state.username,
          businessId: mailDoc.payload.businessId,
          sharePct: mailDoc.payload.sharePct
        });
      } else if (action ==='transfer_request_accept') {
        const reqId = mailDoc.payload && mailDoc.payload.requestId;
        const amt = Number((mailDoc.payload && mailDoc.payload.amount) || 0);

        // Auto top-up cash from bank if needed
        const curCash = Number(GameEngine.state.cash) || 0;
        const curBank = Number(GameEngine.state.bank) || 0;
        if (curCash < amt) {
          const diff = amt - curCash;
          if (curBank >= diff) {
            GameEngine.state.bank -= diff;
            GameEngine.state.cash += diff;
            await AppDB.savePlayerState(GameEngine.activeUsername, GameEngine.state, true);
          } else {
            throw new Error(`رصيدك الإجمالي (كاش + بنك) غير كافٍ لسداد هذا المبلغ.`);
          }
        }

        if (reqId) {
          await AppDB.acceptTransferRequest(reqId, GameEngine.activeUsername);
        }
        await AppDB.updateMailStatus(mailId,'accepted');
        showToast('تم السداد',`تم قبول طلب التحويل ودفع مبلغ ${amt.toLocaleString()} EGP بنجاح!`,'success');

        const updatedState = await AppDB.getPlayerState(GameEngine.activeUsername);
        if (updatedState) {
          GameEngine.state.cash = updatedState.cash;
          GameEngine.state.bank = updatedState.bank;
          GameEngine.state.netWorth = updatedState.netWorth;
        }
        if (typeof fetchAndRenderTransferRequests ==='function') {
          fetchAndRenderTransferRequests(true);
        }
        if (typeof loadTransferHistory ==='function') {
          loadTransferHistory(true);
        }
      } else if (action ==='transfer_request_reject') {
        const reqId = mailDoc.payload && mailDoc.payload.requestId;
        if (reqId) {
          await AppDB.rejectTransferRequest(reqId, GameEngine.activeUsername);
        }
        await AppDB.updateMailStatus(mailId,'rejected');
        showToast('رفض الطلب','تم رفض طلب التحويل بنجاح.','info');
        if (typeof fetchAndRenderTransferRequests ==='function') {
          fetchAndRenderTransferRequests(true);
        }
      } else if (action ==='reject') {
        await AppDB.updateMailStatus(mailId,'rejected');
        showToast('تم الرفض','تم رفض الطلب بنجاح.','info');
      }
      renderAll();
    } catch (err) {
      showToast('فشل العملية', err.message,'error');
    }
  }

  function deleteMail(mailId) {
    if (confirm('هل أنت متأكد من رغبتك في حذف هذه الرسالة نهائياً؟')) {
      AppDB.deleteMail(mailId);
      showToast('حذف الرسالة','تم مسح الرسالة من صندوق الوارد.','info');
    }
  }

  function openJobOfferForm(username) {
    const select = document.getElementById('job-offer-business-select');
    if (!select) return;

    select.innerHTML ='';
    let hasBiz = false;

    if (GameEngine.state.businesses) {
      Object.keys(GameEngine.state.businesses).forEach(k => {
        const biz = GameEngine.state.businesses[k];
        if (biz.level > 0) {
          hasBiz = true;
          const opt = document.createElement('option');
          opt.value = k;
          opt.textContent =`${biz.name || k} (المستوى ${biz.level})`;
          select.appendChild(opt);
        }
      });
    }

    if (!hasBiz) {
      showToast('لا تملك شركات','يجب أن تملك مشروعاً تجارياً واحداً على الأقل لتوظيف لاعبين آخرين.','error');
      return;
    }

    document.getElementById('job-offer-target-username').value = username;
    document.getElementById('job-offer-form-modal').classList.remove('hidden');
    document.getElementById('player-profile-modal').classList.add('hidden');
  }

  function openPartnershipForm(username) {
    const select = document.getElementById('partnership-business-select');
    if (!select) return;

    select.innerHTML ='';
    let hasBiz = false;

    if (GameEngine.state.businesses) {
      Object.keys(GameEngine.state.businesses).forEach(k => {
        const biz = GameEngine.state.businesses[k];
        if (biz.level > 0) {
          hasBiz = true;
          const opt = document.createElement('option');
          opt.value = k;
          opt.textContent =`${biz.name || k} (المستوى ${biz.level})`;
          select.appendChild(opt);
        }
      });
    }

    if (!hasBiz) {
      showToast('لا تملك شركات','يجب أن تملك مشروعاً تجارياً واحداً على الأقل لإرسال دعوات الشراكة.','error');
      return;
    }

    document.getElementById('partnership-target-username').value = username;
    document.getElementById('partnership-form-modal').classList.remove('hidden');
    document.getElementById('player-profile-modal').classList.add('hidden');
  }

  function checkAndOpenRiddleVerification() {
    if (!GameEngine.state.hiredJob) return;

    const lastSolved = GameEngine.state.lastPuzzleSolved || 0;
    const timeElapsed = Date.now() - lastSolved;

    if (timeElapsed >= 86400000) {
      const numA = Math.floor(Math.random() * 40) + 10;
      const numB = Math.floor(Math.random() * 40) + 10;
      window.activeRiddleAnswer = numA + numB;

      document.getElementById('riddle-equation-text').textContent =`${numA} + ${numB} = ?`;
      document.getElementById('riddle-answer-input').value ='';
      document.getElementById('riddle-verification-modal').classList.remove('hidden');
    }
  }

  async function checkAndStartAuction(auc) {
    if (auc.status !=='pending') return;
    let shouldStart = false;
    const condVal = Number(auc.startConditionValue) || 0;
    if (auc.startConditionType ==='players') {
      const regCount = auc.registeredPlayers ? auc.registeredPlayers.length : 0;
      if (regCount >= condVal && condVal > 0) {
        shouldStart = true;
      }
    } else if (auc.startConditionType ==='time') {
      if (Date.now() >= condVal && condVal > 0) {
        shouldStart = true;
      }
    }

    if (shouldStart) {
      if (window.activeAuctionStartLock && window.activeAuctionStartLock[auc.id]) return;
      if (!window.activeAuctionStartLock) window.activeAuctionStartLock = {};
      window.activeAuctionStartLock[auc.id] = true;

      try {
        if (typeof firebase !=='undefined' && AppDB.isFirebaseReady) {
          const db = firebase.firestore();
          await db.collection('liveAuctions').doc(auc.id).update({
            status:'active',
            timerResetTimestamp: Date.now() + 30000
          });
          console.log(`[Auction] Activated auction ${auc.id}`);
        }
      } catch (err) {
        console.error('[Auction] Activation failed:', err);
      } finally {
        delete window.activeAuctionStartLock[auc.id];
      }
    }
  }

  function renderLiveAuctions(list) {
    const shelf = document.getElementById('live-auctions-shelf');
    if (!shelf) return;

    // Save current user bid inputs to prevent resetting them on redraw
    const savedInputs = {};
    list.forEach(auc => {
      const inputEl = document.getElementById(`bid-input-${auc.id}`);
      if (inputEl) {
        savedInputs[auc.id] = inputEl.value;
      }
    });

    shelf.innerHTML ='';
    const active = list.filter(auc => auc.status !=='ended');

    if (active.length === 0) {
      shelf.innerHTML =`<div class="col-span-full text-center text-slate-500 text-xs py-8">${window.currentLang ==='en' ?'No live auctions currently available. Please wait for the admin to launch one.' :'لا توجد مزادات حية متاحة حالياً. يرجى الانتظار لطرح مزاد جديد من قبل الإدارة.'}</div>`;
      return;
    }

    active.forEach(auc => {
      const card = document.createElement('div');
      card.className ='p-5 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4 flex flex-col justify-between';

      const isRegistered = auc.registeredPlayers && auc.registeredPlayers.includes(GameEngine.state.username);

      let badgeHtml ='';
      let actionBtnHtml ='';
      let timerHtml ='';

      const translatedItemName = window.currentLang ==='en' ? (translationDict[auc.itemName] || auc.itemName) : auc.itemName;

      if (auc.status ==='pending') {
        badgeHtml =`<span class="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] text-slate-400">${window.currentLang ==='en' ?'Registration Phase' :'مرحلة التسجيل'}</span>`;

        let condText ='';
        if (auc.startConditionType ==='players') {
          condText = window.currentLang ==='en'
            ?`Auction starts once <strong>${auc.startConditionValue} players</strong> register (Registered: ${auc.registeredPlayers ? auc.registeredPlayers.length : 0})`
            :`يبدأ المزاد بمجرد تسجيل <strong>${auc.startConditionValue} لاعبين</strong> (المسجلون الآن: ${auc.registeredPlayers ? auc.registeredPlayers.length : 0})`;
        } else {
          const diff = Math.max(0, Math.ceil((auc.startConditionValue - Date.now()) / 60000));
          condText = window.currentLang ==='en'
            ?`Auction starts automatically in <strong>${diff} minutes</strong>`
            :`يبدأ المزاد تلقائياً بعد مرور <strong>${diff} دقيقة</strong>`;
        }

        actionBtnHtml = isRegistered
          ?`<button class="w-full py-2 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl text-xs font-bold" disabled>${window.currentLang ==='en' ?'You are registered' :'أنت مسجل في المزاد بالفعل'}</button>`
          :`<button onclick="window.UI.registerForAuction('${auc.id}')" class="w-full py-2 bg-yellow-500 hover:bg-yellow-400 text-slate-950 rounded-xl text-xs font-black transition">${window.currentLang ==='en' ?'Register for Auction' :'تسجيل للمشاركة في المزاد'}</button>`;

        timerHtml =`<div class="text-[10px] text-slate-400 text-center">${condText}</div>`;
      } else if (auc.status ==='active') {
        badgeHtml =`<span class="px-2 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/20 text-[10px] text-yellow-400 font-bold animate-pulse">${window.currentLang ==='en' ?'Active Live Bidding' :'مزايدة نشطة حية'}</span>`;

        const remSecs = Math.max(0, Math.ceil((auc.timerResetTimestamp - Date.now()) / 1000));

        if (remSecs === 0 && auc.timerResetTimestamp > 0) {
          triggerEndAuction(auc.id);
        }

        timerHtml =`
          <div class="flex justify-between items-center bg-slate-950/80 p-2.5 rounded-xl border border-slate-900">
            <span class="text-[10px] text-slate-400">${window.currentLang ==='en' ?'Time Remaining:' :'الوقت المتبقي للمزايدة:'}</span>
            <span class="numbers-font font-black text-rose-500 text-base animate-pulse">${remSecs} ${window.currentLang ==='en' ?'seconds' :'ثانية'}</span>
          </div>`;

        if (!isRegistered) {
          actionBtnHtml =`<button class="w-full py-2 bg-slate-900 border border-slate-800 text-slate-500 rounded-xl text-xs font-bold" disabled>${window.currentLang ==='en' ?'Not pre-registered' :'لم تقم بالتسجيل المسبق'}</button>`;
        } else {
          const nextMinBid = Math.floor(auc.currentBid * 1.05);
          const savedVal = savedInputs[auc.id];
          const valToUse = savedVal !== undefined ? savedVal : nextMinBid;
          actionBtnHtml =`
            <div class="flex gap-2">
              <input type="number" id="bid-input-${auc.id}" min="${nextMinBid}" value="${valToUse}" class="w-2/3 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-black text-white text-center">
              <button onclick="window.UI.placeAuctionBid('${auc.id}')" class="flex-1 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 rounded-xl text-xs font-black transition">${window.currentLang ==='en' ?'Bid' :'زايد'}</button>
            </div>`;
        }
      }

      card.innerHTML =`
        <div class="flex justify-between items-start border-b border-slate-800 pb-3">
          <div>
            <h4 class="font-black text-white text-sm">${translatedItemName}</h4>
            <span class="text-[10px] text-slate-400">${auc.itemType ==='property' ? (window.currentLang ==='en' ?'Financial Property' :'عقار مالي') : auc.itemType ==='business' ? (window.currentLang ==='en' ?'Commercial Business' :'مشروع تجاري') : (window.currentLang ==='en' ?'Collectible Item' :'غرض مقتنيات')}</span>
          </div>
          ${badgeHtml}
        </div>
        <div class="grid grid-cols-2 gap-3 py-2 text-xs">
          <div class="p-2 bg-slate-950/40 rounded-xl border border-slate-900">
            <span class="text-[9px] text-slate-400 block mb-0.5">${window.currentLang ==='en' ?'Base Price:' :'السعر الابتدائي:'}</span>
            <span class="numbers-font font-bold text-slate-300">${auc.basePrice.toLocaleString()} EGP</span>
          </div>
          <div class="p-2 bg-slate-950/40 rounded-xl border border-slate-900">
            <span class="text-[9px] text-slate-400 block mb-0.5">${window.currentLang ==='en' ?'Highest Bid:' :'أعلى عرض حالي:'}</span>
            <span class="numbers-font font-black text-yellow-500">${auc.currentBid.toLocaleString()} EGP</span>
          </div>
        </div>
        <div class="text-[10px] text-slate-400">
          <span>${window.currentLang ==='en' ?'Current Highest Bidder:' :'أعلى مزايد الآن:'} <strong class="text-white">${auc.highestBidder || (window.currentLang ==='en' ?'None' :'لا يوجد')}</strong></span>
        </div>
        ${timerHtml}
        ${actionBtnHtml}`;
      shelf.appendChild(card);
    });
  }

  async function registerForAuction(auctionId) {
    try {
      await AppDB.registerForAuction(auctionId, GameEngine.state.username);
      showToast('تم التسجيل بنجاح','تم تسجيل اسمك للمزايدة الحية بنجاح.','success');
    } catch (err) {
      showToast('فشل التسجيل', err.message,'error');
    }
  }

  async function placeAuctionBid(auctionId) {
    const input = document.getElementById(`bid-input-${auctionId}`);
    if (!input) return;
    const val = parseInt(input.value ||'0');
    if (val <= 0) return;

    // Check if player has enough money
    if (GameEngine.state.cash < val && GameEngine.state.bank < val) {
      showToast('رصيد غير كافي','لا تملك رصيداً كافياً لتقديم هذا العرض.','error');
      return;
    }

    try {
      await AppDB.placeAuctionBid(auctionId, GameEngine.state.username, val);
      showToast('تمت المزايدة','لقد قدمت عرض مزايدة أعلى بنجاح!','success');
    } catch (err) {
      showToast('فشل المزايدة', err.message,'error');
    }
  }

  function calculatePlayerNetWorth(playerState) {
    let worth = (playerState.cash || 0) + (playerState.bank || 0) + (playerState.dirtyCash || 0);

    if (playerState.assets) {
      Object.keys(playerState.assets).forEach(key => {
        const cost = GameEngine.ASSETS[key] ? GameEngine.ASSETS[key].cost : 0;
        worth += (playerState.assets[key] || 0) * cost;
      });
    }

    if (playerState.stocks) {
      Object.keys(playerState.stocks).forEach(sym => {
        const shares = playerState.stocks[sym].shares || 0;
        const currentPrice = GameEngine.stockPrices && GameEngine.stockPrices[sym]
          ? GameEngine.stockPrices[sym][GameEngine.stockPrices[sym].length - 1]
          : (GameEngine.STOCKS[sym] ? GameEngine.STOCKS[sym].basePrice : 0);
        worth += shares * currentPrice;
      });
    }

    if (playerState.investments) {
      playerState.investments.forEach(inv => {
        worth += (inv.investedAmount || 0);
      });
    }

    return worth;
  }

  async function renderAcquisitionMarket() {
    const shelf = document.getElementById('acquisition-market-shelf');
    if (!shelf) return;

    shelf.innerHTML =`<div class="col-span-full text-center text-slate-400 text-xs py-8">${window.currentLang ==='en' ?'Fetching distressed business list...' :'جاري جلب قائمة الشركات المتعثرة...'}</div>`;

    try {
      if (typeof firebase ==='undefined' || !AppDB.isFirebaseReady) {
        shelf.innerHTML =`<div class="col-span-full text-center text-slate-500 text-xs py-8">${window.currentLang ==='en' ?'Acquisition market is only available in online mode.' :'سوق الاستحواذ متاح فقط في وضع الأونلاين.'}</div>`;
        return;
      }

      const allPlayers = await AppDB.adminGetAllPlayers();
      const currentUsername = GameEngine.state.username;
      
      const distressed = [];

      allPlayers.forEach(p => {
        const pState = p.raw;
        if (p.username !== currentUsername && p.cash <= 0 && pState && pState.businesses) {
          Object.keys(pState.businesses).forEach(bizId => {
            const biz = pState.businesses[bizId];
            if (biz && biz.level > 0) {
              distressed.push({
                player: p.username,
                playerState: pState,
                bizId: bizId,
                level: biz.level,
                bizConfig: GameEngine.BUSINESSES[bizId]
              });
            }
          });
        }
      });

      if (distressed.length === 0) {
        shelf.innerHTML =`<div class="col-span-full text-center text-slate-500 text-xs py-8">${window.currentLang ==='en' ?'No distressed businesses available for acquisition at the moment.' :'لا توجد شركات متعثرة معروضة للاستحواذ حالياً.'}</div>`;
        return;
      }

      shelf.innerHTML ='';
      distressed.forEach(item => {
        let totalInvestment = item.bizConfig.cost;
        for (let lvl = 0; lvl < item.level - 1; lvl++) {
          totalInvestment += Math.floor(item.bizConfig.cost * Math.pow(item.bizConfig.upgradeMultiplier, lvl));
        }

        const discountedPrice = Math.floor(totalInvestment * 0.55);

        const card = document.createElement('div');
        card.className ='p-5 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4 flex flex-col justify-between';
        
        const translatedBizName = window.currentLang ==='en' ? (translationDict[item.bizConfig.name] || item.bizConfig.name) : item.bizConfig.name;

        card.innerHTML =`
          <div class="flex justify-between items-start border-b border-slate-800 pb-3">
            <div>
              <h4 class="font-black text-white text-sm">${translatedBizName || item.bizId}</h4>
              <span class="text-[10px] text-slate-400">${window.currentLang ==='en' ?'Distressed Owner:' :'المالك المتعثر:'} <strong class="text-rose-400 cursor-pointer hover:underline" onclick="window.UI.openPlayerProfileCard('${item.player}')">${item.player}</strong></span>
            </div>
            <span class="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-[10px] text-rose-400 font-bold">${window.currentLang ==='en' ?'Acquisition Opportunity' :'فرصة استحواذ'}</span>
          </div>
          <div class="grid grid-cols-2 gap-3 py-2 text-xs">
            <div class="p-2 bg-slate-950/40 rounded-xl border border-slate-900">
              <span class="text-[9px] text-slate-400 block mb-0.5">${window.currentLang ==='en' ?'Current Level:' :'المستوى الحالي:'}</span>
              <span class="font-bold text-slate-300">${window.currentLang ==='en' ?`Level ${item.level}` :`مستوى ${item.level}`}</span>
            </div>
            <div class="p-2 bg-slate-950/40 rounded-xl border border-slate-900">
              <span class="text-[9px] text-slate-400 block mb-0.5">${window.currentLang ==='en' ?'Estimated Value:' :'القيمة المقدرة:'}</span>
              <span class="numbers-font font-bold text-slate-400 line-through">${totalInvestment.toLocaleString()} EGP</span>
            </div>
          </div>
          <div class="flex justify-between items-center bg-slate-950/80 p-2.5 rounded-xl border border-slate-900">
            <span class="text-[10px] text-emerald-400 font-bold">${window.currentLang ==='en' ?'Acquisition & Rescue Price (45% off):' :'سعر الاستحواذ والإنقاذ (خصم 45%):'}</span>
            <span class="numbers-font font-black text-emerald-400 text-sm">${discountedPrice.toLocaleString()} EGP</span>
          </div>
          <button onclick="window.UI.acquireDistressedBusiness('${item.player}','${item.bizId}', ${discountedPrice})" class="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black transition">${window.currentLang ==='en' ?'Acquire & Rescue Business' :'استحواذ وإنقاذ الشركة'}</button>`;
        
        shelf.appendChild(card);
      });

    } catch (err) {
      shelf.innerHTML =`<div class="col-span-full text-center text-rose-500 text-xs py-8">${window.currentLang ==='en' ?`Failed to load acquisition market: ${err.message}` :`فشل تحميل سوق الاستحواذ: ${err.message}`}</div>`;
    }
  }

  async function acquireDistressedBusiness(sellerUsername, bizId, price) {
    if (!confirm(`هل أنت متأكد من رغبتك في الاستحواذ على شركة (${bizId}) الخاصة باللاعب (${sellerUsername}) مقابل ${price.toLocaleString()} EGP؟ سيتم تحويل المبلغ له مباشرة لإنقاذه من التعثر المالي.`)) return;

    try {
      const buyerCash = GameEngine.state.cash;
      const buyerBank = GameEngine.state.bank;
      if (buyerCash < price && buyerBank < price) {
        showToast('رصيد غير كافي','لا تملك رصيداً كافياً لإتمام عملية الاستحواذ والإنقاذ.','error');
        return;
      }

      const sellerState = await AppDB.adminGetPlayer(sellerUsername);
      if (!sellerState) {
        showToast('خطأ الاستحواذ','تعذر العثور على بيانات البائع.','error');
        return;
      }

      const sellerRaw = sellerState.raw || sellerState;

      if (!sellerRaw.businesses || !sellerRaw.businesses[bizId] || sellerRaw.businesses[bizId].level <= 0) {
        showToast('خطأ الاستحواذ','لم تعد هذه الشركة معروضة للاستحواذ.','error');
        renderAcquisitionMarket();
        return;
      }
      if (sellerRaw.cash > 0) {
        showToast('خطأ الاستحواذ','اللاعب لم يعد متعثراً مالياً.','error');
        renderAcquisitionMarket();
        return;
      }

      if (GameEngine.state.cash >= price) {
        GameEngine.state.cash -= price;
      } else {
        GameEngine.state.bank -= price;
      }

      const acquiredLevel = sellerRaw.businesses[bizId].level;
      GameEngine.state.businesses = GameEngine.state.businesses || {};
      
      const buyerBiz = GameEngine.state.businesses[bizId];
      let newLevel = acquiredLevel;
      if (buyerBiz && buyerBiz.level > 0) {
        newLevel = Math.max(buyerBiz.level, acquiredLevel) + 1;
        showToast('دمج وتطوير الشركة',`بما أنك تملك هذا المشروع بالفعل، تم دمج الكيانين وترقية مستواك إلى المستوى ${newLevel}!`,'info');
      }

      GameEngine.state.businesses[bizId] = {
        id: bizId,
        name: GameEngine.BUSINESSES[bizId].name,
        level: newLevel,
        workers: buyerBiz ? (buyerBiz.workers || 0) : 0,
        price: buyerBiz ? (buyerBiz.price || 0) : 0,
        marketingTicks: buyerBiz ? (buyerBiz.marketingTicks || 0) : 0,
        employees: buyerBiz ? (buyerBiz.employees || {}) : {}
      };

      sellerRaw.businesses[bizId].level = 0;
      sellerRaw.businesses[bizId].workers = 0;
      sellerRaw.cash += price;

      GameEngine.state.netWorth = GameEngine.calculateNetWorth();
      sellerRaw.netWorth = calculatePlayerNetWorth(sellerRaw);

      await AppDB.savePlayerState(GameEngine.activeUsername, GameEngine.state);
      await AppDB.adminSavePlayer(sellerUsername, sellerRaw);

      await AppDB.sendMail('SYSTEM_ACQUISITION', sellerUsername,'system_notification', {
        message:` تم الاستحواذ وإنقاذ مشروعك (${GameEngine.BUSINESSES[bizId].name}) من قبل اللاعب (${GameEngine.state.username})! تمت إضافة +${price.toLocaleString()} EGP لحسابك وتمت تسوية تعثرك المالي.`
      });

      showToast('تم الاستحواذ والإنقاذ!',`لقد تملكت الشركة بنجاح وتم تحويل ${price.toLocaleString()} EGP لمساعدة اللاعب ${sellerUsername}.`,'success');
      
      renderAll();
      renderAcquisitionMarket();

    } catch (err) {
      showToast('فشل الاستحواذ', err.message,'error');
    }
  }

  async function triggerEndAuction(auctionId) {
    if (window.activeAuctionEndLock && window.activeAuctionEndLock[auctionId]) return;
    if (!window.activeAuctionEndLock) window.activeAuctionEndLock = {};
    window.activeAuctionEndLock[auctionId] = true;

    try {
      if (typeof firebase !=='undefined' && AppDB.isFirebaseReady) {
        const db = firebase.firestore();
        const docRef = db.collection('liveAuctions').doc(auctionId);

        await db.runTransaction(async transaction => {
          const doc = await transaction.get(docRef);
          if (!doc.exists) return;
          const data = doc.data();
          if (data.status !=='active') return;

          transaction.update(docRef, { status:'ended' });

          const winner = data.highestBidder;
          const price = data.currentBid;

          if (winner) {
            const winMail = {
              sender:'SYSTEM_AUCTION',
              recipient: winner,
              type:'auction_win',
              payload: {
                auctionId,
                itemName: data.itemName,
                itemType: data.itemType,
                itemId: data.itemId,
                price
              },
              timestamp: Date.now(),
              status:'pending'
            };
            transaction.set(db.collection('mailbox').doc('win_' + auctionId), winMail);
          }
        });
      }
    } catch (err) {
      console.error('[Auction] Auto-end failed:', err);
    }
  }

  async function processInboxSystemMessages(mails) {
    if (!mails || mails.length === 0) return;

    // Process incoming bank transfers
    const transfers = mails.filter(m => m.type ==='transfer_received' && (m.status ==='unread' || m.status ==='pending'));
    for (const tr of transfers) {
      if (window._processedTransferMailIds && window._processedTransferMailIds.has(tr.id)) continue;
      if (!window._processedTransferMailIds) window._processedTransferMailIds = new Set();
      window._processedTransferMailIds.add(tr.id);

      try {
        const amount = Number(tr.payload && tr.payload.amount ? tr.payload.amount : 0);
        const mailTime = Number(tr.created_at || tr.timestamp || 0);
        const sessionStart = window._sessionInitTimestamp || 0;

        if (amount > 0) {
          // Only add to in-memory cash if this transfer occurred during the active session.
          // If it was sent while offline before this session, getPlayerState already loaded the updated balance on login.
          if (mailTime >= sessionStart) {
            GameEngine.state.cash = (Number(GameEngine.state.cash) || 0) + amount;
            GameEngine.state.netWorth = (Number(GameEngine.state.netWorth) || 0) + amount;
            await AppDB.savePlayerState(GameEngine.activeUsername, GameEngine.state, true);
          }

          showToast('حوالة بنكية واردة',`وصلتك حوالة مالية بقيمة ${amount.toLocaleString()} EGP من اللاعب"${tr.sender}".`,'success');
          playMenuSound('success');

          await AppDB.updateMailStatus(tr.id,'read');

          if (typeof loadTransferHistory ==='function') {
            loadTransferHistory(true);
          }
          renderAll();
        }
      } catch (err) {
        console.error('[Mailbox System] Failed to process transfer_received:', err);
      }
    }

    // Process system auto-actions
    const friendAdds = mails.filter(m => m.type ==='system_add_friend' && (m.status ==='pending' || m.status ==='unread'));
    for (const add of friendAdds) {
      const fr = add.payload && add.payload.friend;
      if (fr) {
        GameEngine.state.friends = GameEngine.state.friends || [];
        if (!GameEngine.state.friends.includes(fr)) {
          GameEngine.state.friends.push(fr);
          await AppDB.savePlayerState(GameEngine.activeUsername, GameEngine.state);
        }
        await AppDB.updateMailStatus(add.id,'accepted');
        showToast('صديق جديد',`قبل اللاعب ${fr} طلب الصداقة! أصبحتم أصدقاء الآن.`,'success');
        renderAll();
      }
    }

    const wins = mails.filter(m => m.type ==='auction_win' && (m.status ==='pending' || m.status ==='unread'));
    for (const win of wins) {
      try {
        const price = win.payload.price;
        if (GameEngine.state.cash >= price) {
          GameEngine.state.cash -= price;
        } else if (GameEngine.state.bank >= price) {
          GameEngine.state.bank -= price;
        } else {
          GameEngine.state.cash -= price;
        }

        const type = win.payload.itemType;
        const id = win.payload.itemId;

        if (type ==='property') {
          GameEngine.state.assets = GameEngine.state.assets || {};
          GameEngine.state.assets[id] = (GameEngine.state.assets[id] || 0) + 1;
        } else if (type ==='business') {
          GameEngine.state.businesses = GameEngine.state.businesses || {};
          GameEngine.state.businesses[id] = {
            id,
            name: win.payload.itemName,
            level: 1,
            workers: 0,
            price: 0,
            marketingTicks: 0,
            employees: {}
          };
        } else if (type ==='item') {
          GameEngine.state.inventory = GameEngine.state.inventory || {};
          GameEngine.state.inventory[id] = (GameEngine.state.inventory[id] || 0) + 1;
        }

        GameEngine.state.netWorth = GameEngine.calculateNetWorth();
        await AppDB.savePlayerState(GameEngine.activeUsername, GameEngine.state);
        await AppDB.updateMailStatus(win.id,'accepted');

        showToast(' فزت بالمزاد!',`تهانينا! لقد فزت بمزاد (${win.payload.itemName}) مقابل ${price.toLocaleString()} EGP تم خصمها من حسابك.`,'success');
        renderAll();
      } catch (err) {
        console.error('[Mailbox System] Failed to process auction win:', err);
      }
    }

    const empAdds = mails.filter(m => m.type ==='system_add_employee' && (m.status ==='pending' || m.status ==='unread'));
    for (const add of empAdds) {
      const bizId = add.payload.businessId;
      const emp = add.payload.employee;
      const role = add.payload.role;
      const salary = add.payload.salary;

      if (GameEngine.state.businesses && GameEngine.state.businesses[bizId]) {
        const biz = GameEngine.state.businesses[bizId];
        biz.employees = biz.employees || {};
        biz.employees[emp] = { role, salary };

        await AppDB.savePlayerState(GameEngine.activeUsername, GameEngine.state);
        await AppDB.updateMailStatus(add.id,'accepted');
        showToast('موظف جديد',`التحق اللاعب ${emp} بالعمل في مشروعك (${biz.name || bizId}) كمساعد براتب ${salary} EGP/ث!`,'success');
        renderAll();
      }
    }

    const partAdds = mails.filter(m => m.type ==='system_add_partner' && (m.status ==='pending' || m.status ==='unread'));
    for (const add of partAdds) {
      const bizId = add.payload.businessId;
      const partner = add.payload.partner;
      const sharePct = add.payload.sharePct;

      if (GameEngine.state.businesses && GameEngine.state.businesses[bizId]) {
        const biz = GameEngine.state.businesses[bizId];
        biz.partners = biz.partners || {};
        biz.partners[partner] = sharePct;

        const currentOwnerShare = biz.partners[GameEngine.state.username] !== undefined ? biz.partners[GameEngine.state.username] : 1.0;
        biz.partners[GameEngine.state.username] = Math.max(0.01, currentOwnerShare - sharePct);

        await AppDB.savePlayerState(GameEngine.activeUsername, GameEngine.state);
        await AppDB.updateMailStatus(add.id,'accepted');
        showToast('شريك جديد',`انضم اللاعب ${partner} كشريك استثماري بنسبة أرباح ${Math.round(sharePct * 100)}%!`,'success');
        renderAll();
      }
    }

    const divs = mails.filter(m => m.type ==='dividend_claim' && (m.status ==='pending' || m.status ==='unread'));
    for (const div of divs) {
      try {
        const amt = div.payload.amount;
        GameEngine.state.cash += amt;
        GameEngine.state.netWorth = GameEngine.calculateNetWorth();
        await AppDB.savePlayerState(GameEngine.activeUsername, GameEngine.state);
        await AppDB.updateMailStatus(div.id,'accepted');
        showToast(' أرباح شراكة استثمارية',`تمت إضافة +${amt.toLocaleString()} EGP من أرباحك في شراكة مشروع (${div.payload.businessId})!`,'success');
        renderAll();
      } catch (err) {
        console.error('Failed to process dividend claim:', err);
      }
    }
  }

  async function checkAndClaimDividends() {
    if (!GameEngine.state || !AppDB.isFirebaseReady) return;
    if (window.pendingDividends) {
      const keys = Object.keys(window.pendingDividends);
      for (const bizId of keys) {
        const partners = window.pendingDividends[bizId];
        for (const partner of Object.keys(partners)) {
          const amt = partners[partner];
          if (amt > 0) {
            try {
              await AppDB.sendMail('SYSTEM_DIVIDEND', partner,'dividend_claim', {
                businessId: bizId,
                amount: amt
              });
              partners[partner] = 0;
            } catch (e) {
              console.error('Failed to send dividend mail:', e);
            }
          }
        }
      }
    }
  }

  // ─────────────────────────────────────────────
  //  V2: CORPORATIONS UI & ACTIONS
  // ─────────────────────────────────────────────
  async function renderCorporationsTab(force = false) {
    const container = document.getElementById('corporations-main-container');
    if (!container) return;

    // Detect if the user is currently typing in an input inside this container
    const activeEl = document.activeElement;
    const isUserTyping = activeEl && container.contains(activeEl) && 
      (activeEl.tagName ==='INPUT' || activeEl.tagName ==='TEXTAREA' || activeEl.tagName ==='SELECT');

    // If user is currently typing and this is a background reload, skip to avoid wiping input!
    if (isUserTyping && !force) {
      return;
    }

    // Preserve any inputs currently typed
    const preservedInputs = {};
    let focusedId = null;
    let selStart = null;
    let selEnd = null;

    if (activeEl && container.contains(activeEl)) {
      focusedId = activeEl.id || null;
      try {
        selStart = activeEl.selectionStart;
        selEnd = activeEl.selectionEnd;
      } catch (e) {}
    }

    container.querySelectorAll('input, textarea').forEach(inp => {
      if (inp.id && inp.value) {
        preservedInputs[inp.id] = inp.value;
      }
    });

    if (typeof firebase ==='undefined' || !AppDB.isFirebaseReady) {
      container.innerHTML =`
        <div class="glass-panel p-6 text-center rounded-2xl border border-slate-800 bg-slate-950/40">
          <p class="text-slate-400 text-xs py-8">${window.currentLang ==='en' ?'Joint Corporations are only available in online mode (with Firebase cloud connection).' :'الشركات المشتركة متاحة فقط في وضع الأونلاين (مع اتصال سحابة Firebase).'}</p>
        </div>`;
      return;
    }

    const currentUsername = GameEngine.activeUsername || (GameEngine.state && GameEngine.state.username);
    const corp = window.activeCorporationState;

    if (!corp) {
      let list = window.lastCorporationsCache || [];
      if (!GameEngine.state.isAdmin) {
        list = list.filter(c => !c.isAdminCorp && c.founder !=='admin');
      }
      
      let corpCardsHtml ='';
      if (list.length === 0) {
        corpCardsHtml =`
          <div class="col-span-full text-center text-slate-500 text-xs py-12">
            ${window.currentLang ==='en' ?'No joint corporations registered on the server yet. Be the first to establish one!' :'لا توجد أي شركات مشتركة مسجلة في السيرفر حالياً. كن أول من يؤسس شركة!'}
          </div>`;
      } else {
        list.forEach(c => {
          const membersCount = c.members ? c.members.length : 0;
          const treasuryVal = c.treasury || 0;
          corpCardsHtml +=`
            <div class="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-950/20 hover:border-indigo-500/30 transition flex flex-col justify-between">
              <div>
                <h4 class="text-sm font-black text-white flex items-center gap-1.5">
                  <i class="fa-solid fa-building text-indigo-400"></i>
                  <span>${c.name}</span>
                </h4>
                <p class="text-slate-400 text-xs mt-1 min-h-[32px]">${c.desc || (window.currentLang ==='en' ?'No description.' :'لا يوجد وصف.')}</p>
                <div class="grid grid-cols-2 gap-2 mt-4 bg-slate-950/50 p-2.5 rounded-xl border border-slate-900/60 text-[10px]">
                  <div>
                    <span class="text-slate-500 block">${window.currentLang ==='en' ?'Founder' :'المؤسس'}</span>
                    <span class="text-slate-300 font-bold">${c.founder}</span>
                  </div>
                  <div>
                    <span class="text-slate-500 block">${window.currentLang ==='en' ?'Members' :'عدد الأعضاء'}</span>
                    <span class="text-slate-300 font-bold">${membersCount} ${window.currentLang ==='en' ?'players' :'لاعب'}</span>
                  </div>
                  <div class="col-span-2 border-t border-slate-900/40 pt-2 mt-1">
                    <span class="text-slate-500 block">${window.currentLang ==='en' ?'Corp Treasury' :'خزينة الشركة'}</span>
                    <span class="text-emerald-400 font-black numbers-font text-xs">${treasuryVal.toLocaleString()} EGP</span>
                  </div>
                </div>
              </div>
              <button onclick="window.UI.joinCorporationAction('${c.id}')" class="w-full mt-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition">${window.currentLang ==='en' ?'Apply to Join' :'تقديم طلب انضمام'}</button>
            </div>`;
        });
      }

      container.innerHTML =`
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-950/40 space-y-4">
            <h3 class="text-sm font-black text-white flex items-center gap-1.5">
              <i class="fa-solid fa-plus text-indigo-500"></i>
              <span>${window.currentLang ==='en' ?'Establish New Joint Corp' :'تأسيس شركة مشتركة جديدة'}</span>
            </h3>
            <p class="text-slate-400 text-[11px]">${window.currentLang ==='en' ?'Establishing a corporation requires paying a heavy regulatory fee of 100 Billion EGP. The treasury will start from zero, and members must contribute capital to purchase projects.' :'يتطلب تأسيس شركة دفع رسوم تنظيمية باهظة للبلدية تبلغ 100 مليار جنيه. ستبدأ الخزينة من الصفر وسينبغي ضخ مساهمات لشراء المشاريع.'}</p>
            
            <div class="space-y-3">
              <div>
                <label class="text-[10px] text-slate-400 block mb-1">${window.currentLang ==='en' ?'Corporation Name' :'اسم الشركة'}</label>
                <input id="create-corp-name" type="text" placeholder="${window.currentLang ==='en' ?'e.g. Arab Contractors Alliance' :'مثال: تحالف المقاولون العرب'}" class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500">
              </div>
              <div>
                <label class="text-[10px] text-slate-400 block mb-1">${window.currentLang ==='en' ?'Activity Description (Optional)' :'وصف نشاط الشركة (اختياري)'}</label>
                <textarea id="create-corp-desc" rows="3" placeholder="${window.currentLang ==='en' ?'Write a brief description of the financial alliance vision...' :'اكتب نبذة عن رؤية وتوجه التحالف المالي...'}" class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none"></textarea>
              </div>
            </div>

            <button onclick="window.UI.createCorporationAction()" class="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-600/10 transition">
              ${window.currentLang ==='en' ?'Establish Corporation (Pay 100B EGP)' :'تأسيس الشركة (خصم 100 مليار ج.م)'}
            </button>
          </div>

          <div class="lg:col-span-2 space-y-4">
            <h3 class="text-sm font-black text-white flex items-center gap-1.5">
              <i class="fa-solid fa-list text-slate-400"></i>
              <span>${window.currentLang ==='en' ?'Registered Server Corporations List' :'قائمة الشركات المسجلة على السيرفر'}</span>
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              ${corpCardsHtml}
            </div>
          </div>
        </div>`;
    } else {
      const isFounder = corp.founder === currentUsername;
      const membersList = corp.members || [];
      const totalCont = corp.totalContributions || 0;
      const myCont = corp.contributions ? (corp.contributions[currentUsername] || 0) : 0;
      
      let sharePct = 0;
      if (totalCont > 0) {
        sharePct = myCont / totalCont;
      } else if (currentUsername === corp.founder) {
        sharePct = 1.0;
      }

      let totalCorpTickProfit = 0;
      if (corp.projects) {
        if (Array.isArray(corp.projects)) {
          corp.projects.forEach(projId => {
            if (GameEngine.CORP_PROJECTS[projId]) {
              totalCorpTickProfit += GameEngine.CORP_PROJECTS[projId].profitPerTick;
            }
          });
        } else {
          Object.keys(corp.projects).forEach(projId => {
            if (corp.projects[projId] && GameEngine.CORP_PROJECTS[projId]) {
              totalCorpTickProfit += GameEngine.CORP_PROJECTS[projId].profitPerTick;
            }
          });
        }
      }

      const myShareTickProfit = Math.floor(totalCorpTickProfit * sharePct);

      let membersHtml ='';
      membersList.forEach(m => {
        const cAmt = corp.contributions ? (corp.contributions[m] || 0) : 0;
        let mShare = totalCont > 0 ? (cAmt / totalCont) : (m === corp.founder ? 1.0 : 0.0);
        const isMe = m === currentUsername;
        const isMemberFounder = m === corp.founder;

        const role = (corp.roles && corp.roles[m]) || (isMemberFounder ?'founder' :'member');
        let roleBadge =`<span class="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded ml-1">${window.currentLang ==='en' ?'Shareholder' :'مساهم'}</span>`;
        if (role ==='founder') {
          roleBadge =`<span class="text-[9px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded ml-1">${window.currentLang ==='en' ?'Founder' :'مؤسس'}</span>`;
        } else if (role ==='cfo') {
          roleBadge =`<span class="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded ml-1">${window.currentLang ==='en' ?'CFO' :'مدير مالي'}</span>`;
        }

        let actions ='';
        if (isFounder && !isMemberFounder) {
          if (role ==='member') {
            actions +=`<button onclick="window.UI.promoteCorpMemberAction('${corp.id}','${m}','cfo')" class="text-[9px] bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded transition font-bold mr-1" title="${window.currentLang ==='en' ?'Promote to CFO' :'ترقية لمدير مالي'}"><i class="fa-solid fa-user-tie"></i></button>`;
          } else if (role ==='cfo') {
            actions +=`<button onclick="window.UI.promoteCorpMemberAction('${corp.id}','${m}','member')" class="text-[9px] bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded transition font-bold mr-1" title="${window.currentLang ==='en' ?'Demote to Shareholder' :'تنزيل لمساهم عادي'}"><i class="fa-solid fa-user-minus"></i></button>`;
          }
          actions +=`<button onclick="window.UI.kickCorpMemberAction('${corp.id}','${m}')" class="text-[9px] bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded transition font-bold" title="${window.currentLang ==='en' ?'Kick' :'طرد'}"><i class='fa-solid fa-user-slash'></i></button>`;
        }
        if (isMe) {
          actions +=`<button onclick="window.UI.leaveCorporationAction('${corp.id}')" class="text-[9px] bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 px-2 py-0.5 rounded transition font-bold ml-1" title="${window.currentLang ==='en' ?'Leave Corp' :'مغادرة الشركة'}"><i class="fa-solid fa-arrow-right-from-bracket mr-0.5"></i> ${window.currentLang ==='en' ?'Leave' :'مغادرة'}</button>`;
        }

        membersHtml +=`
          <tr class="border-b border-slate-900 text-xs">
            <td class="py-2.5 text-slate-300 font-bold">
              ${m} 
              ${roleBadge}
              ${isMe && !isMemberFounder ?`<span class="text-[9px] bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded ml-1">${window.currentLang ==='en' ?'You' :'أنت'}</span>` :''}
            </td>
            <td class="py-2.5 text-slate-400 numbers-font">${cAmt.toLocaleString()} EGP</td>
            <td class="py-2.5 text-emerald-400 font-bold numbers-font">${(mShare * 100).toFixed(2)}%</td>
            <td class="py-2.5 text-left">
              ${actions}
            </td>
          </tr>`;
      });

      let projectsHtml ='';
      Object.keys(GameEngine.CORP_PROJECTS).forEach(projId => {
        const p = GameEngine.CORP_PROJECTS[projId];
        const owned = corp.projects && (Array.isArray(corp.projects) ? corp.projects.includes(projId) : Boolean(corp.projects[projId]));
        const membersCount = corp.members ? corp.members.length : 0;
        const meetsCondition = membersCount >= (p.minMembers || 1);
        
        let statusBadge ='';
        let projectActionBtn ='';
        
        const translatedProjName = window.currentLang ==='en' ? (translationDict[p.name] || p.name) : p.name;

        if (owned) {
          statusBadge =`<span class="text-[10px] bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded-full font-bold">${window.currentLang ==='en' ?'Owned by Corp' :'مملوك للشركة'}</span>`;
          projectActionBtn =`<button class="w-full py-2 bg-slate-900 border border-slate-800 text-slate-500 rounded-xl text-xs font-bold" disabled>${window.currentLang ==='en' ?'Generates yield for shareholders' :'يولد أرباحاً للمساهمين'}</button>`;
        } else {
          statusBadge =`<span class="text-[10px] bg-slate-800 border border-slate-700 text-slate-400 px-2 py-0.5 rounded-full font-bold">${window.currentLang ==='en' ?'Not Owned' :'غير مملوك'}</span>`;
          if (isFounder) {
            if (meetsCondition) {
              projectActionBtn =`<button onclick="window.UI.buyCorporationProjectAction('${corp.id}','${p.id}', ${p.cost})" class="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition">${window.currentLang ==='en' ?'Buy Project from Treasury' :'شراء المشروع من الخزينة'}</button>`;
            } else {
              projectActionBtn =`<button class="w-full py-2 bg-slate-900 border border-slate-800 text-rose-500/70 rounded-xl text-xs font-bold cursor-not-allowed" disabled>${window.currentLang ==='en' ?'Condition not met' :'الشرط غير مستوفٍ'}</button>`;
            }
          } else {
            projectActionBtn =`<button class="w-full py-2 bg-slate-900 border border-slate-800 text-slate-600 rounded-xl text-xs font-bold" disabled>${window.currentLang ==='en' ?'Available to founder only' :'متاح للمؤسس فقط'}</button>`;
          }
        }

        projectsHtml +=`
          <div class="glass-panel p-5 rounded-2xl border ${owned ?'border-emerald-500/20 bg-emerald-950/5' :'border-slate-800 bg-slate-950/20'} flex flex-col justify-between space-y-4">
            <div>
              <div class="flex justify-between items-start gap-2">
                <h4 class="text-xs font-black text-white">${translatedProjName}</h4>
                ${statusBadge}
              </div>
              <div class="grid grid-cols-2 gap-2 mt-4 bg-slate-950/50 p-2.5 rounded-xl border border-slate-900/60 text-[10px]">
                <div>
                  <span class="text-slate-500 block">${window.currentLang ==='en' ?'Investment Cost' :'تكلفة الاستثمار'}</span>
                  <span class="text-slate-300 font-bold numbers-font text-xs">${p.cost.toLocaleString()} EGP</span>
                </div>
                <div>
                  <span class="text-slate-500 block">${window.currentLang ==='en' ?'Total Yield' :'العائد الإجمالي'}</span>
                  <span class="text-emerald-400 font-black numbers-font text-xs">+${p.profitPerTick.toLocaleString()}/tick</span>
                </div>
              </div>
              <div class="mt-3 text-[9.5px] ${meetsCondition ?'text-emerald-400/90' :'text-rose-400'} font-bold flex items-center gap-1">
                <i class="fa-solid fa-users text-[10px]"></i>
                <span>${window.currentLang ==='en' ?`Shareholder Condition: Min ${p.minMembers} players (Current: ${membersCount})` :`شرط المساهمين: لا يقل عن ${p.minMembers} لاعبين (المتوفر: ${membersCount})`}</span>
              </div>
            </div>
            ${projectActionBtn}
          </div>`;
      });

      const corpLevel = corp.level || 1;
      const corpBoostPct = (corpLevel - 1) * 5;
      const isCfo = (corp.roles && corp.roles[currentUsername]) ==='cfo';
      const hasStaffPower = isFounder || isCfo;

      container.innerHTML =`
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2 glass-panel p-6 rounded-2xl border border-indigo-500/10 bg-slate-950/40 relative overflow-hidden flex flex-col justify-between">
            <div>
              <div class="flex justify-between items-start flex-wrap gap-2">
                <div>
                  <h3 class="text-lg font-black text-white flex items-center gap-2">
                    <i class="fa-solid fa-building text-indigo-500"></i>
                    <span>${corp.name}</span>
                  </h3>
                  <p class="text-slate-400 text-xs mt-1">${corp.desc || (window.currentLang ==='en' ?'No description.' :'لا يوجد وصف تجاري.')}</p>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded-full font-bold">${window.currentLang ==='en' ?'Alliance Level:' :'مستوى التحالف:'} ${corpLevel} </span>
                  <button onclick="window.UI.leaveCorporationAction('${corp.id}')" class="px-3 py-1 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 hover:border-rose-500/50 text-rose-400 hover:text-rose-300 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-sm" title="${window.currentLang ==='en' ?'Leave Corporation' :'مغادرة الشركة'}">
                    <i class="fa-solid fa-arrow-right-from-bracket text-xs"></i>
                    <span>${window.currentLang ==='en' ?'Leave Corp' :'مغادرة الشركة'}</span>
                  </button>
                </div>
              </div>
              <div class="mt-2.5 text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                <i class="fa-solid fa-chart-line"></i>
                <span>${window.currentLang ==='en' ?`Member individual business profit boost: +${corpBoostPct}% (Active)` :`دعم أرباح المشاريع الفردية لأعضاء التحالف: +${corpBoostPct}% (نشط)`}</span>
              </div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6 bg-slate-950/70 p-4 rounded-xl border border-slate-900">
              <div>
                <span class="text-[10px] text-slate-500 block">${window.currentLang ==='en' ?'Available Treasury' :'الخزينة المتوفرة'}</span>
                <span class="text-emerald-400 font-black text-sm numbers-font">${(corp.treasury || 0).toLocaleString()} EGP</span>
              </div>
              <div>
                <span class="text-[10px] text-slate-500 block">${window.currentLang ==='en' ?'Personal Contributions' :'مساهماتك الشخصية'}</span>
                <span class="text-slate-300 font-bold text-sm numbers-font">${myCont.toLocaleString()} EGP</span>
              </div>
              <div>
                <span class="text-[10px] text-slate-500 block">${window.currentLang ==='en' ?'Profit Share' :'حصتك من الأرباح'}</span>
                <span class="text-indigo-400 font-black text-sm numbers-font">${(sharePct * 100).toFixed(2)}%</span>
              </div>
              <div>
                <span class="text-[10px] text-slate-500 block">${window.currentLang ==='en' ?'Your Profit / tick' :'أرباحك / tick'}</span>
                <span class="text-emerald-400 font-black text-sm numbers-font">+${myShareTickProfit.toLocaleString()} EGP</span>
              </div>
            </div>
          </div>

          <div class="space-y-4">
            <!-- Card 1: Contribute -->
            <div class="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-950/40 space-y-3">
              <h3 class="text-xs font-black text-white flex items-center gap-1.5">
                <i class="fa-solid fa-piggy-bank text-indigo-400"></i>
                <span>${window.currentLang ==='en' ?'Contribute Capital to Treasury' :'ضخ أموال في الخزينة المشتركة'}</span>
              </h3>
              <p class="text-slate-400 text-[10px] leading-relaxed">${window.currentLang ==='en' ?'Every amount you contribute increases the treasury size to purchase projects, and automatically increases your profit percentage share compared to other partners.' :'كل مبلغ تضخه يزيد من حجم الخزينة لشراء المشاريع، ويرفع حصتك المئوية من الأرباح تلقائياً مقارنة بالشركاء الآخرين.'}</p>
              <div>
                <label class="text-[9px] text-slate-500 block mb-1">${window.currentLang ==='en' ?'Amount to Contribute (EGP)' :'المبلغ المراد ضخه (EGP)'}</label>
                <input id="contribute-corp-amount" type="number" placeholder="${window.currentLang ==='en' ?'e.g. 5000000000' :'مثال: 5000000000'}" class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500">
              </div>
              <button onclick="window.UI.contributeCorporationAction('${corp.id}')" class="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black transition">
                ${window.currentLang ==='en' ?'Confirm Capital Contribution' :'تأكيد ضخ السيولة'}
              </button>
            </div>

            <!-- Card 2: Upgrade Corporation -->
            <div class="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-950/40 space-y-3">
              <h3 class="text-xs font-black text-white flex items-center gap-1.5">
                <i class="fa-solid fa-circle-up text-amber-500"></i>
                <span>${window.currentLang ==='en' ?'Upgrade Joint Alliance Level' :'ترقية مستوى التحالف المشترك'}</span>
              </h3>
              <p class="text-slate-400 text-[10px] leading-relaxed">${window.currentLang ==='en' ?'Every upgrade increases the alliance level and raises the member business profit boost by an additional +5%.' :'كل ترقية ترفع مستوى التحالف وتزيد من دعم أرباح المشاريع الفردية للأعضاء بنسبة +5% إضافية.'}</p>
              
              <div class="bg-slate-950/50 p-2 rounded-lg border border-slate-900 text-[10px] space-y-1">
                <div class="flex justify-between">
                  <span class="text-slate-500">${window.currentLang ==='en' ?'Current Level:' :'المستوى الحالي:'}</span>
                  <span class="text-white font-bold">${corpLevel}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-500">${window.currentLang ==='en' ?'Next Level:' :'المستوى القادم:'}</span>
                  <span class="text-amber-400 font-bold">${corpLevel + 1}</span>
                </div>
                <div class="flex justify-between border-t border-slate-900 pt-1 mt-1">
                  <span class="text-slate-500">${window.currentLang ==='en' ?'Upgrade Cost:' :'تكلفة الترقية:'}</span>
                  <span class="text-emerald-400 font-black numbers-font">${(corpLevel * 20000000000).toLocaleString()} EGP</span>
                </div>
              </div>

              <button onclick="window.UI.upgradeCorporationLevelAction('${corp.id}', ${corpLevel * 20000000000})" class="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-black transition">
                ${window.currentLang ==='en' ?'Upgrade Alliance Now' :'ترقية التحالف الآن'}
              </button>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div class="lg:col-span-2 space-y-4">
            <h3 class="text-sm font-black text-white flex items-center gap-1.5">
              <i class="fa-solid fa-industry text-slate-400"></i>
              <span>${window.currentLang ==='en' ?'Megaprojects' :'مشاريع الشركة العملاقة (Megaprojects)'}</span>
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              ${projectsHtml}
            </div>
          </div>

          <div class="glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-950/40 space-y-4 h-fit">
            <h3 class="text-sm font-black text-white flex items-center gap-1.5">
              <i class="fa-solid fa-users text-slate-400"></i>
              <span>${window.currentLang ==='en' ?'Partners & Shareholders' :'الشركاء والمساهمين'} (${membersList.length})</span>
            </h3>
            <div class="overflow-x-auto">
              <table class="w-full text-right">
                <thead>
                  <tr class="border-b border-slate-800 text-[10px] text-slate-500">
                    <th class="pb-2">${window.currentLang ==='en' ?'Name' :'الاسم'}</th>
                    <th class="pb-2">${window.currentLang ==='en' ?'Contribution' :'المساهمة'}</th>
                    <th class="pb-2">${window.currentLang ==='en' ?'Share' :'الحصة'}</th>
                    <th class="pb-2 text-left">${window.currentLang ==='en' ?'Control' :'التحكم'}</th>
                  </tr>
                </thead>
                <tbody>
                  ${membersHtml}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        ${hasStaffPower ?`
        <div class="mt-6 glass-panel p-6 rounded-2xl border border-amber-500/20 bg-slate-900/40 space-y-5">
          <h3 class="text-sm font-black text-amber-400 flex items-center gap-2">
            <i class="fa-solid fa-toolbox"></i>
            <span>${window.currentLang ==='en' ?'Financial Supervision & Alliance Management' :'لوحة الإشراف المالي وإدارة التحالف'}</span>
          </h3>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- 1. Payout Section (Founder and CFOs) -->
            <div class="bg-slate-950/50 border border-slate-800 rounded-xl p-4 space-y-3">
              <h4 class="text-xs font-black text-white flex items-center gap-1.5">
                <i class="fa-solid fa-money-bill-transfer text-emerald-400"></i>
                <span>${window.currentLang ==='en' ?'Transfer Funds from Treasury to Members' :'تحويل السيولة من الخزينة للأعضاء'}</span>
              </h4>
              <p class="text-[10px] text-slate-500 font-bold">${window.currentLang ==='en' ?'Withdraw specific amounts from the alliance treasury and transfer it as cash balance to any member.' :'سحب مبالغ محددة من خزينة التحالف وتحويلها ككاش رصيد لأي عضو.'}</p>
              
              <div class="space-y-2">
                <div>
                  <label class="text-[9px] text-slate-400 block mb-1">${window.currentLang ==='en' ?'Select Target Member' :'اختر العضو المستهدف'}</label>
                  <select id="payout-corp-target" class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500">
                    <option value="">${window.currentLang ==='en' ?'-- Select a partner --' :'-- اختر شريكاً --'}</option>
                    ${membersList.map(m =>`<option value="${m}">${m} ${(corp.roles && corp.roles[m] ==='cfo') ?'[CFO]' : (m === corp.founder ?'[Founder]' :'')}</option>`).join('')}
                  </select>
                </div>
                <div>
                  <label class="text-[9px] text-slate-400 block mb-1">${window.currentLang ==='en' ?'Amount to Withdraw (EGP)' :'المبلغ المراد سحبه وتحويله (EGP)'}</label>
                  <input id="payout-corp-amount" type="number" placeholder="${window.currentLang ==='en' ?'e.g. 100000000' :'مثال: 100000000'}" class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500">
                </div>
              </div>

              <button onclick="window.UI.payoutFromCorpTreasuryAction('${corp.id}')" class="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition">
                ${window.currentLang ==='en' ?'Confirm Fund Withdrawal' :'تأكيد سحب وتحويل السيولة'}
              </button>
            </div>

            <!-- 2. Founder Only Controls -->
            ${isFounder ?`
            <div class="bg-slate-950/50 border border-slate-800 rounded-xl p-4 space-y-3">
              <h4 class="text-xs font-black text-white flex items-center gap-1.5"><i class="fa-solid fa-pen text-indigo-400"></i> ${window.currentLang ==='en' ?'Edit Corp Details' :'تعديل بيانات الشركة'}</h4>
              <div>
                <label class="text-[10px] text-slate-400 block mb-1">${window.currentLang ==='en' ?'New Corp Name' :'اسم جديد للشركة'}</label>
                <input id="edit-corp-name" type="text" value="${corp.name}" class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500">
              </div>
              <div>
                <label class="text-[10px] text-slate-400 block mb-1">${window.currentLang ==='en' ?'New Corp Description' :'وصف جديد للشركة'}</label>
                <textarea id="edit-corp-desc" rows="2" class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none">${corp.desc ||''}</textarea>
              </div>
              <button onclick="window.UI.editCorpInfoAction('${corp.id}')" class="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black transition">
                <i class="fa-solid fa-floppy-disk ml-1"></i> ${window.currentLang ==='en' ?'Save Changes' :'حفظ التعديلات'}
              </button>
            </div>

            <!-- 3. Owner Actions -->
            <div class="col-span-1 md:col-span-2 bg-slate-950/50 border border-slate-800 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-2">
                <h4 class="text-xs font-black text-white flex items-center gap-1.5"><i class="fa-solid fa-arrows-rotate text-amber-400"></i> ${window.currentLang ==='en' ?'Transfer Ownership' :'نقل الملكية'}</h4>
                <p class="text-[10px] text-slate-500 font-bold">${window.currentLang ==='en' ?'Transfer the founder title to another member. This action is irreversible.' :'نقل لقب المؤسس لعضو آخر. لا يمكن التراجع.'}</p>
                <select id="transfer-corp-target" class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500">
                  <option value="">${window.currentLang ==='en' ?'-- Select a member --' :'-- اختر عضواً --'}</option>
                  ${membersList.filter(m => m !== currentUsername).map(m =>`<option value="${m}">${m}</option>`).join('')}
                </select>
                <button onclick="window.UI.transferCorpOwnershipAction('${corp.id}')" class="w-full py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-black transition">
                  ${window.currentLang ==='en' ?'Transfer Ownership' :'نقل الملكية'}
                </button>
              </div>

              <div class="space-y-2 flex flex-col justify-between">
                <div>
                  <h4 class="text-xs font-black text-rose-400 flex items-center gap-1.5"><i class="fa-solid fa-triangle-exclamation"></i> ${window.currentLang ==='en' ?'Danger Zone' :'منطقة الخطر'}</h4>
                  <p class="text-[10px] text-slate-500 font-bold">${window.currentLang ==='en' ?'Permanently dissolve the joint corporation and refund balances to shareholders.' :'حل الشركة المشتركة نهائياً وإعادة الأرصدة للمساهمين.'}</p>
                </div>
                <button onclick="window.UI.dissolveCorpAction('${corp.id}')" class="w-full py-2 bg-rose-700/30 hover:bg-rose-700/50 border border-rose-700/40 text-rose-300 rounded-xl text-xs font-black transition">
                  <i class="fa-solid fa-bomb ml-1"></i> ${window.currentLang ==='en' ?'Dissolve Joint Corp Completely' :'حل الشركة المشتركة بالكامل'}
                </button>
              </div>
            </div>` :`
            <!-- CFO Info Box -->
            <div class="bg-slate-950/50 border border-slate-800 rounded-xl p-4 flex items-center justify-center text-center">
              <div class="space-y-1">
                <i class="fa-solid fa-user-shield text-emerald-400 text-2xl"></i>
                <h4 class="text-xs font-black text-white">${window.currentLang ==='en' ?'Your Role: Alliance CFO' :'أنت تشغل رتبة: مدير مالي للتحالف'}</h4>
                <p class="text-[10px] text-slate-500">${window.currentLang ==='en' ?'You have the authority to withdraw/transfer funds from the treasury to members, buy projects, and upgrade alliance level.' :'لديك الصلاحية لسحب وتحويل الأموال من الخزينة للأعضاء وشراء المشاريع وترقية مستوى التحالف.'}</p>
              </div>
            </div>`}
          </div>
        </div>` :''}`;
    }

    // Restore preserved inputs if any
    Object.keys(preservedInputs).forEach(id => {
      const el = document.getElementById(id);
      if (el && preservedInputs[id]) {
        el.value = preservedInputs[id];
      }
    });

    if (focusedId) {
      const el = document.getElementById(focusedId);
      if (el) {
        el.focus();
        if (selStart !== null && selEnd !== null && el.setSelectionRange) {
          try { el.setSelectionRange(selStart, selEnd); } catch (e) {}
        }
      }
    }
  }

  async function createCorporationAction() {
    const nameInput = document.getElementById('create-corp-name');
    const descInput = document.getElementById('create-corp-desc');
    if (!nameInput) return;

    const name = nameInput.value.trim();
    const desc = descInput ? descInput.value.trim() :'';

    if (!name) {
      showToast('خطأ التأسيس','يرجى إدخال اسم للشركة المشتركة أولاً.','error');
      return;
    }

    const cost = 100000000000;
    const currentCash = Number(GameEngine.state.cash || 0);
    const currentBank = Number(GameEngine.state.bank || 0);

    const totalLiquidity = currentCash + currentBank;
    if (totalLiquidity < cost) {
      showToast('رصيد غير كافي','تأسيس الشركة يتطلب دفع 100 مليار جنيه، ورصيدك الحالي (كاش + بنك) لا يكفي.','error');
      return;
    }

    const username = GameEngine.activeUsername || (GameEngine.state && GameEngine.state.username);
    if (!username) {
      showToast('خطأ','يرجى تسجيل الدخول أولاً لتأسيس شركة.','error');
      return;
    }

    if (!confirm(`هل أنت متأكد من رغبتك في تأسيس شركة"${name}" مقابل دفع رسوم باهظة تبلغ 100,000,000,000 EGP من رصيدك؟`)) return;

    let cashDeduction = 0;
    let bankDeduction = 0;
    if (currentCash >= cost) {
      cashDeduction = cost;
    } else {
      cashDeduction = currentCash;
      bankDeduction = cost - currentCash;
    }

    try {
      // 1. Create corporation in cloud DB FIRST to guarantee no funds are deducted if an error occurs
      const corpId = await AppDB.createCorporation(name, desc, username);

      // 2. Only deduct fee and save state AFTER successful cloud insertion
      GameEngine.state.cash = Math.max(0, currentCash - cashDeduction);
      GameEngine.state.bank = Math.max(0, currentBank - bankDeduction);
      GameEngine.state.netWorth = GameEngine.calculateNetWorth();
      await AppDB.savePlayerState(username, GameEngine.state);

      // 3. Update local state immediately so user sees their company
      window.activeCorporationState = {
        id: corpId,
        name: name,
        founder: username,
        treasury: 0,
        members: [username],
        contributions: { [username]: 0, ...(desc ? { _desc: desc } : {}) },
        projects: [],
        isAdminCorp: false,
        desc: desc
      };

      showToast('مبروك التأسيس!',`تم تأسيس شركة مشتركة باسم"${name}" بنجاح وخصم 100 مليار جنيه رسوم تأسيس.`,'success');
      playMenuSound('success');
      renderAll();
      renderCorporationsTab();

    } catch (err) {
      console.error('[Corp Creation Error]', err);
      showToast('فشل التأسيس', err.message ||'حدث خطأ أثناء تأسيس الشركة، لم يتم خصم أي أموال.','error');
    }
  }

  async function joinCorporationAction(corpId) {
    try {
      const username = GameEngine.activeUsername || (GameEngine.state && GameEngine.state.username);
      if (!username) throw new Error('يرجى تسجيل الدخول أولاً.');
      await AppDB.joinCorporation(corpId, username);
      showToast('تم الانضمام!','لقد انضممت بنجاح لعضوية الشركة المشتركة. يمكنك الآن ضخ المساهمات ومتابعة الأرباح.','success');
      playMenuSound('success');
    } catch (err) {
      showToast('فشل الانضمام', err.message,'error');
    }
  }

  async function contributeCorporationAction(corpId) {
    const amountInput = document.getElementById('contribute-corp-amount');
    if (!amountInput) return;

    const amount = Math.floor(Number(amountInput.value));
    if (isNaN(amount) || amount <= 0) {
      showToast('مبلغ غير صحيح','يرجى إدخال قيمة مساهمة صحيحة أكبر من الصفر.','error');
      return;
    }

    const username = GameEngine.activeUsername || (GameEngine.state && GameEngine.state.username);
    if (!username) {
      showToast('غير مسجل','يرجى تسجيل الدخول أولاً للمساهمة في الشركة.','error');
      return;
    }

    const currentCash = GameEngine.state.cash || 0;
    const currentBank = GameEngine.state.bank || 0;
    const totalLiquidity = currentCash + currentBank;

    if (totalLiquidity < amount) {
      showToast('رصيد غير كافي',`لا تملك سيولة كافية. المبلغ المطلوب: ${amount.toLocaleString()} EGP (إجمالي الكاش والبنك لديك: ${totalLiquidity.toLocaleString()} EGP)`,'error');
      return;
    }

    if (!confirm(`هل أنت متأكد من رغبتك في ضخ ${amount.toLocaleString()} EGP من رصيدك في خزينة الشركة المشتركة؟`)) return;

    let cashDeduction = 0;
    let bankDeduction = 0;
    if (currentCash >= amount) {
      cashDeduction = amount;
    } else {
      cashDeduction = currentCash;
      bankDeduction = amount - currentCash;
    }

    try {
      // 1. Transaction to cloud first to guarantee money is not lost if error occurs
      await AppDB.contributeToCorporation(corpId, username, amount);

      // 2. Deduct local funds and save state
      GameEngine.state.cash -= cashDeduction;
      GameEngine.state.bank -= bankDeduction;
      GameEngine.state.netWorth = GameEngine.calculateNetWorth();
      await AppDB.savePlayerState(username, GameEngine.state);

      if (window.activeCorporationState && window.activeCorporationState.id === corpId) {
        window.activeCorporationState.treasury = (window.activeCorporationState.treasury || 0) + amount;
        window.activeCorporationState.totalContributions = (window.activeCorporationState.totalContributions || 0) + amount;
        if (!window.activeCorporationState.contributions) window.activeCorporationState.contributions = {};
        window.activeCorporationState.contributions[username] = (window.activeCorporationState.contributions[username] || 0) + amount;
      }
      
      showToast('تم ضخ السيولة!',`لقد ساهمت بـ ${amount.toLocaleString()} EGP في خزينة الشركة بنجاح وتمت زيادة رصيد الخزينة وحصتك من الأرباح.`,'success');
      playMenuSound('success');
      
      amountInput.value ='';
      renderAll();
      renderCorporationsTab();

    } catch (err) {
      showToast('فشل المساهمة', err.message,'error');
    }
  }

  async function buyCorporationProjectAction(corpId, projectId, cost) {
    try {
      await AppDB.buyCorporationProject(corpId, projectId, cost);
      showToast('تم الشراء بنجاح!','تم شراء المشروع العملاق وسوف يساهم في مضاعفة أرباح الشركاء والتحالف بالكامل من الآن.','success');
      playMenuSound('success');
    } catch (err) {
      showToast('فشل شراء المشروع', err.message,'error');
    }
  }

  async function loadAdminPlayerWorkspace(playerState) {
    const listSelect = document.getElementById('admin-player-backups-select');
    if (!listSelect) return;

    listSelect.innerHTML ='<option value="">جاري جلب النسخ الاحتياطية...</option>';

    try {
      const dates = await AppDB.getPlayerBackupDates(playerState.username);
      listSelect.innerHTML ='';
      if (dates.length === 0) {
        listSelect.innerHTML ='<option value="">لا توجد نسخ احتياطية متوفرة...</option>';
      } else {
        dates.forEach(d => {
          const opt = document.createElement('option');
          opt.value = d;
          opt.textContent =`نسخة يوم ${d}`;
          listSelect.appendChild(opt);
        });
      }
    } catch (err) {
      listSelect.innerHTML ='<option value="">فشل جلب النسخ الاحتياطية</option>';
    }
  }

  async function leaveCorporationAction(corpId) {
    const corp = window.activeCorporationState;
    const corpName = corp ? corp.name :'الشركة';
    const currentUsername = GameEngine.activeUsername || (GameEngine.state && GameEngine.state.username);
    const isFounder = corp && corp.founder === currentUsername;

    let confirmMsg =`هل أنت متأكد من رغبتك في مغادرة شركة"${corpName}"؟`;
    if (isFounder) {
      const remainingCount = (corp.members || []).filter(m => m !== currentUsername).length;
      if (remainingCount > 0) {
        confirmMsg =`تنبيه: أنت مؤسس شركة"${corpName}". مغادرتك ستؤدي إلى نقل ملكية الشركة تلقائياً إلى العضو التالي. هل ترغب في المتابعة؟`;
      } else {
        confirmMsg =`تنبيه: أنت العضو الوحيد ومؤسس شركة"${corpName}". مغادرتك ستؤدي إلى حل وحذف الشركة نهائياً. هل ترغب في المتابعة؟`;
      }
    }

    if (!confirm(confirmMsg)) return;

    try {
      showToast('جاري المغادرة...','جاري معالجة الخروج من الشركة...','info');
      await AppDB.leaveCorporation(corpId, currentUsername);
      window.activeCorporationState = null;
      showToast('تمت المغادرة',`لقد غادرت شركة"${corpName}" بنجاح.`,'success');
      if (typeof playMenuSound ==='function') playMenuSound('cash');

      const list = await AppDB.getCorporationsList();
      window.lastCorporationsCache = list;
      renderCorporationsTab();
    } catch (e) {
      showToast('خطأ في المغادرة', e.message ||'فشل الخروج من الشركة.','error');
    }
  }

  async function kickCorpMemberAction(corpId, targetUsername) {
    if (!confirm(`هل أنت متأكد من طرد"${targetUsername}" من الشركة؟ سيتم احتساب حصته كأموال معلقة في الخزينة.`)) return;
    try {
      await AppDB.kickCorpMember(corpId, targetUsername);
      showToast('تم الطرد',`تم طرد ${targetUsername} من الشركة بنجاح.`,'success');
      renderCorporationsTab();
    } catch (e) {
      showToast('خطأ', e.message ||'فشل تنفيذ عملية الطرد.','error');
    }
  }

  async function editCorpInfoAction(corpId) {
    const newName = document.getElementById('edit-corp-name')?.value?.trim();
    const newDesc = document.getElementById('edit-corp-desc')?.value?.trim();
    if (!newName) { showToast('خطأ','يجب إدخال اسم صالح للشركة.','error'); return; }
    try {
      await AppDB.editCorpInfo(corpId, newName, newDesc);
      showToast('تم الحفظ','تم تحديث بيانات الشركة بنجاح.','success');
      renderCorporationsTab();
    } catch (e) {
      showToast('خطأ', e.message ||'فشل تحديث البيانات.','error');
    }
  }

  async function transferCorpOwnershipAction(corpId) {
    const target = document.getElementById('transfer-corp-target')?.value;
    if (!target) { showToast('خطأ','يجب اختيار عضو لنقل الملكية إليه.','error'); return; }
    if (!confirm(`هل أنت متأكد من نقل ملكية الشركة إلى"${target}"؟ لن تتمكن من التراجع!`)) return;
    try {
      await AppDB.transferCorpOwnership(corpId, target);
      showToast('تم النقل',`انتقلت ملكية الشركة إلى ${target}.`,'success');
      renderCorporationsTab();
    } catch (e) {
      showToast('خطأ', e.message ||'فشل نقل الملكية.','error');
    }
  }

  async function dissolveCorpAction(corpId) {
    if (!confirm('️ تحذير: سيتم حل الشركة نهائياً وإعادة توزيع الخزينة على المساهمين بحسب حصصهم. هل تريد المتابعة؟')) return;
    if (!confirm('تأكيد أخير: هذا الإجراء لا رجعة فيه. هل أنت متأكد 100%؟')) return;
    try {
      await AppDB.dissolveCorporation(corpId);
      window.activeCorporationState = null;
      showToast('تم الحل','تم حل الشركة وإعادة توزيع الخزينة على المساهمين بنجاح.','success');
      renderCorporationsTab();
    } catch (e) {
      showToast('خطأ', e.message ||'فشل حل الشركة.','error');
    }
  }

  async function promoteCorpMemberAction(corpId, targetUsername, role) {
    const roleName = role ==='cfo' ?'مدير مالي (CFO)' :'مساهم عادي';
    if (!confirm(`هل أنت متأكد من تغيير رتبة"${targetUsername}" إلى"${roleName}"؟`)) return;
    try {
      await AppDB.promoteCorpMember(corpId, targetUsername, role);
      showToast('تحديث الرتبة',`تم تغيير رتبة اللاعب ${targetUsername} بنجاح.`,'success');
      renderCorporationsTab();
    } catch (e) {
      showToast('خطأ رتبة', e.message,'error');
    }
  }

  async function payoutFromCorpTreasuryAction(corpId) {
    const target = document.getElementById('payout-corp-target')?.value;
    const amount = Math.floor(Number(document.getElementById('payout-corp-amount')?.value));

    if (!target) {
      showToast('خطأ تحويل','يجب اختيار العضو المستهدف للتحويل.','error');
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      showToast('خطأ تحويل','يرجى إدخال مبلغ تحويل صحيح وموجب.','error');
      return;
    }

    if (!confirm(`هل أنت متأكد من سحب ${amount.toLocaleString()} EGP من خزينة التحالف وتحويلها مباشرة ككاش إلى"${target}"؟`)) return;

    try {
      await AppDB.payoutFromCorpTreasury(corpId, target, amount);
      showToast('تم التحويل',`تم سحب وتحويل ${amount.toLocaleString()} EGP بنجاح إلى حساب ${target}.`,'success');
      playMenuSound('success');
      
      const amtInput = document.getElementById('payout-corp-amount');
      if (amtInput) amtInput.value ='';
      
      renderCorporationsTab();
    } catch (e) {
      showToast('فشل التحويل', e.message,'error');
    }
  }

  // --- Cars UI & Actions ---
  function renderCarsTab() {
    const s = GameEngine.state;
    if (!s) return;
    const container = document.getElementById('cars-dealership-list');
    if (!container) return;

    let html ='';
    Object.keys(GameEngine.CAR_TEMPLATES).forEach(carId => {
      const car = GameEngine.CAR_TEMPLATES[carId];
      const ownedRefs = (s.ownedCars || []).filter(c => c.id === carId);
      const ownedCount = ownedRefs.length;
      const isActive = s.activeCar === carId;

      let ownedSection ='';
      if (ownedCount > 0) {
        ownedSection +=`
          <div class="mt-4 border-t border-slate-900 pt-3 space-y-2 text-right">
            <div class="text-[10px] text-slate-500 font-bold">المقتنيات المملوكة لك (${ownedCount} سيارة):</div>`;
        s.ownedCars.forEach((carRef, absIdx) => {
          if (carRef.id !== carId) return;
          const isRented = carRef.rentStatus ==='rented';
          ownedSection +=`
            <div class="flex justify-between items-center bg-slate-950/60 p-2 rounded-lg border border-slate-900 text-[10px]">
              <div class="flex flex-col text-right">
                <span class="text-white font-bold">النسخة #${absIdx + 1}</span>
                <span class="${isRented ?'text-emerald-400 font-bold' :'text-slate-400'}">${isRented ?`مؤجرة (+${(car.rentalIncomePerTick - car.maintenanceCostPerTick).toLocaleString()} ج.م/س)` :'مركونة بالمرآب'}</span>
              </div>
              <div class="flex gap-1">
                ${isRented ?`
                  <button onclick="window.UI.rentCarAction('${carId}','idle', ${absIdx})" class="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold transition">إيقاف الإيجار</button>` :`
                  <button onclick="window.UI.rentCarAction('${carId}','rented', ${absIdx})" class="px-2 py-1 bg-indigo-600/30 hover:bg-indigo-600 border border-indigo-500/20 text-indigo-300 hover:text-white rounded font-bold transition">تأجير</button>`}
                
                ${(car.cooldownReduction || car.interestBonus) && !isRented ?`
                  ${isActive ?`
                    <button onclick="window.UI.setActiveCarAction(null)" class="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded font-bold transition">إيقاف تفعيل</button>` :`
                    <button onclick="window.UI.setActiveCarAction('${carId}')" class="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/20 text-emerald-400 hover:text-white rounded font-bold transition">قيادة </button>`}` :''}
                
                <button onclick="window.UI.sellCarAction('${carId}', ${absIdx})" class="px-1.5 py-1 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded font-bold transition"><i class="fa-solid fa-trash"></i> بيع</button>
              </div>
            </div>`;
        });
        ownedSection +=`</div>`;
      }

      html +=`
        <div class="glass-panel p-5 rounded-2xl border ${isActive ?'border-amber-500/40 bg-amber-950/5' :'border-slate-800 bg-slate-950/20'} flex flex-col justify-between space-y-4 text-right">
          <div>
            <div class="flex justify-between items-start gap-2">
              <h4 class="text-xs font-black text-white">${car.name}</h4>
              ${isActive ?'<span class="text-[9px] bg-amber-500/20 border border-amber-500/30 text-amber-400 px-2 py-0.5 rounded-full font-bold">نشطة </span>' :''}
            </div>
            <p class="text-[10px] text-slate-400 mt-1 leading-relaxed">${car.desc}</p>
            
            <div class="grid grid-cols-2 gap-2 mt-4 bg-slate-950/50 p-2.5 rounded-xl border border-slate-900 text-[10px] text-right">
              <div>
                <span class="text-slate-500 block">سعر الشراء</span>
                <span class="text-slate-300 font-bold numbers-font text-xs">${car.cost.toLocaleString()} EGP</span>
              </div>
              <div>
                <span class="text-slate-500 block">دخل الإيجار الصافي</span>
                <span class="text-emerald-400 font-black numbers-font text-xs">+${(car.rentalIncomePerTick - car.maintenanceCostPerTick).toLocaleString()} ج.م / س</span>
              </div>
            </div>
          </div>
          
          <div class="space-y-2">
            <button onclick="window.UI.buyCarAction('${carId}')" class="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition">شراء سيارة جديدة</button>
            ${ownedSection}
          </div>
        </div>`;
    });

    container.innerHTML = html;
  }

  async function buyCarAction(carId) {
    try {
      const car = GameEngine.CAR_TEMPLATES[carId];
      if (!confirm(`هل أنت متأكد من شراء سيارة ${car.name} بمبلغ ${car.cost.toLocaleString()} EGP؟`)) return;
      await GameEngine.buyCar(carId);
      showToast('مبروك السيارة! ️',`تم شراء ${car.name} بنجاح وإضافتها للمرأب.`,'success');
      playMenuSound('success');
      renderAll();
    } catch (err) {
      showToast('فشل الشراء', err.message,'error');
    }
  }

  async function setActiveCarAction(carId) {
    try {
      await GameEngine.setActiveCar(carId);
      showToast('السيارة النشطة', carId === null ?'تم إلغاء تفعيل السيارة النشطة.' :`تم تفعيل السيارة كسيارة شخصية بنجاح!`,'success');
      playMenuSound('success');
      renderAll();
    } catch (err) {
      showToast('خطأ التفعيل', err.message,'error');
    }
  }

  async function rentCarAction(carId, rentStatus, index) {
    try {
      await GameEngine.rentCar(carId, rentStatus, index);
      showToast('حالة الإيجار', rentStatus ==='rented' ?'بدأ تأجير السيارة بنجاح وتدفق الدخل السلبي.' :'تم إيقاف الإيجار وإعادة السيارة للمرأب.','success');
      playMenuSound('success');
      renderAll();
    } catch (err) {
      showToast('خطأ التأجير', err.message,'error');
    }
  }

  async function sellCarAction(carId, index) {
    try {
      const car = GameEngine.CAR_TEMPLATES[carId];
      const sellPrice = Math.floor(car.cost * 0.75);
      if (!confirm(`هل أنت متأكد من بيع سيارة ${car.name} واسترداد ${sellPrice.toLocaleString()} EGP؟`)) return;
      await GameEngine.sellCar(carId, index);
      showToast('تم البيع',`تم بيع السيارة بنجاح وإيداع ${sellPrice.toLocaleString()} EGP بالبنك.`,'success');
      playMenuSound('success');
      renderAll();
    } catch (err) {
      showToast('خطأ البيع', err.message,'error');
    }
  }

  // --- Smuggling UI & Actions ---
  function renderSmugglingSection() {
    const s = GameEngine.state;
    if (!s) return;

    if (!s.smugglingFleet) s.smugglingFleet = { speedboat: 0, plane: 0, ship: 0 };
    if (!s.activeSmugglingJobs) s.activeSmugglingJobs = [];

    const speedCount = document.getElementById('fleet-count-speedboat');
    if (speedCount) speedCount.textContent = s.smugglingFleet.speedboat || 0;

    const planeCount = document.getElementById('fleet-count-plane');
    if (planeCount) planeCount.textContent = s.smugglingFleet.plane || 0;

    const shipCount = document.getElementById('fleet-count-ship');
    if (shipCount) shipCount.textContent = s.smugglingFleet.ship || 0;

    const routesList = document.getElementById('smuggling-routes-list');
    if (routesList) {
      let routesHtml ='';
      Object.keys(GameEngine.SMUGGLING_ROUTES).forEach(routeId => {
        const route = GameEngine.SMUGGLING_ROUTES[routeId];
        const vehicleButtons = route.requiredVehicles.map(vType => {
          const vDef = GameEngine.SMUGGLING_VEHICLES[vType];
          const hasV = s.smugglingFleet[vType] > 0;
          return`
            <button onclick="window.UI.startSmugglingJobAction('${routeId}','${vType}')" 
                    ${!hasV ?'disabled' :''} 
                    class="px-2 py-1 text-[9px] rounded font-bold transition ${hasV ?'bg-rose-700/30 hover:bg-rose-600 text-rose-300 border border-rose-500/20' :'bg-slate-900 text-slate-600 cursor-not-allowed border border-slate-800'}">
              تهريب عبر: ${vDef.name.split('')[0]}
            </button>`;
        }).join('');

        routesHtml +=`
          <div class="p-3.5 bg-slate-950 border border-slate-800 rounded-xl hover:border-slate-700 transition flex flex-col justify-between text-right">
            <div>
              <h6 class="text-xs font-black text-white">${route.name}</h6>
              <p class="text-[10px] text-slate-500 mt-1 leading-relaxed">${route.desc}</p>
              
              <div class="grid grid-cols-3 gap-1 mt-3 bg-slate-900 p-2 rounded-lg border border-slate-950 text-[9px] text-right">
                <div>
                  <span class="text-slate-600 block">المدة:</span>
                  <span class="text-white font-bold">${route.durationTicks}ث</span>
                </div>
                <div>
                  <span class="text-slate-600 block">الأرباح:</span>
                  <span class="text-emerald-400 font-bold numbers-font">${(route.yieldCash / 1000000000).toFixed(1)}B</span>
                </div>
                <div>
                  <span class="text-slate-600 block">الخطر:</span>
                  <span class="text-rose-400 font-black">${route.riskPct}%</span>
                </div>
              </div>
            </div>
            
            <div class="mt-3 border-t border-slate-900 pt-2 flex flex-wrap gap-1.5 justify-end">
              ${vehicleButtons}
            </div>
          </div>`;
      });
      routesList.innerHTML = routesHtml;
    }

    updateActiveSmugglingJobsInDOM();
  }

  function updateActiveSmugglingJobsInDOM() {
    const s = GameEngine.state;
    if (!s) return;
    const activeJobsContainer = document.getElementById('smuggling-active-jobs');
    if (!activeJobsContainer) return;

    if (!s.activeSmugglingJobs || s.activeSmugglingJobs.length === 0) {
      activeJobsContainer.innerHTML =`<div class="text-center text-slate-600 text-xs py-4">لا توجد عمليات شحن نشطة حالياً.</div>`;
      return;
    }

    let jobsHtml ='';
    const now = Date.now();

    s.activeSmugglingJobs.forEach(job => {
      const route = GameEngine.SMUGGLING_ROUTES[job.routeId];
      const vehicle = GameEngine.SMUGGLING_VEHICLES[job.vehicleType];
      if (!route || !vehicle) return;

      const remainingMs = Math.max(0, job.endTime - now);
      const remainingSec = Math.ceil(remainingMs / 1000);
      const totalSec = route.durationTicks || 1;
      const progressPct = Math.min(100, ((totalSec - remainingSec) / totalSec) * 100);

      jobsHtml +=`
        <div class="p-3 bg-slate-950 border border-slate-900 rounded-xl space-y-2 text-xs text-right">
          <div class="flex justify-between items-center text-[10px]">
            <span class="text-white font-bold flex items-center gap-1">
              <i class="fa-solid fa-ship text-rose-500 animate-pulse"></i>
              <span>${route.name}</span>
            </span>
            <span class="text-slate-400 font-bold">عبر: ${vehicle.name}</span>
          </div>

          <div class="flex justify-between items-center text-[10px] text-slate-500">
            <span>متبقي: <strong class="text-amber-400 numbers-font">${remainingSec}ث</strong></span>
            <span>التقدم: <strong class="text-white numbers-font">${progressPct.toFixed(0)}%</strong></span>
          </div>

          <div class="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
            <div class="h-full bg-gradient-to-l from-rose-600 to-rose-400 rounded-full transition-all duration-300" style="width: ${progressPct}%"></div>
          </div>
        </div>`;
    });

    activeJobsContainer.innerHTML = jobsHtml;
  }

  async function buySmugglingVehicleAction(vehicleId) {
    try {
      const v = GameEngine.SMUGGLING_VEHICLES[vehicleId];
      if (!confirm(`هل أنت متأكد من شراء ${v.name} بمبلغ ${v.cost.toLocaleString()} EGP؟`)) return;
      await GameEngine.buySmugglingVehicle(vehicleId);
      showToast('مركبة جديدة بالأسطول ️',`تم شراء ${v.name} بنجاح وإضافتها لأسطول التهريب.`,'success');
      playMenuSound('success');
      renderAll();
    } catch (err) {
      showToast('فشل الشراء', err.message,'error');
    }
  }

  async function startSmugglingJobAction(routeId, vehicleType) {
    try {
      const route = GameEngine.SMUGGLING_ROUTES[routeId];
      if (!confirm(`هل أنت متأكد من بدء عملية شحن"${route.name}" بتكلفة تجميد مركبة شحن؟`)) return;
      await GameEngine.startSmugglingJob(routeId, vehicleType);
      showToast('تم انطلاق الشحنة ️','انطلقت المركبة وتظهر الآن في شريط التقدم النشط.','success');
      playMenuSound('success');
      renderAll();
    } catch (err) {
      showToast('خطأ انطلاق الشحنة', err.message,'error');
    }
  }

  function switchAssetsSubtab(subtabId) {
    const reBtn = document.getElementById('btn-subtab-realestate');
    const carsBtn = document.getElementById('btn-subtab-cars');
    const reContent = document.getElementById('subtab-content-realestate');
    const carsContent = document.getElementById('subtab-content-cars');

    if (subtabId ==='realestate') {
      if (reBtn) reBtn.className ='pb-2 text-sm font-black text-indigo-400 border-b-2 border-indigo-500 focus:outline-none transition';
      if (carsBtn) carsBtn.className ='pb-2 text-sm font-black text-slate-400 border-b-2 border-transparent hover:text-white focus:outline-none transition';
      if (reContent) reContent.classList.remove('hidden');
      if (carsContent) carsContent.classList.add('hidden');
    } else {
      if (carsBtn) carsBtn.className ='pb-2 text-sm font-black text-indigo-400 border-b-2 border-indigo-500 focus:outline-none transition';
      if (reBtn) reBtn.className ='pb-2 text-sm font-black text-slate-400 border-b-2 border-transparent hover:text-white focus:outline-none transition';
      if (carsContent) carsContent.classList.remove('hidden');
      if (reContent) reContent.classList.add('hidden');
      renderCarsTab();
    }
  }
  window.switchAssetsSubtab = switchAssetsSubtab;

  async function upgradeCorporationLevelAction(corpId, cost) {
    if (!confirm(`هل أنت متأكد من ترقية مستوى التحالف المشترك بقيمة ${cost.toLocaleString()} EGP من الخزينة؟`)) return;
    try {
      await AppDB.upgradeCorporationLevel(corpId, cost);
      showToast('تمت الترقية','تم ترقية مستوى التحالف المشترك بنجاح! تم زيادة دعم أرباح الأعضاء بمقدار +5% إضافية.','success');
      playMenuSound('success');
      renderCorporationsTab();
    } catch (e) {
      showToast('فشل الترقية', e.message,'error');
    }
  }

  async function adminQuickJailAction(username) {
    if (!username) return;
    if (!confirm(`هل أنت متأكد من إرسال اللاعب المشبوه"${username}" إلى السجن لمدة 5 دقائق؟`)) return;
    try {
      await AppDB.adminSetPlayerJail(username, 300);
      showToast('عقوبة السجن السريعة',`تم إيداع اللاعب ${username} في السجن بنجاح.`,'warning');
      logAdminAction(`إجراء سريع: سجن اللاعب المشبوه ${username}`);
      renderAdminAnalyticsDashboard();
    } catch (err) {
      showToast('فشل سجن اللاعب', err.message,'error');
    }
  }

  async function adminQuickBanAction(username) {
    if (!username) return;
    if (!confirm(`هل أنت متأكد من حظر حساب اللاعب المشبوه"${username}" نهائياً؟`)) return;
    try {
      await AppDB.adminBanPlayer(username);
      showToast('حظر الحساب السريع',`تم حظر حساب اللاعب المشبوه ${username} نهائياً.`,'success');
      logAdminAction(`إجراء سريع: حظر حساب اللاعب المشبوه ${username}`);
      renderAdminAnalyticsDashboard();
    } catch (err) {
      showToast('فشل حظر اللاعب', err.message,'error');
    }
  }

  async function manualSaveProgressAction() {
    const btns = [
      document.getElementById('btn-save-progress-cloud'),
      document.getElementById('btn-save-progress-cloud-ingame'),
      document.getElementById('btn-save-progress-cloud-mobile')
    ].filter(Boolean);

    if (!GameEngine.activeUsername) {
      showToast('تنبيه','يرجى تسجيل الدخول أولاً لحفظ التقدم.','warning');
      return;
    }

    btns.forEach(btn => {
      btn.disabled = true;
      btn.innerHTML ='<i class="fa-solid fa-spinner fa-spin text-xs"></i><span>جاري الحفظ...</span>';
    });

    try {
      const res = await AppDB.syncProgressToCloud(GameEngine.activeUsername);
      if (res.success) {
        showToast('تم التزامن السحابي ️', res.message,'success');
        playMenuSound('success');
      } else {
        showToast('تنبيه الحفظ ⏳', res.message,'warning');
      }
    } catch (e) {
      showToast('خطأ في الحفظ', e.message ||'تعذر الاتصال بالسيرفر.','error');
    } finally {
      btns.forEach(btn => {
        btn.disabled = false;
        btn.innerHTML ='<i class="fa-solid fa-cloud-arrow-up text-xs"></i><span>حفظ السحابة</span>';
      });
    }
  }

  // Attach global click event delegation for save buttons
  document.addEventListener('click', (e) => {
    const target = e.target.closest('#btn-save-progress-cloud, #btn-save-progress-cloud-ingame, #btn-save-progress-cloud-mobile');
    if (target) {
      manualSaveProgressAction();
    }
  });

  // ── شركة الاستيراد والتصدير الدولية (Import & Export Global Company UI) ──────────
  let activeTradeSubtab ='catalog';
  let preselectedExportCommodity = null;

  function switchTradeSubtab(subtabId) {
    activeTradeSubtab = subtabId;
    const subtabs = ['catalog','warehouse','buyers','shipments'];
    subtabs.forEach(tab => {
      const btn = document.getElementById(`btn-trade-subtab-${tab}`);
      const content = document.getElementById(`trade-content-${tab}`);
      if (tab === subtabId) {
        if (btn) {
          btn.className ='trade-subtab-btn px-4 py-2 rounded-xl font-bold text-xs bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 transition flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/10';
        }
        if (content) content.classList.remove('hidden');
      } else {
        if (btn) {
          btn.className ='trade-subtab-btn px-4 py-2 rounded-xl font-bold text-xs bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800 transition flex items-center gap-2 cursor-pointer';
        }
        if (content) content.classList.add('hidden');
      }
    });

    renderTradePanel();
  }
  window.switchTradeSubtab = switchTradeSubtab;

  function formatTradeDuration(totalSec) {
    if (!totalSec || totalSec <= 0) return'0 ثانية';
    if (totalSec >= 3600) {
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      return m > 0 ?`${h} س و ${m} دقيقة` :`${h} ساعة`;
    }
    if (totalSec >= 60) {
      const m = Math.floor(totalSec / 60);
      const s = totalSec % 60;
      return s > 0 ?`${m} د و ${s} ث` :`${m} دقيقة`;
    }
    return`${totalSec} ثانية`;
  }

  function renderTradeIcon(iconStr) {
    if (!iconStr) return'<i class="fa-solid fa-box text-cyan-400 text-xl"></i>';
    if (typeof iconStr ==='string' && iconStr.startsWith('fa-')) {
      return`<i class="fa-solid ${iconStr} text-cyan-400 text-xl"></i>`;
    }
    return iconStr;
  }

  function renderTradePanel() {
    if (!GameEngine || typeof GameEngine.getTradeCompanyState !=='function') return;
    const tradeInfo = GameEngine.getTradeCompanyState();

    // 1. Warehouse Storage Meter & Stats
    const totalOccupied = tradeInfo.storedUnits + tradeInfo.incomingUnits;
    const capacity = Math.min(50, tradeInfo.warehouseCapacity || 10);
    const isMaxCapacity = capacity >= 50;
    const pct = Math.min(100, Math.round((totalOccupied / capacity) * 100));

    const statsEl = document.getElementById('trade-warehouse-stats');
    if (statsEl) statsEl.textContent =`${totalOccupied} / ${capacity} حاويات ${isMaxCapacity ?'(الحد الأقصى)' :`(${pct}%)`}`;

    const barEl = document.getElementById('trade-warehouse-bar');
    if (barEl) {
      barEl.style.width =`${pct}%`;
      if (pct >= 90) {
        barEl.className ='bg-gradient-to-r from-rose-500 to-amber-500 h-full rounded-full transition-all duration-500';
      } else {
        barEl.className ='bg-gradient-to-r from-cyan-500 to-emerald-500 h-full rounded-full transition-all duration-500';
      }
    }

    const storedEl = document.getElementById('trade-stored-count');
    if (storedEl) storedEl.textContent =`مخزن: ${tradeInfo.storedUnits}`;
    const incomingEl = document.getElementById('trade-incoming-count');
    if (incomingEl) incomingEl.textContent =`في الطريق: ${tradeInfo.incomingUnits}`;
    const availableEl = document.getElementById('trade-available-count');
    if (availableEl) availableEl.textContent =`متاح: ${tradeInfo.availableSlots}`;

    const costBadge = document.getElementById('trade-upgrade-cost-badge');
    if (costBadge) {
      if (isMaxCapacity) {
        costBadge.textContent ='مكتمل (الحد الأقصى)';
        costBadge.className ='px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 text-[10px] font-bold';
      } else {
        costBadge.textContent =`${tradeInfo.upgradeCost.toLocaleString()} EGP`;
        costBadge.className ='px-2 py-0.5 rounded bg-slate-950/50 text-cyan-200 text-[10px] numbers-font font-bold';
      }
    }

    const totalProfitEl = document.getElementById('trade-total-profit');
    if (totalProfitEl) {
      totalProfitEl.textContent = `${(tradeInfo.totalProfitEarned || 0).toLocaleString()} جنيه`;
    }

    const completedShipmentsEl = document.getElementById('trade-completed-shipments');
    if (completedShipmentsEl) {
      completedShipmentsEl.textContent = `${(tradeInfo.totalShipmentsCompleted || 0).toLocaleString()} شحنة`;
    }

    const quotaEl = document.getElementById('trade-daily-quota');
    const quotaPctEl = document.getElementById('trade-daily-quota-pct');
    const quotaBarEl = document.getElementById('trade-daily-quota-bar');
    if (quotaEl) {
      const dailyProfit = tradeInfo.dailyTradeProfit || 0;
      const maxDaily = tradeInfo.dailyTradeMaxProfit || 500000;
      const quotaPct = Math.min(100, Math.round((dailyProfit / maxDaily) * 100));
      quotaEl.textContent = `${dailyProfit.toLocaleString()} / ${maxDaily.toLocaleString()} EGP`;
      if (dailyProfit >= maxDaily) {
        quotaEl.className = 'text-xs sm:text-sm font-black text-rose-400 numbers-font mt-1.5 truncate';
      } else {
        quotaEl.className = 'text-xs sm:text-sm font-black text-amber-300 numbers-font mt-1.5 truncate';
      }
      if (quotaPctEl) {
        quotaPctEl.textContent = `${quotaPct}%`;
        quotaPctEl.className = dailyProfit >= maxDaily 
          ? 'text-[10px] font-black numbers-font px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30'
          : 'text-[10px] font-black numbers-font px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30';
      }
      if (quotaBarEl) {
        quotaBarEl.style.width = `${quotaPct}%`;
        quotaBarEl.className = dailyProfit >= maxDaily 
          ? 'bg-gradient-to-r from-rose-500 to-red-400 h-full rounded-full transition-all duration-300'
          : 'bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full transition-all duration-300';
      }
    }

    const upgradeBtn = document.getElementById('btn-upgrade-warehouse');
    if (upgradeBtn) {
      if (isMaxCapacity) {
        upgradeBtn.disabled = true;
        upgradeBtn.className ='w-full md:w-auto px-5 py-3 rounded-xl bg-slate-800/80 text-slate-400 font-bold text-xs flex items-center justify-center gap-2 shrink-0 cursor-not-allowed border border-slate-700/60';
        upgradeBtn.innerHTML =`
          <i class="fa-solid fa-lock text-amber-400"></i>
          <span>أقصى طاقة استيعابية للمستودع (50 حاوية)</span>
          <span class="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 text-[10px] font-bold">مكتمل </span>`;
      } else {
        upgradeBtn.disabled = false;
        upgradeBtn.className ='w-full md:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-xs transition shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 shrink-0 cursor-pointer';
        upgradeBtn.innerHTML =`
          <i class="fa-solid fa-expand"></i>
          <span>توسعة المستودع (+10 حاويات)</span>
          <span id="trade-upgrade-cost-badge" class="px-2 py-0.5 rounded bg-slate-950/50 text-cyan-200 text-[10px] numbers-font font-bold">${tradeInfo.upgradeCost.toLocaleString()} EGP</span>`;
        upgradeBtn.onclick = () => {
          try {
            const res = GameEngine.upgradeWarehouse();
            playMenuSound('success');
            showToast('توسعة المستودع',`تمت توسعة المستودع الرئيسي بنجاح! السعة الاستيعابية الآن: ${res.newCapacity} حاوية.`,'success');
            renderTradePanel();
          } catch (err) {
            showToast('فشل التوسعة', err.message,'error');
          }
        };
      }
    }

    // Active Shipments Badge
    const activeBadge = document.getElementById('trade-active-badge');
    const activeCount = (tradeInfo.activeImports ? tradeInfo.activeImports.length : 0) + (tradeInfo.activeExports ? tradeInfo.activeExports.length : 0);
    if (activeBadge) {
      if (activeCount > 0) {
        activeBadge.textContent = activeCount;
        activeBadge.classList.remove('hidden');
      } else {
        activeBadge.classList.add('hidden');
      }
    }

    // 2. Render Subtabs Content
    if (activeTradeSubtab ==='catalog') {
      renderTradeCatalog(tradeInfo);
    } else if (activeTradeSubtab ==='warehouse') {
      renderTradeWarehouse(tradeInfo);
    } else if (activeTradeSubtab ==='buyers') {
      renderTradeBuyers(tradeInfo);
    } else if (activeTradeSubtab ==='shipments') {
      renderTradeShipments(tradeInfo);
    }
  }

  function renderTradeCatalog(tradeInfo) {
    const grid = document.getElementById('trade-catalog-grid');
    if (!grid) return;
    grid.innerHTML ='';

    const commodities = tradeInfo.commodities || {};
    const tierMeta = {'air_cargo': { badge:'شحن جوي سريع (Air Express)', color:'border-sky-500/30 bg-sky-500/10 text-sky-300' },'regional_freight': { badge:'شحن إقليمي بحري/بري (Freight)', color:'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' },'ocean_shipping': { badge:'شحن بحري حاويات (Ocean Shipping)', color:'border-purple-500/30 bg-purple-500/10 text-purple-300' },'mega_oceanic': { badge:'سفن عابرة للمحيطات (Mega Trans-Oceanic)', color:'border-amber-500/30 bg-amber-500/10 text-amber-300' }
    };

    const activeImportsCount = (tradeInfo.activeImports || []).filter(e => !e.claimed).length;
    const isImportFleetFull = activeImportsCount >= 2;

    Object.keys(commodities).forEach(key => {
      const c = commodities[key];
      const tierInfo = tierMeta[c.tier] || { badge: c.tierName ||'شحن دولي', color:'border-cyan-500/30 bg-cyan-500/10 text-cyan-300' };

      const minProfPct = Math.round(((c.baseSellMin - c.unitCost) / c.unitCost) * 100);
      const maxProfPct = Math.round(((Math.floor(c.baseSellMax * 1.08) - c.unitCost) / c.unitCost) * 100);

      const card = document.createElement('div');
      card.className ='glass-panel p-4 rounded-2xl border border-slate-800/80 hover:border-cyan-500/30 transition-all flex flex-col justify-between space-y-4 shadow-lg';
      card.innerHTML =`
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full border ${tierInfo.color}">${tierInfo.badge}</span>
            <span class="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
              <i class="fa-solid fa-clock text-cyan-400 text-[10px]"></i>
              <span>${formatTradeDuration(c.importDurationSec)}</span>
            </span>
          </div>

          <div class="flex items-start gap-3">
            <div class="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-2xl shrink-0 shadow-inner">
              ${renderTradeIcon(c.icon)}
            </div>
            <div>
              <h4 class="font-black text-sm text-white">${c.name}</h4>
              <p class="text-[11px] text-slate-400 leading-snug line-clamp-2 mt-0.5">${c.desc || c.name}</p>
            </div>
          </div>

          <div class="bg-slate-950/60 rounded-xl p-2.5 border border-slate-800/60 space-y-1.5 text-xs">
            <div class="flex justify-between items-center text-slate-400">
              <span>سعر استيراد الوحدة:</span>
              <span class="font-black text-white numbers-font">${c.unitCost.toLocaleString()} EGP</span>
            </div>
            <div class="flex justify-between items-center text-slate-400 text-[10px]">
              <span>شحن جمركي وميناء (5%):</span>
              <span class="font-bold text-amber-300 numbers-font">+${Math.floor(c.unitCost * 0.05).toLocaleString()} EGP</span>
            </div>
            <div class="flex justify-between items-center text-slate-400">
              <span>سعر البيع المتوقع:</span>
              <span class="font-bold text-amber-400 numbers-font">${c.baseSellMin.toLocaleString()} - ${c.baseSellMax.toLocaleString()} EGP</span>
            </div>
            <div class="flex justify-between items-center pt-1 border-t border-slate-800/50">
              <span class="text-cyan-300 font-bold">هامش الربح المتوقع:</span>
              <span class="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-black text-[10px] numbers-font">+${minProfPct}% إلى +${maxProfPct}%</span>
            </div>
          </div>
        </div>

        <div class="space-y-2 pt-2 border-t border-slate-800/60">
          <div class="flex items-center justify-between text-xs">
            <span class="text-slate-400 font-medium">كمية الاستيراد (حاويات):</span>
            <div class="flex items-center gap-1">
              <input type="number" id="trade-qty-input-${key}" min="1" max="${Math.min(10, Math.max(1, tradeInfo.availableSlots))}" value="1" class="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-black text-xs text-white numbers-font focus:border-cyan-500 focus:outline-none">
              <span class="text-[10px] text-slate-500">حاوية (أقصى 10)</span>
            </div>
          </div>
          <div class="flex justify-between text-[11px] text-slate-400 pb-1">
            <span>التكلفة الكلية (شامل 5% شحن وجمارك):</span>
            <span id="trade-total-cost-${key}" class="font-black text-cyan-300 numbers-font">${(c.unitCost + Math.floor(c.unitCost * 0.05)).toLocaleString()} EGP</span>
          </div>
          <button id="btn-import-order-${key}" class="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-xs transition shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 cursor-pointer ${isImportFleetFull ?'opacity-50 cursor-not-allowed' :''}" ${isImportFleetFull ?'disabled' :''}>
            <i class="fa-solid fa-plane-departure"></i>
            <span>${isImportFleetFull ?'أسطول الاستيراد مشغول (2/2) ️' :'تعاقد واستيراد البضاعة'}</span>
          </button>
        </div>`;

      grid.appendChild(card);

      const qtyInput = card.querySelector(`#trade-qty-input-${key}`);
      const costPreview = card.querySelector(`#trade-total-cost-${key}`);
      const importBtn = card.querySelector(`#btn-import-order-${key}`);

      if (qtyInput && costPreview) {
        qtyInput.addEventListener('input', () => {
          let val = parseInt(qtyInput.value) || 1;
          if (val < 1) val = 1;
          if (val > 10) {
            val = 10;
            qtyInput.value = 10;
          }
          if (tradeInfo.availableSlots > 0 && val > tradeInfo.availableSlots) {
            val = Math.min(10, tradeInfo.availableSlots);
            qtyInput.value = val;
          }
          const bCost = val * c.unitCost;
          const fee = Math.floor(bCost * 0.05);
          costPreview.textContent =`${(bCost + fee).toLocaleString()} EGP`;
        });
      }

      if (importBtn && qtyInput) {
        importBtn.addEventListener('click', () => {
          let qty = parseInt(qtyInput.value) || 1;
          if (qty > 10) qty = 10;
          try {
            const order = GameEngine.buyImportCargo(key, qty);
            playMenuSound('success');
            showToast('بدء الاستيراد الدولي',`تم توقيع أمر توريد ${qty} وحدة من"${c.name}" بتكلفة ${order.totalCost.toLocaleString()} EGP! الشحنة الآن في طريقها لمستودعك.`,'success');
            switchTradeSubtab('shipments');
          } catch (err) {
            showToast('تعذر الاستيراد', err.message,'error');
          }
        });
      }
    });
  }

  function renderTradeWarehouse(tradeInfo) {
    const grid = document.getElementById('trade-warehouse-grid');
    if (!grid) return;
    grid.innerHTML ='';

    const warehouse = tradeInfo.warehouse || {};
    const storedKeys = Object.keys(warehouse).filter(k => warehouse[k] > 0);

    if (storedKeys.length === 0) {
      grid.innerHTML =`
        <div class="col-span-full glass-panel p-8 rounded-2xl border border-dashed border-slate-800 text-center space-y-3">
          <div class="w-16 h-16 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-3xl">
            
          </div>
          <h4 class="font-black text-white text-base">المستودع خاوٍ من البضائع حالياً</h4>
          <p class="text-xs text-slate-400 max-w-md mx-auto">لم تقم باستيراد أي بضائع بعد، أو قمت ببيع وتصدير كامل المخزون المتوفر. تصفح دليل الاستيراد لطلب شحنات جديدة.</p>
          <button onclick="switchTradeSubtab('catalog')" class="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition cursor-pointer inline-flex items-center gap-2">
            <i class="fa-solid fa-boxes-packing"></i>
            <span>فتح دليل الاستيراد الدولي</span>
          </button>
        </div>`;
      return;
    }

    storedKeys.forEach(key => {
      const qty = warehouse[key];
      const c = tradeInfo.commodities[key] || { name: key, icon:'', baseSellMin: 0, baseSellMax: 0, unitCost: 0 };
      const estMinVal = qty * c.baseSellMin;
      const estMaxVal = Math.floor(qty * c.baseSellMax * 1.18);

      const card = document.createElement('div');
      card.className ='glass-panel p-5 rounded-2xl border border-slate-800 hover:border-emerald-500/30 transition-all flex flex-col justify-between space-y-4 shadow-lg';
      card.innerHTML =`
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-[10px]">جاهزة للتصدير والبيع</span>
            <span class="text-xs font-bold text-slate-400">مخزن: <span class="font-black text-emerald-400 numbers-font text-sm">${qty}</span> حاوية</span>
          </div>

          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-2xl shrink-0">
              ${renderTradeIcon(c.icon)}
            </div>
            <div>
              <h4 class="font-black text-white text-sm">${c.name}</h4>
              <p class="text-[11px] text-slate-400">تكلفة الشراء: ${c.unitCost.toLocaleString()} EGP للوحدة</p>
            </div>
          </div>

          <div class="bg-slate-950/60 rounded-xl p-3 border border-slate-800/60 space-y-1 text-xs">
            <div class="flex justify-between text-slate-400">
              <span>القيمة السوقية التقديرية:</span>
              <span class="font-black text-amber-400 numbers-font">${estMinVal.toLocaleString()} - ${estMaxVal.toLocaleString()} EGP</span>
            </div>
            <div class="flex justify-between text-slate-400">
              <span>أقصى ربح متوقع للدفعة:</span>
              <span class="font-black text-emerald-400 numbers-font">+${(estMaxVal - (qty * c.unitCost)).toLocaleString()} EGP</span>
            </div>
          </div>
        </div>

        <button id="btn-quick-export-${key}" class="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer">
          <i class="fa-solid fa-plane-departure"></i>
          <span>عرض على المشترين وتصدير الشحنة</span>
        </button>`;

      grid.appendChild(card);

      const expBtn = card.querySelector(`#btn-quick-export-${key}`);
      if (expBtn) {
        expBtn.addEventListener('click', () => {
          preselectedExportCommodity = key;
          switchTradeSubtab('buyers');
        });
      }
    });
  }

  function renderTradeBuyers(tradeInfo) {
    const grid = document.getElementById('trade-buyers-grid');
    if (!grid) return;
    grid.innerHTML ='';

    const buyers = tradeInfo.buyers || [];
    const warehouse = tradeInfo.warehouse || {};
    const commodities = tradeInfo.commodities || {};

    buyers.forEach(buyer => {
      const bonusPct = Math.round((buyer.priceMult - 1.0) * 100);
      const buyerActiveOrders = (tradeInfo.activeExports || []).filter(e => e.buyerId === buyer.id && !e.claimed).length;
      const totalActiveExports = (tradeInfo.activeExports || []).filter(e => !e.claimed).length;
      const isFleetFull = totalActiveExports >= 2;
      const isBuyerFull = buyerActiveOrders >= 1;
      const isExportDisabled = isBuyerFull || isFleetFull;

      const card = document.createElement('div');
      card.className ='glass-panel p-5 rounded-2xl border border-slate-800 hover:border-amber-500/30 transition-all flex flex-col justify-between space-y-4 shadow-lg';

      // Build demand tags
      const demandTags = buyer.demands.map(commId => {
        const item = commodities[commId];
        const hasStock = warehouse[commId] && warehouse[commId] > 0;
        return`<span class="px-2 py-0.5 rounded-md text-[10px] font-bold border ${hasStock ?'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse' :'bg-slate-800/80 text-slate-400 border-slate-700'}">${item ? item.name : commId}</span>`;
      }).join('');

      // Build commodity options
      let optionsHtml ='';
      Object.keys(commodities).forEach(k => {
        const item = commodities[k];
        const inStock = warehouse[k] || 0;
        const isDemanded = buyer.demands.includes(k);
        const selected = (preselectedExportCommodity === k) || (inStock > 0 && !preselectedExportCommodity);
        const demandMark = isDemanded ?` (+${bonusPct}% علاوة طلب)` :' (-20% خصم عدم توفر طلب)';
        optionsHtml +=`<option value="${k}" ${selected ?'selected' :''}>${item.name} [متوفر: ${inStock}]${demandMark}</option>`;
      });

      card.innerHTML =`
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              ${buyer.flag ?`<span class="text-2xl">${buyer.flag}</span>` :''}
              <div>
                <h4 class="font-black text-white text-sm">${buyer.name}</h4>
                <span class="text-[10px] text-slate-400">${buyer.region}</span>
              </div>
            </div>
            <div class="flex flex-col items-end gap-1">
              <span class="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-black text-[10px] numbers-font">
                +${bonusPct}% علاوة سعرية
              </span>
              <span class="text-[9px] px-2 py-0.5 rounded border ${isBuyerFull ?'bg-rose-500/20 text-rose-300 border-rose-500/30 font-bold' :'bg-slate-900 text-slate-400 border-slate-800'} numbers-font">
                عقد جارٍ: ${buyerActiveOrders}/1 ${isFleetFull ?'(الأسطول ممتلئ 2/2)' :''}
              </span>
            </div>
          </div>

          <div class="space-y-1 text-xs">
            <span class="text-slate-400 text-[11px] font-medium">السلع المطلوبة ذات الأولوية والعلاوة:</span>
            <div class="flex flex-wrap gap-1.5 pt-1">
              ${demandTags}
            </div>
          </div>

          <div class="space-y-2 pt-2 border-t border-slate-800/60">
            <div class="space-y-1">
              <label class="text-[11px] text-slate-400 font-medium">اختر البضاعة المراد تصديرها:</label>
              <select id="buyer-select-${buyer.id}" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:border-amber-500 focus:outline-none cursor-pointer">
                ${optionsHtml}
              </select>
            </div>

            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-400 font-medium">كمية التصدير (حاويات):</span>
              <div class="flex items-center gap-1">
                <input type="number" id="buyer-qty-${buyer.id}" min="1" max="10" value="1" class="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-black text-xs text-white numbers-font focus:border-amber-500 focus:outline-none">
                <span class="text-[10px] text-slate-500">حاوية (أقصى 10)</span>
              </div>
            </div>

            <div class="bg-slate-950/70 rounded-xl p-2.5 border border-slate-800/60 space-y-1 text-xs">
              <div class="flex justify-between text-slate-400">
                <span>مدة الشحن للعميل:</span>
                <span id="buyer-duration-${buyer.id}" class="font-bold text-slate-300 numbers-font">-</span>
              </div>
              <div class="flex justify-between text-slate-400">
                <span>قيمة العقد المتوقعة:</span>
                <span id="buyer-payout-preview-${buyer.id}" class="font-black text-amber-400 numbers-font">-</span>
              </div>
              <div class="flex justify-between text-slate-400">
                <span>صافي الربح التقديري:</span>
                <span id="buyer-profit-preview-${buyer.id}" class="font-black text-emerald-400 numbers-font">-</span>
              </div>
            </div>
          </div>
        </div>

        <button id="btn-sign-export-${buyer.id}" class="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-slate-950 font-black text-xs transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer ${isExportDisabled ?'opacity-50 cursor-not-allowed' :''}" ${isExportDisabled ?'disabled' :''}>
          <i class="fa-solid fa-file-contract"></i>
          <span>${isBuyerFull ?'الحد الأقصى لعقود هذا العميل (1/1) ️' : (isFleetFull ?'أسطول التصدير مشغول بالكامل (2/2) ️' :'توقيع عقد التصدير والشحن ️')}</span>
        </button>`;

      grid.appendChild(card);

      const selEl = card.querySelector(`#buyer-select-${buyer.id}`);
      const qtyEl = card.querySelector(`#buyer-qty-${buyer.id}`);
      const durationEl = card.querySelector(`#buyer-duration-${buyer.id}`);
      const payoutEl = card.querySelector(`#buyer-payout-preview-${buyer.id}`);
      const profitEl = card.querySelector(`#buyer-profit-preview-${buyer.id}`);
      const signBtn = card.querySelector(`#btn-sign-export-${buyer.id}`);

      function updateCalculator() {
        const commKey = selEl.value;
        const comm = commodities[commKey];
        if (!comm) return;
        let qty = parseInt(qtyEl.value) || 1;
        if (qty < 1) qty = 1;
        if (qty > 10) {
          qty = 10;
          qtyEl.value = 10;
        }
        const availInStock = Number(tradeInfo.warehouse ? tradeInfo.warehouse[commKey] || 0 : 0);
        if (availInStock > 0 && qty > availInStock) {
          qty = Math.min(10, availInStock);
          qtyEl.value = qty;
        }
        const isDemanded = buyer.demands.includes(commKey);
        let mult = isDemanded ? buyer.priceMult : 0.80;

        const dailyCount = tradeInfo.dailyExportsCount || 0;
        const satStep = Math.min(5, Math.floor(dailyCount / 3));
        const satPenalty = satStep * 0.05;
        const effMult = Math.max(0.60, mult - satPenalty);

        const avgSellPrice = Math.floor(((comm.baseSellMin + comm.baseSellMax) / 2) * effMult);
        const totalRev = avgSellPrice * qty;
        const totalProfit = totalRev - (comm.unitCost * qty);

        durationEl.textContent = formatTradeDuration(comm.exportDurationSec);
        const satNotice = satPenalty > 0 ?` (تشبع سوق: -${Math.round(satPenalty * 100)}%)` :'';
        payoutEl.textContent =`~ ${totalRev.toLocaleString()} EGP ${isDemanded ?'' :'(-20% خصم)'}${satNotice}`;
        profitEl.textContent =`${totalProfit >= 0 ?'+' :''}${totalProfit.toLocaleString()} EGP (${Math.round((totalProfit / (comm.unitCost * qty)) * 100)}%)`;
      }

      selEl.addEventListener('change', updateCalculator);
      qtyEl.addEventListener('input', updateCalculator);
      updateCalculator();

      if (signBtn) {
        signBtn.addEventListener('click', () => {
          const commKey = selEl.value;
          let qty = parseInt(qtyEl.value) || 1;
          if (qty > 10) qty = 10;
          try {
            const order = GameEngine.sellExportCargo(commKey, buyer.id, qty);
            playMenuSound('success');
            showToast('تم توقيع عقد التصدير! ️',`تم تصدير ${qty} وحدة إلى"${buyer.name}". إجمالي العقد: ${order.totalPayout.toLocaleString()} EGP (ربح تقديري: +${order.estProfit.toLocaleString()} EGP). الشحنة انطلقت الآن!`,'success');
            preselectedExportCommodity = null;
            switchTradeSubtab('shipments');
          } catch (err) {
            showToast('تعذر توقيع العقد', err.message,'error');
          }
        });
      }
    });
  }

  function renderTradeShipments(tradeInfo) {
    const list = document.getElementById('trade-shipments-list');
    if (!list) return;
    list.innerHTML ='';

    const imports = tradeInfo.activeImports || [];
    const exports = tradeInfo.activeExports || [];
    const commodities = tradeInfo.commodities || {};

    if (imports.length === 0 && exports.length === 0) {
      list.innerHTML =`
        <div class="glass-panel p-8 rounded-2xl border border-dashed border-slate-800 text-center space-y-3">
          <div class="w-16 h-16 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-3xl">
            
          </div>
          <h4 class="font-black text-white text-base">لا توجد شحنات بحرية أو جوية جارية حالياً</h4>
          <p class="text-xs text-slate-400 max-w-md mx-auto">جميع الشحنات السابقة اكتملت وتم تسليمها أو تحصيل أرباحها. يمكنك استيراد سلع جديدة أو تصدير ما في المستودع.</p>
          <div class="flex items-center justify-center gap-3 pt-2">
            <button onclick="switchTradeSubtab('catalog')" class="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition cursor-pointer">
              استيراد سلع جديدة
            </button>
            <button onclick="switchTradeSubtab('warehouse')" class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer">
              فحص المستودع والتصدير
            </button>
          </div>
        </div>`;
      return;
    }

    // Render Active Imports
    imports.forEach(order => {
      const comm = commodities[order.commodityId] || { name:'بضاعة استيراد', icon:'' };
      const now = Date.now();
      const isArrived = order.arrived || (now >= order.arrivalTime);
      const totalDur = (order.arrivalTime - order.startTime) || 1;
      const progress = isArrived ? 100 : Math.min(100, Math.max(0, ((now - order.startTime) / totalDur) * 100));
      const remSec = Math.max(0, Math.ceil((order.arrivalTime - now) / 1000));

      const card = document.createElement('div');
      card.id =`trade-order-card-${order.id}`;
      card.className ='glass-panel p-4 rounded-2xl border border-slate-800 hover:border-cyan-500/30 transition flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg';
      card.innerHTML =`
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-xl bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-2xl shrink-0">
            ${renderTradeIcon(comm.icon)}
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold text-[10px] border border-cyan-500/30">شحنة استيراد دولية </span>
              <h4 class="font-black text-white text-sm">${comm.name} (${order.quantity} حاوية)</h4>
            </div>
            <p class="text-[11px] text-slate-400 mt-0.5">التكلفة المدفوعة: <span class="numbers-font font-bold text-slate-200">${order.totalCost.toLocaleString()} EGP</span> — الوجهة: المستودع الجمركي</p>
          </div>
        </div>

        <div class="w-full md:w-72 space-y-1.5">
          <div class="flex justify-between text-xs">
            <span class="text-slate-400 font-medium">${isArrived ?'الحالة: وصلت المستودع' :'في طريق الشحن...'}</span>
            <span id="timer-${order.id}" class="font-mono font-bold text-cyan-400">${isArrived ?'تم التخزين' : formatCountdownHMS(remSec)}</span>
          </div>
          <div class="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
            <div id="bar-${order.id}" class="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-300" style="width: ${progress}%"></div>
          </div>
        </div>`;

      list.appendChild(card);
    });

    // Render Active Exports
    exports.forEach(order => {
      const comm = commodities[order.commodityId] || { name: order.commodityName ||'بضاعة تصدير', icon:'' };
      const now = Date.now();
      const isDelivered = order.delivered || (now >= order.deliveryTime);
      const totalDur = (order.deliveryTime - order.startTime) || 1;
      const progress = isDelivered ? 100 : Math.min(100, Math.max(0, ((now - order.startTime) / totalDur) * 100));
      const remSec = Math.max(0, Math.ceil((order.deliveryTime - now) / 1000));

      const card = document.createElement('div');
      card.id =`trade-order-card-${order.id}`;
      card.className ='glass-panel p-4 rounded-2xl border border-slate-800 hover:border-emerald-500/30 transition flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg';
      card.innerHTML =`
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-xl bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-2xl shrink-0">
            ${renderTradeIcon(comm.icon)}
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/30">شحنة تصدير جوية ️</span>
              <h4 class="font-black text-white text-sm">${order.commodityName} (${order.quantity} حاوية)</h4>
            </div>
            <p class="text-[11px] text-slate-400 mt-0.5">العميل: <span class="font-bold text-white">${order.buyerName}</span> (${order.region}) — قيمة العقد: <span class="numbers-font font-black text-amber-400">${order.totalPayout.toLocaleString()} EGP</span></p>
          </div>
        </div>

        <div class="w-full md:w-80 space-y-2">
          ${isDelivered ?`
            <button class="btn-claim-trade-export w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 animate-pulse cursor-pointer" data-id="${order.id}">
              <i class="fa-solid fa-hand-holding-dollar text-sm"></i>
              <span>تحصيل أرباح الصفقة (${order.totalPayout.toLocaleString()} EGP)</span>
            </button>` :`
            <div class="space-y-1.5">
              <div class="flex justify-between text-xs">
                <span class="text-slate-400 font-medium">جاري نقل الشحنة للعميل...</span>
                <span id="timer-${order.id}" class="font-mono font-bold text-amber-400">${formatCountdownHMS(remSec)}</span>
              </div>
              <div class="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                <div id="bar-${order.id}" class="bg-gradient-to-r from-emerald-500 to-amber-500 h-full rounded-full transition-all duration-300" style="width: ${progress}%"></div>
              </div>
            </div>`}
        </div>`;

      list.appendChild(card);
    });

    // Bind claim buttons
    list.querySelectorAll('.btn-claim-trade-export').forEach(btn => {
      btn.addEventListener('click', () => {
        const orderId = btn.getAttribute('data-id');
        try {
          const res = GameEngine.claimExportProfit(orderId);
          playMenuSound('success');
          showToast('تحصيل أرباح التصدير',`تم تحصيل مبلغ ${res.payout.toLocaleString()} EGP وأودع مباشرة في حسابك البنكي! صافي الربح المحقق: +${res.profit.toLocaleString()} EGP.`,'success');
          renderTradePanel();
          renderStatsBar();
        } catch (err) {
          showToast('فشل التحصيل', err.message,'error');
        }
      });
    });
  }

  function updateTradeShipmentsInDOM() {
    if (activeTradeSubtab !=='shipments') return;
    if (!GameEngine || typeof GameEngine.getTradeCompanyState !=='function') return;
    const tradeInfo = GameEngine.getTradeCompanyState();

    const imports = tradeInfo.activeImports || [];
    const exports = tradeInfo.activeExports || [];
    const now = Date.now();
    let requiresFullReRender = false;

    imports.forEach(order => {
      const timerEl = document.getElementById(`timer-${order.id}`);
      const barEl = document.getElementById(`bar-${order.id}`);
      if (!timerEl || !barEl) return;

      const isArrived = order.arrived || (now >= order.arrivalTime);
      if (isArrived && timerEl.textContent !=='تم التخزين') {
        requiresFullReRender = true;
      } else if (!isArrived) {
        const totalDur = (order.arrivalTime - order.startTime) || 1;
        const progress = Math.min(100, Math.max(0, ((now - order.startTime) / totalDur) * 100));
        const remSec = Math.max(0, Math.ceil((order.arrivalTime - now) / 1000));
        timerEl.textContent = formatCountdownHMS(remSec);
        barEl.style.width =`${progress}%`;
      }
    });

    exports.forEach(order => {
      const timerEl = document.getElementById(`timer-${order.id}`);
      const barEl = document.getElementById(`bar-${order.id}`);
      const isDelivered = order.delivered || (now >= order.deliveryTime);

      if (isDelivered && timerEl) {
        requiresFullReRender = true;
      } else if (!isDelivered && timerEl && barEl) {
        const totalDur = (order.deliveryTime - order.startTime) || 1;
        const progress = Math.min(100, Math.max(0, ((now - order.startTime) / totalDur) * 100));
        const remSec = Math.max(0, Math.ceil((order.deliveryTime - now) / 1000));
        timerEl.textContent = formatCountdownHMS(remSec);
        barEl.style.width =`${progress}%`;
      }
    });

    if (requiresFullReRender) {
      renderTradePanel();
    }
  }

  // ==========================================
  // ==========================================
  // INDUSTRIAL CONGLOMERATE CONTROLLER (PREMIUM & STREAMLINED UI/UX)
  // ==========================================
  let currentIndustrySector ='food';
  let currentIndustryUpgradeMultiplier ='1';

  function formatFaIcon(icon) {
    if (!icon) return'fa-solid fa-industry';
    icon = icon.trim();
    if (icon.startsWith('fa-solid') || icon.startsWith('fa-brands') || icon.startsWith('fa-regular')) {
      return icon;
    }
    return'fa-solid' + icon;
  }

  function switchIndustrySector(sectorId) {
    if (GameEngine && GameEngine.INDUSTRIAL_SECTORS && GameEngine.INDUSTRIAL_SECTORS[sectorId]) {
      currentIndustrySector = sectorId;
      playMenuSound('click');
      renderIndustryPanel();
    }
  }

  function setIndustryUpgradeMultiplier(mult) {
    currentIndustryUpgradeMultiplier = mult;
    playMenuSound('click');
    renderIndustryPanel();
  }

  function updateIndustryStockInDOM() {
    if (!GameEngine || typeof GameEngine.getIndustrySectorState !=='function') return;
    if (activeTab !=='industry') return;

    const sectors = GameEngine.INDUSTRIAL_SECTORS;
    if (!sectors) return;

    let totalPendingCash = 0;
    Object.keys(sectors).forEach(sKey => {
      try {
        const info = GameEngine.getIndustrySectorState(sKey);
        if (info && info.state && info.state.unlocked) {
          const ready = Math.floor(info.state.readyStock || 0);
          const val = (ready * (info.definition.product.baseValue || 0));
          totalPendingCash += val;

          // Update tab stock badges
          const tabBadge = document.getElementById(`industry-tab-badge-${sKey}`);
          if (tabBadge) {
            if (ready > 0) {
              tabBadge.textContent =`${ready.toLocaleString()}`;
              tabBadge.className ='text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 numbers-font';
            } else {
              tabBadge.textContent ='';
              tabBadge.className ='hidden';
            }
          }
        }
      } catch (e) {}
    });

    const pendingCashEl = document.getElementById('industry-total-pending-cash');
    if (pendingCashEl) pendingCashEl.textContent =`${totalPendingCash.toLocaleString()} EGP`;

    // Active Sector In-Place Live Updates
    const activeInfo = GameEngine.getIndustrySectorState(currentIndustrySector);
    if (!activeInfo || !activeInfo.state || !activeInfo.state.unlocked) return;

    const readyUnits = Math.floor(activeInfo.state.readyStock || 0);
    const pendingRev = readyUnits * (activeInfo.definition.product.baseValue || 0);

    const unitsEl = document.getElementById('industry-active-stock-units');
    if (unitsEl) unitsEl.textContent = readyUnits.toLocaleString();

    const capEl = document.getElementById('industry-active-stock-cap');
    if (capEl) capEl.textContent =`${activeInfo.siloCapacity.toLocaleString()} وحدة`;

    const fullBadge = document.getElementById('industry-stock-full-badge');
    if (fullBadge) {
      if (activeInfo.isStorageFull) {
        fullBadge.classList.remove('hidden');
      } else {
        fullBadge.classList.add('hidden');
      }
    }

    const revEl = document.getElementById('industry-active-stock-rev');
    if (revEl) revEl.textContent =`${pendingRev.toLocaleString()} EGP`;

    const sellBtn = document.getElementById('btn-industry-sell-cash');
    if (sellBtn) {
      const label = sellBtn.querySelector('.btn-label');
      if (label) {
        label.textContent = readyUnits > 0 
          ?`بيع فوري نقداً (+${pendingRev.toLocaleString()} EGP)` 
          :'بيع فوري نقداً';
      }
      if (readyUnits <= 0) {
        sellBtn.setAttribute('disabled','true');
        sellBtn.classList.add('opacity-50','cursor-not-allowed');
      } else {
        sellBtn.removeAttribute('disabled');
        sellBtn.classList.remove('opacity-50','cursor-not-allowed');
      }
    }

    const exportBtn = document.getElementById('btn-industry-transfer-export');
    if (exportBtn) {
      const unitsPerCont = activeInfo.unitsPerContainer || 10;
      const possibleContainers = Math.floor(readyUnits / unitsPerCont);
      const labelEl = exportBtn.querySelector('.btn-export-label');
      if (labelEl) {
        labelEl.textContent =`(${unitsPerCont} وحدة/حاوية | متاح: ${possibleContainers})`;
      }
      if (possibleContainers <= 0) {
        exportBtn.setAttribute('disabled','true');
        exportBtn.classList.add('opacity-50','cursor-not-allowed');
      } else {
        exportBtn.removeAttribute('disabled');
        exportBtn.classList.remove('opacity-50','cursor-not-allowed');
      }
    }
  }

  function renderIndustryPanel(targetSectorId) {
    if (!GameEngine || typeof GameEngine.getIndustrySectorState !=='function') return;
    if (targetSectorId && GameEngine.INDUSTRIAL_SECTORS && GameEngine.INDUSTRIAL_SECTORS[targetSectorId]) {
      currentIndustrySector = targetSectorId;
    }

    const sectors = GameEngine.INDUSTRIAL_SECTORS;
    if (!sectors) return;

    // 1. Render Enhanced Sector Tabs
    const tabsContainer = document.getElementById('industry-sector-tabs');
    if (tabsContainer) {
      let tabsHtml ='';
      Object.keys(sectors).forEach(sKey => {
        const sec = sectors[sKey];
        const info = GameEngine.getIndustrySectorState(sKey);
        const isUnlocked = info && info.state && info.state.unlocked;
        const ready = isUnlocked ? Math.floor(info.state.readyStock || 0) : 0;
        const isActive = (sKey === currentIndustrySector);

        let badgeHtml ='';
        if (!isUnlocked) {
          badgeHtml ='<span class="text-[9px] text-slate-500"><i class="fa-solid fa-lock text-[8px]"></i></span>';
        } else if (ready > 0) {
          badgeHtml =`<span id="industry-tab-badge-${sKey}" class="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 numbers-font">${ready.toLocaleString()}</span>`;
        } else {
          badgeHtml =`<span id="industry-tab-badge-${sKey}" class="hidden"></span>`;
        }

        const activeClasses = isActive 
          ?'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm shadow-emerald-500/10' 
          :'bg-slate-900/60 text-slate-400 hover:text-white border-slate-800 hover:border-slate-700';

        const displayName = sec.shortName || sec.name.split('')[0];

        tabsHtml +=`
          <button data-sector="${sKey}" class="industry-tab-btn px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 border whitespace-nowrap cursor-pointer ${activeClasses}">
            <i class="${formatFaIcon(sec.icon)} text-sm"></i>
            <span>${displayName}</span>
            ${badgeHtml}
          </button>`;
      });
      tabsContainer.innerHTML = tabsHtml;

      // Rebind click events
      tabsContainer.querySelectorAll('.industry-tab-btn').forEach(btn => {
        btn.onclick = () => {
          const s = btn.getAttribute('data-sector');
          switchIndustrySector(s);
        };
      });
    }

    // 2. Global Total Pending Cash
    let totalPendingCash = 0;
    Object.keys(sectors).forEach(sKey => {
      try {
        const info = GameEngine.getIndustrySectorState(sKey);
        if (info && info.state && info.state.unlocked) {
          const ready = Math.floor(info.state.readyStock || 0);
          totalPendingCash += (ready * (info.definition.product.baseValue || 0));
        }
      } catch (e) {}
    });

    const pendingCashEl = document.getElementById('industry-total-pending-cash');
    if (pendingCashEl) pendingCashEl.textContent =`${totalPendingCash.toLocaleString()} EGP`;

    // 3. Render Active Sector View
    const container = document.getElementById('industry-sector-container');
    if (!container) return;

    const activeInfo = GameEngine.getIndustrySectorState(currentIndustrySector);
    if (!activeInfo) return;

    const secDef = activeInfo.definition;
    const secState = activeInfo.state;

    // View A: Locked Sector Setup
    if (!secState.unlocked) {
      const canUnlock = activeInfo.canUnlock;
      const curCash = (GameEngine.state && GameEngine.state.cash) || 0;
      const curBank = (GameEngine.state && GameEngine.state.bank) || 0;
      const curNetWorth = (GameEngine.state && GameEngine.state.netWorth) || 0;
      const totalFunds = curCash + curBank;

      container.innerHTML =`
        <div class="glass-panel p-8 rounded-2xl border border-slate-800 bg-slate-900/40 text-center max-w-2xl mx-auto space-y-6">
          <div class="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-3xl mx-auto">
            <i class="${formatFaIcon(secDef.icon)}"></i>
          </div>
          <div>
            <h3 class="text-xl font-black text-white mb-2">${secDef.name}</h3>
            <p class="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">${secDef.desc}</p>
          </div>
          
          <div class="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-5 max-w-md mx-auto text-right space-y-2.5 text-xs">
            <div class="flex justify-between items-center">
              <span class="text-slate-400">المنتج المصنّع:</span>
              <span class="font-bold text-white flex items-center gap-1.5"><i class="${formatFaIcon(secDef.product.icon)} text-emerald-400"></i> ${secDef.product.name}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-slate-400">سعر بيع الوحدة:</span>
              <span class="font-bold text-yellow-400 numbers-font">${secDef.product.baseValue.toLocaleString()} EGP</span>
            </div>
            <div class="flex justify-between items-center border-t border-slate-800 pt-2.5">
              <span class="text-slate-400">صافي الثروة المطلوب:</span>
              <span class="font-bold ${curNetWorth >= secDef.unlockNetWorth ?'text-emerald-400' :'text-rose-400'} numbers-font">
                ${secDef.unlockNetWorth.toLocaleString()} EGP
                ${curNetWorth >= secDef.unlockNetWorth ?'' :''}
              </span>
            </div>
            <div class="flex justify-between items-center border-t border-slate-800 pt-2.5">
              <span class="text-slate-300 font-bold">تكلفة الترخيص الصناعي:</span>
              <span class="font-black ${totalFunds >= secDef.unlockCost ?'text-emerald-400' :'text-rose-400'} numbers-font">
                ${secDef.unlockCost.toLocaleString()} EGP
                ${totalFunds >= secDef.unlockCost ?'' :''}
              </span>
            </div>
          </div>

          <button id="btn-unlock-industry-sector" class="px-8 py-3.5 rounded-xl font-bold transition text-xs flex items-center gap-2 mx-auto ${canUnlock ?'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-lg shadow-emerald-600/20' :'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'}" ${canUnlock ?'' :'disabled'}>
            <i class="fa-solid fa-file-signature"></i>
            <span>${canUnlock ?`تأسيس وترخيص القطاع (${secDef.unlockCost.toLocaleString()} EGP)` :'المتطلبات المالية غير مكتملة بعد'}</span>
          </button>
        </div>`;

      const unlockBtn = document.getElementById('btn-unlock-industry-sector');
      if (unlockBtn && canUnlock) {
        unlockBtn.onclick = () => {
          try {
            playMenuSound('click');
            GameEngine.unlockIndustrySector(currentIndustrySector);
            showToast('ترخيص صناعي',`تم تأسيس مجمع"${secDef.name}" بنجاح وبدء خطوط الإنتاج.`,'success');
            renderIndustryPanel();
          } catch (err) {
            showToast('تعذر الترخيص', err.message,'error');
          }
        };
      }
      return;
    }

    // View B: Unlocked Sector (High Polish UI/UX)
    const flowRatePerMin = (activeInfo.outputRatePerSec * 60).toFixed(0);
    const flowRatePerSec = (activeInfo.outputRatePerSec || 0).toFixed(2);
    const readyUnits = Math.floor(secState.readyStock || 0);
    const grossRevenue = readyUnits * secDef.product.baseValue;
    const overheadEst = Math.floor(grossRevenue * 0.35);
    const netRevenue = grossRevenue - overheadEst;

    // Check trade warehouse capacity
    let warehouseFree = 30;
    try {
      const tradeState = GameEngine.getTradeCompanyState();
      const cap = tradeState.warehouseCapacity || 30;
      let used = 0;
      Object.values(tradeState.warehouse || {}).forEach(v => used += (v || 0));
      warehouseFree = Math.max(0, cap - used);
    } catch (e) {}

    const unitsPerCont = activeInfo.unitsPerContainer || 10;
    const possibleContainers = Math.floor(readyUnits / unitsPerCont);

    const stageLevels = {
      stage1: Number(secState.stage1 || 1),
      stage2: Number(secState.stage2 || 1),
      stage3: Number(secState.stage3 || 1),
      logistics: Number(secState.logistics || 1)
    };
    const bottleneckStageKey = activeInfo.bottleneckStage;

    // Flow Stepper Pills
    const stepKeys = ['stage1','stage2','stage3','logistics'];
    let stepperHtml ='';
    stepKeys.forEach((stKey, idx) => {
      const stDef = secDef.stages[stKey];
      const lvl = stageLevels[stKey];
      const isBn = (stKey === bottleneckStageKey && lvl < 50);

      stepperHtml +=`
        <div class="flex items-center gap-2 p-2.5 rounded-xl border ${isBn ?'bg-amber-500/10 border-amber-500/30' :'bg-slate-950/60 border-slate-800'} text-right">
          <div class="w-7 h-7 rounded-lg ${isBn ?'bg-amber-500/20 text-amber-300' :'bg-slate-800 text-slate-300'} flex items-center justify-center text-xs shrink-0">
            <i class="${formatFaIcon(stDef.icon)}"></i>
          </div>
          <div class="min-w-0 flex-1">
            <span class="text-[10px] text-slate-400 block truncate font-medium">${idx + 1}. ${stDef.name}</span>
            <div class="flex items-center justify-between gap-1">
              <span class="text-xs font-bold ${isBn ?'text-amber-300' :'text-white'} numbers-font">Lvl ${lvl}</span>
              ${isBn ?'<span class="text-[8px] text-amber-400 font-black">عنق الزجاجة</span>' :'<span class="text-[9px] text-emerald-400 font-bold numbers-font">OK</span>'}
            </div>
          </div>
        </div>`;
    });

    // 4 Stages Cards
    let stagesHtml ='';
    stepKeys.forEach((stKey) => {
      const stDef = secDef.stages[stKey];
      const curLvl = stageLevels[stKey];
      const isBottleneck = (stKey === bottleneckStageKey && curLvl < 50);
      const pct = Math.min(100, Math.round((curLvl / 50) * 100));

      const multi = GameEngine.calculateStageMultiUpgrade(currentIndustrySector, stKey, currentIndustryUpgradeMultiplier);
      const isMaxed = curLvl >= 50;

      let btnText ='';
      if (isMaxed) {
        btnText ='مكتمل (الحد الأقصى 50)';
      } else {
        btnText =`ترقية +${multi.count} مستويات (${multi.cost.toLocaleString()} EGP)`;
      }

      const btnClasses = isMaxed
        ?'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
        : multi.canAfford
          ? (isBottleneck 
              ?'bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-black shadow-md shadow-amber-500/10 cursor-pointer' 
              :'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 cursor-pointer')
          :'bg-slate-800/80 text-slate-400 border border-slate-800 cursor-not-allowed opacity-60';

      stagesHtml +=`
        <div class="glass-panel p-5 rounded-2xl border ${isBottleneck ?'border-amber-500/40 bg-amber-500/5' :'border-slate-800 bg-slate-900/40'} flex flex-col justify-between space-y-4">
          <div>
            <div class="flex items-center justify-between gap-2 mb-2.5">
              <div class="flex items-center gap-2.5">
                <div class="w-9 h-9 rounded-xl ${isBottleneck ?'bg-amber-500/20 text-amber-300 border border-amber-500/30' :'bg-slate-800/80 text-slate-300 border border-slate-700/60'} flex items-center justify-center text-sm">
                  <i class="${formatFaIcon(stDef.icon)}"></i>
                </div>
                <div>
                  <h4 class="text-xs font-bold text-white">${stDef.name}</h4>
                  <span class="text-[10px] text-slate-400">المستوى: <strong class="${isBottleneck ?'text-amber-300' :'text-emerald-400'} numbers-font">${curLvl}</strong>/50</span>
                </div>
              </div>
              ${isBottleneck ?'<span class="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">عنق الزجاجة ️</span>' :''}
            </div>
            <p class="text-[11px] text-slate-400 leading-relaxed min-h-[32px]">${stDef.desc}</p>
          </div>

          <div class="space-y-2.5 pt-2 border-t border-slate-800/60">
            <div class="space-y-1">
              <div class="flex justify-between text-[10px] text-slate-400">
                <span>الكفاءة</span>
                <span class="numbers-font font-bold text-slate-300">${pct}%</span>
              </div>
              <div class="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                <div class="h-full ${isBottleneck ?'bg-amber-500' :'bg-emerald-500'} rounded-full transition-all duration-300" style="width: ${pct}%"></div>
              </div>
            </div>

            <button class="btn-upgrade-industry-stage w-full py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${btnClasses}" data-stage="${stKey}" ${isMaxed || !multi.canAfford ?'disabled' :''}>
              <i class="fa-solid fa-arrow-up text-[10px]"></i>
              <span>${btnText}</span>
            </button>
          </div>
        </div>`;
    });

    container.innerHTML =`
      <!-- Product & Live Stock Hero Panel -->
      <div class="glass-panel p-5 sm:p-6 rounded-2xl border border-slate-800 bg-slate-900/50 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
        
        <div class="flex items-center gap-4">
          <div class="w-14 h-14 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-emerald-400 text-3xl shrink-0">
            <i class="${formatFaIcon(secDef.product.icon)}"></i>
          </div>
          <div>
            <div class="flex items-center gap-2 mb-1">
              <h3 class="text-base sm:text-lg font-black text-white">${secDef.product.name}</h3>
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">جاهز للتسويق والتصدير</span>
            </div>
            <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
              <span>وتيرة الإنتاج: <strong class="text-cyan-400 numbers-font font-bold">${flowRatePerMin}</strong> وحدة/دقيقة (${flowRatePerSec}/ثانية)</span>
              <span>سعر الوحدة: <strong class="text-yellow-400 numbers-font font-bold">${secDef.product.baseValue.toLocaleString()} EGP</strong></span>
            </div>
          </div>
        </div>

        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          <div class="bg-slate-950/70 border border-slate-800/80 px-4 py-3 rounded-xl text-right sm:min-w-[210px]">
            <span class="text-[10px] text-slate-400 block font-medium">سعة صوامع التخزين والمخزون</span>
            <div class="numbers-font text-white font-black text-lg sm:text-xl my-0.5 flex items-baseline gap-1">
              <span id="industry-active-stock-units">${readyUnits.toLocaleString()}</span>
              <span class="text-xs text-slate-400 font-normal">/ <span id="industry-active-stock-cap">${activeInfo.siloCapacity.toLocaleString()}</span> وحدة</span>
            </div>
            <div id="industry-stock-full-badge" class="${activeInfo.isStorageFull ?'' :'hidden'} mb-1">
              <span class="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">الصوامع ممتلئة ️ توقف الإنتاج</span>
            </div>
            <span class="text-[10px] text-yellow-400 block numbers-font">صافي البيع: <strong id="industry-active-stock-rev">${netRevenue.toLocaleString()} EGP</strong> <span class="text-[9px] text-slate-400 font-normal">(بعد خصم 35% تشغيل)</span></span>
          </div>

          <div class="flex flex-col gap-2 flex-1 sm:flex-initial">
            <button id="btn-industry-sell-cash" class="px-4 py-2.5 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-950 font-black rounded-xl text-xs transition shadow-md shadow-yellow-500/10 flex items-center justify-center gap-2 cursor-pointer ${readyUnits <= 0 ?'opacity-50 cursor-not-allowed' :''}" ${readyUnits <= 0 ?'disabled' :''}>
              <i class="fa-solid fa-sack-dollar text-xs"></i>
              <span class="btn-label">${readyUnits > 0 ?`بيع فوري نقداً (+${netRevenue.toLocaleString()} EGP صافي)` :'بيع فوري نقداً'}</span>
            </button>

            <button id="btn-industry-transfer-export" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${possibleContainers <= 0 || warehouseFree <= 0 ?'opacity-50 cursor-not-allowed' :''}" ${possibleContainers <= 0 || warehouseFree <= 0 ?'disabled' :''}>
              <i class="fa-solid fa-ship text-xs"></i>
              <span>تحويل للتصدير الدولي</span>
              <span class="btn-export-label text-[10px] text-slate-400 font-normal">(${unitsPerCont} وحدة/حاوية | متاح: ${possibleContainers})</span>
            </button>
          </div>
        </div>

      </div>

      <!-- Supply Chain Flow Stepper -->
      <div class="glass-panel p-4 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-3">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <i class="fa-solid fa-timeline text-emerald-400 text-sm"></i>
            <span class="text-xs font-bold text-white">سلسلة تدفق خطوط الإنتاج (Supply Flow)</span>
            <span class="text-[10px] px-2 py-0.5 rounded-lg border ${activeInfo.efficiencyPct >= 95 ?'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :'bg-amber-500/10 text-amber-400 border-amber-500/30'} font-bold numbers-font">كفاءة التدفق: ${activeInfo.efficiencyPct}%</span>
          </div>
          ${bottleneckStageKey && stageLevels[bottleneckStageKey] < 50 ?`
            <div class="flex items-center gap-2">
              <span class="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5">
                <i class="fa-solid fa-triangle-exclamation text-[10px]"></i>
                <span>عنق الزجاجة: ${secDef.stages[bottleneckStageKey].name}</span>
              </span>
              <button id="btn-industry-fix-bottleneck" class="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer">
                <i class="fa-solid fa-bolt text-[10px]"></i>
                <span>حل عنق الزجاجة </span>
              </button>
            </div>` :`
            <span class="text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5">
              <i class="fa-solid fa-check text-[10px]"></i>
              <span>كافة المراحل متوازنة وبتدفق مستقر</span>
            </span>`}
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          ${stepperHtml}
        </div>
      </div>

      <!-- 4 Stages Grid & Multiplier Selector -->
      <div class="space-y-3">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 class="text-sm font-black text-white flex items-center gap-2">
              <i class="fa-solid fa-sitemap text-emerald-400"></i>
              <span>مراحل وخطوط الإنتاج الأربعة</span>
            </h3>
            <span class="text-[11px] text-slate-400">التطوير المتوازن يمنع اختناق المصنع ويعظّم وتيرة إنتاج السلع</span>
          </div>

          <!-- Clean Multiplier Pills -->
          <div class="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            <span class="text-[10px] text-slate-400 px-2 font-bold">مضاعف الترقية:</span>
            <button data-mult="1" class="industry-mult-btn px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${currentIndustryUpgradeMultiplier ==='1' ?'bg-emerald-600 text-white shadow-sm' :'text-slate-400 hover:text-white'}">x1</button>
            <button data-mult="5" class="industry-mult-btn px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${currentIndustryUpgradeMultiplier ==='5' ?'bg-emerald-600 text-white shadow-sm' :'text-slate-400 hover:text-white'}">x5</button>
            <button data-mult="10" class="industry-mult-btn px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${currentIndustryUpgradeMultiplier ==='10' ?'bg-emerald-600 text-white shadow-sm' :'text-slate-400 hover:text-white'}">x10</button>
            <button data-mult="max" class="industry-mult-btn px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${currentIndustryUpgradeMultiplier ==='max' ?'bg-emerald-600 text-white shadow-sm' :'text-slate-400 hover:text-white'}">Max</button>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          ${stagesHtml}
        </div>
      </div>`;

    // Bind Multiplier Selector Buttons
    container.querySelectorAll('.industry-mult-btn').forEach(btn => {
      btn.onclick = () => {
        const mult = btn.getAttribute('data-mult');
        setIndustryUpgradeMultiplier(mult);
      };
    });

    // Bind Quick Fix Bottleneck Button
    const fixBottleneckBtn = document.getElementById('btn-industry-fix-bottleneck');
    if (fixBottleneckBtn && bottleneckStageKey) {
      fixBottleneckBtn.onclick = () => {
        try {
          playMenuSound('click');
          const res = GameEngine.upgradeIndustryStage(currentIndustrySector, bottleneckStageKey, 1);
          showToast('حل عنق الزجاجة',`تمت ترقية"${secDef.stages[bottleneckStageKey].name}" إلى المستوى ${res.newLevel} وانطلق تدفق الإنتاج!`,'success');
          renderIndustryPanel();
        } catch (err) {
          showToast('تعذر الترقية', err.message,'error');
        }
      };
    }

    // Bind Stage Upgrade Buttons
    container.querySelectorAll('.btn-upgrade-industry-stage').forEach(btn => {
      btn.onclick = () => {
        const stKey = btn.getAttribute('data-stage');
        try {
          playMenuSound('click');
          const res = GameEngine.upgradeIndustryStage(currentIndustrySector, stKey, currentIndustryUpgradeMultiplier);
          showToast('ترقية خط الإنتاج ️',`تمت ترقية المرحلة بمقدار +${res.upgradedLevels} (المستوى ${res.newLevel})`,'success');
          renderIndustryPanel();
        } catch (err) {
          showToast('تعذر الترقية', err.message,'error');
        }
      };
    });

    // Bind Sell Cash Button
    const sellCashBtn = document.getElementById('btn-industry-sell-cash');
    if (sellCashBtn) {
      sellCashBtn.onclick = () => {
        try {
          playCasinoSound('win');
          const res = GameEngine.collectIndustryRevenue(currentIndustrySector);
          showToast('تم البيع نقداً',`تم بيع ${res.units.toLocaleString()} وحدة بإجمالي ${res.grossPayout.toLocaleString()} EGP (مصاريف تشغيل وصيانة 35%: -${res.overheadCost.toLocaleString()} EGP | صافي أرباح مودعة: +${res.netPayout.toLocaleString()} EGP).`,'success');
          renderIndustryPanel();
          renderDashboard();
        } catch (err) {
          showToast('تعذر البيع', err.message,'error');
        }
      };
    }

    // Bind Transfer to Export Button
    const transferExportBtn = document.getElementById('btn-industry-transfer-export');
    if (transferExportBtn) {
      transferExportBtn.onclick = () => {
        try {
          playMenuSound('click');
          const res = GameEngine.transferIndustryGoodsToTradeExport(currentIndustrySector);
          showToast('تم التحويل للتصدير',`تم تحويل ${res.transferred} حاوية بنجاح إلى مستودع التصدير كبضاعة"${res.commodityName}".`,'success');
          renderIndustryPanel();
        } catch (err) {
          showToast('تعذر التحويل', err.message,'error');
        }
      };
    }
  }

  // ─────────────────────────────────────────────
  //  TOP-UP & SUPPORT STORE CONTROLLER (متجر الشحن والدعم)
  // ─────────────────────────────────────────────
  let _activeSelectedTopupPkg = null;
  let _topupModalEventsBound = false;
  let _currentTopupPaymentSettings = null;

  async function openTopupModal() {
    playMenuSound('modal_open');
    bindTopupModalEvents();

    const modal = document.getElementById('topup-store-modal');
    if (!modal) return;

    // Reset views
    document.getElementById('topup-view-packages')?.classList.remove('hidden');
    document.getElementById('topup-view-confirmation')?.classList.add('hidden');
    document.getElementById('topup-success-notice')?.classList.add('hidden');
    document.getElementById('player-topup-form')?.classList.remove('hidden');

    modal.classList.remove('hidden');

    const container = document.getElementById('topup-packages-container');
    if (container) {
      container.innerHTML ='<div class="col-span-full p-8 text-center text-slate-400"><i class="fa-solid fa-spinner animate-spin text-xl text-amber-400 block mb-2"></i><span>جاري جلب باقات الشحن المعتمدة...</span></div>';
    }

    try {
      const [packages, settings] = await Promise.all([
        AppDB.getTopupPackages(),
        AppDB.getPaymentSettings()
      ]);

      _currentTopupPaymentSettings = settings;

      // Populate Payment Info in view 2
      const vodafoneNumEl = document.getElementById('player-topup-vodafone-num');
      const instapayNumEl = document.getElementById('player-topup-instapay-num');
      const instructionsEl = document.getElementById('player-topup-instructions');

      if (vodafoneNumEl) vodafoneNumEl.textContent = settings.vodafoneCash ||'غير محدد حالياً';
      if (instapayNumEl) instapayNumEl.textContent = settings.instapay ||'غير محدد حالياً';
      if (instructionsEl) instructionsEl.textContent = settings.notes ||'يرجى تحويل المبلغ بدقة وكتابة رقم الهاتف المحوّل منه ورقم العملية أو الوصل لتأكيد الشحن فوراً.';

      // Render packages
      renderTopupPackagesList(packages || []);
    } catch (err) {
      if (container) {
        container.innerHTML =`<div class="col-span-full p-4 text-center text-rose-400 bg-rose-950/40 rounded-2xl border border-rose-500/30">تعذر جلب باقات الشحن: ${err.message}</div>`;
      }
    }
  }

  function closeTopupModal() {
    const modal = document.getElementById('topup-store-modal');
    if (modal) modal.classList.add('hidden');
    _activeSelectedTopupPkg = null;
  }

  function renderTopupPackagesList(packages) {
    const container = document.getElementById('topup-packages-container');
    if (!container) return;

    if (packages.length === 0) {
      container.innerHTML ='<div class="col-span-full p-6 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-slate-800">لا توجد باقات متاحة حالياً. يرجى مراجعة الإدارة لاحقاً.</div>';
      return;
    }

    container.innerHTML ='';
    packages.forEach(pkg => {
      const card = document.createElement('div');
      card.className ='p-4 rounded-3xl bg-slate-900/85 border-2 border-amber-500/30 hover:border-amber-400 flex flex-col justify-between space-y-3.5 transition-all duration-300 shadow-xl relative overflow-hidden group hover:scale-[1.01]';

      const badge = pkg.customBadge ||'';
      const itemsList = pkg.items ? Object.entries(pkg.items).map(([k, v]) => {
        let label = k;
        if (k ==='vip_casino_pass') label ='تصريح كازينو VIP';
        else if (k ==='swiss_safe') label ='خزنة سويسرية';
        else if (k ==='offshore_account') label ='حساب خارجي';
        else if (k ==='lottery_ticket') label ='تذكرة يانصيب';
        return`${v}x ${label}`;
      }).join(' •') :'';

      card.innerHTML =`
        <!-- Card Content -->
        <div class="space-y-3">
          <!-- Header -->
          <div class="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
            <div class="flex items-center gap-2 min-w-0">
              ${badge ?`<span class="text-xl shrink-0 drop-shadow-sm">${badge}</span>` :''}
              <h3 class="font-black text-white text-xs sm:text-sm truncate">${pkg.name}</h3>
            </div>
            <span class="numbers-font text-amber-400 font-black text-sm shrink-0 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 shadow-sm">${Number(pkg.price).toLocaleString()} EGP</span>
          </div>

          <p class="text-[11px] text-slate-300 leading-relaxed">${pkg.description ||'باقة استثنائية لدعم السيرفر وحصاد مزايا ومكافآت هائلة في اللعبة.'}</p>

          <!-- Rewards Box -->
          <div class="p-2.5 bg-slate-950/90 rounded-2xl border border-slate-800 space-y-1.5 text-[11px]">
            ${pkg.cash ?`<div class="flex justify-between items-center text-emerald-400 font-black"><span>كاش فوري:</span><span class="numbers-font font-mono text-xs">+${Number(pkg.cash).toLocaleString()} EGP</span></div>` :''}
            ${pkg.bank ?`<div class="flex justify-between items-center text-sky-400 font-bold"><span>وديعة بالبنك:</span><span class="numbers-font font-mono text-xs">+${Number(pkg.bank).toLocaleString()} EGP</span></div>` :''}
            ${pkg.xp ?`<div class="flex justify-between items-center text-cyan-400 font-bold"><span>نقاط خبرة:</span><span class="numbers-font font-mono text-xs">+${Number(pkg.xp).toLocaleString()} XP</span></div>` :''}
            ${badge ?`<div class="flex justify-between items-center text-yellow-400 font-bold"><span>وسام VIP:</span><span class="flex items-center gap-1">${badge} ${pkg.badgeTitle ||''}</span></div>` :''}
            ${itemsList ?`<div class="flex justify-between items-center text-purple-300 font-bold"><span>معدات إضافية:</span><span class="text-[10px] truncate max-w-[140px]">${itemsList}</span></div>` :''}
          </div>
        </div>

        <!-- Action Button -->
        <button class="btn-select-topup-pkg w-full py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer">
          <i class="fa-solid fa-bolt"></i>
          <span>طلب وشحن الباقة </span>
        </button>`;

      card.querySelector('.btn-select-topup-pkg').onclick = () => {
        selectPackageForTopup(pkg);
      };

      container.appendChild(card);
    });
  }

  function selectPackageForTopup(pkg) {
    playMenuSound('click');
    _activeSelectedTopupPkg = pkg;

    const summaryEl = document.getElementById('topup-selected-pkg-summary');
    if (summaryEl) {
      const badge = pkg.customBadge ||'';
      summaryEl.innerHTML =`
        <div class="flex items-center gap-2.5 min-w-0">
          ${badge ?`<span class="text-2xl shrink-0">${badge}</span>` :''}
          <div class="min-w-0">
            <h4 class="font-black text-white text-xs sm:text-sm truncate">${pkg.name}</h4>
            <span class="text-[10px] text-amber-300 block">المبلغ المطلوب تحويله: <strong class="numbers-font text-amber-400 font-black text-xs">${Number(pkg.price).toLocaleString()} EGP</strong></span>
          </div>
        </div>
        <span class="text-[10px] px-2.5 py-1 bg-amber-500/20 text-amber-300 rounded-xl border border-amber-500/30 font-black shrink-0">باقة مختارة</span>`;
    }

    // Reset inputs & notice
    const phoneInput = document.getElementById('topup-sender-phone');
    const receiptInput = document.getElementById('topup-receipt-number');
    if (phoneInput) phoneInput.value ='';
    if (receiptInput) receiptInput.value ='';

    document.getElementById('topup-success-notice')?.classList.add('hidden');
    document.getElementById('player-topup-form')?.classList.remove('hidden');

    document.getElementById('topup-view-packages')?.classList.add('hidden');
    document.getElementById('topup-view-confirmation')?.classList.remove('hidden');
  }

  async function submitTopupOrder() {
    if (!_activeSelectedTopupPkg) {
      showToast('خطأ','يرجى اختيار باقة شحن أولاً.','error');
      return;
    }

    const phone = (document.getElementById('topup-sender-phone')?.value ||'').trim();
    const receipt = (document.getElementById('topup-receipt-number')?.value ||'').trim();
    const submitBtn = document.getElementById('btn-submit-topup-request');
    const btnText = document.getElementById('topup-submit-btn-text');

    if (!phone || !receipt) {
      showToast('بيانات ناقصة','يرجى إدخال رقم الهاتف المحوّل منه ورقم العملية أو الوصل.','error');
      return;
    }

    try {
      if (submitBtn) submitBtn.disabled = true;
      if (btnText) btnText.innerHTML ='<i class="fa-solid fa-spinner animate-spin"></i> جاري الإرسال...';

      const requestPayload = {
        username: GameEngine.activeUsername,
        packageId: _activeSelectedTopupPkg.id,
        packageName: _activeSelectedTopupPkg.name,
        price: _activeSelectedTopupPkg.price,
        rewards: {
          cash: _activeSelectedTopupPkg.cash || 0,
          bank: _activeSelectedTopupPkg.bank || 0,
          xp: _activeSelectedTopupPkg.xp || 0,
          customBadge: _activeSelectedTopupPkg.customBadge ||'',
          badgeTitle: _activeSelectedTopupPkg.badgeTitle ||'',
          items: _activeSelectedTopupPkg.items || {}
        },
        senderPhoneOrName: phone,
        receiptNumber: receipt
      };

      await AppDB.submitTopupRequest(requestPayload);

      playCasinoSound('win');
      showToast('تم الإرسال بنجاح','طلب الشحن قيد المراجعة لدى الإدارة حالياً.','success');

      document.getElementById('player-topup-form')?.classList.add('hidden');
      document.getElementById('topup-success-notice')?.classList.remove('hidden');
    } catch (err) {
      showToast('خطأ في إرسال الطلب', err.message ||'تعذر إرسال الطلب','error');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
      if (btnText) btnText.textContent ='إرسال طلب الشحن للإدارة';
    }
  }

  function bindTopupModalEvents() {
    if (_topupModalEventsBound) return;
    _topupModalEventsBound = true;

    // Close button
    const closeBtn = document.getElementById('btn-close-topup-modal');
    if (closeBtn) closeBtn.onclick = () => closeTopupModal();

    // Back to packages button
    const backBtn = document.getElementById('btn-topup-back-to-pkgs');
    if (backBtn) {
      backBtn.onclick = () => {
        playMenuSound('click');
        document.getElementById('topup-view-packages')?.classList.remove('hidden');
        document.getElementById('topup-view-confirmation')?.classList.add('hidden');
      };
    }

    // Copy Vodafone Cash
    const copyVodafoneBtn = document.getElementById('btn-copy-topup-vodafone');
    if (copyVodafoneBtn) {
      copyVodafoneBtn.onclick = () => {
        const num = document.getElementById('player-topup-vodafone-num')?.textContent ||'';
        navigator.clipboard.writeText(num.trim());
        showToast('تم النسخ','تم نسخ رقم فودافون كاش للحافظة.','info');
      };
    }

    // Copy InstaPay
    const copyInstapayBtn = document.getElementById('btn-copy-topup-instapay');
    if (copyInstapayBtn) {
      copyInstapayBtn.onclick = () => {
        const num = document.getElementById('player-topup-instapay-num')?.textContent ||'';
        navigator.clipboard.writeText(num.trim());
        showToast('تم النسخ','تم نسخ حساب انستاباي للحافظة.','info');
      };
    }
  }
  // ─────────────────────────────────────────────
  //  NOTIFICATIONS & MESSAGES CENTER CONTROLLER
  // ─────────────────────────────────────────────
  let _notificationsModalEventsBound = false;

  function bindNotificationsModalEvents() {
    if (_notificationsModalEventsBound) return;
    _notificationsModalEventsBound = true;

    // Filter tabs
    const filterBtns = document.querySelectorAll('.mailbox-tab-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        playMenuSound('click');
        filterBtns.forEach(b => {
          b.classList.remove('active','bg-amber-500','text-slate-950','font-black');
          b.classList.add('bg-slate-900','text-slate-300','font-bold');
        });
        btn.classList.add('active','bg-amber-500','text-slate-950','font-black');
        btn.classList.remove('bg-slate-900','text-slate-300','font-bold');

        _currentMailboxFilter = btn.dataset.filter ||'all';
        if (window.lastMailsCache) {
          renderMailbox(window.lastMailsCache);
        }
      });
    });

    // Close button
    const closeBtn = document.getElementById('btn-close-notifications-modal');
    if (closeBtn) closeBtn.addEventListener('click', closeNotificationsModal);

    // Mark all read button
    const markAllBtn = document.getElementById('btn-mark-all-mails-read');
    if (markAllBtn) markAllBtn.addEventListener('click', markAllMailsReadAction);
  }

  function openNotificationsModal() {
    playMenuSound('modal_open');
    bindNotificationsModalEvents();
    const modal = document.getElementById('modal-notifications-center');
    if (modal) modal.classList.remove('hidden');
    if (window.lastMailsCache) {
      renderMailbox(window.lastMailsCache);
    }
  }

  function closeNotificationsModal() {
    playMenuSound('modal_close');
    const modal = document.getElementById('modal-notifications-center');
    if (modal) modal.classList.add('hidden');
  }

  async function markAllMailsReadAction() {
    if (!GameEngine.activeUsername) return;
    try {
      playMenuSound('click');
      await AppDB.markAllMailsRead(GameEngine.activeUsername);
      showToast('صندوق البريد','تم تحديد كافة الرسائل والإشعارات كمقروءة','success');
      if (window.lastMailsCache) {
        window.lastMailsCache.forEach(m => {
          if (m.status ==='unread' || m.status ==='pending') m.status ='read';
        });
        renderMailbox(window.lastMailsCache);
      }
    } catch (e) {
      showToast('خطأ','تعذر تحديث حالة الإشعارات','error');
    }
  }

  // ─────────────────────────────────────────────
  //  PLAYER TOOLS & INVENTORY CONTROLLER
  // ─────────────────────────────────────────────
  const INVENTORY_ITEM_CATALOG = {
    // Top-Up & VIP items
    vip_casino_pass: {
      id:'vip_casino_pass',
      name:'بطاقة VIP لكازينو الحظ',
      icon:'fa-solid fa-dice text-amber-400',
      category:'vip',
      badge:'VIP حصري',
      badgeClass:'bg-amber-500/20 text-amber-300 border-amber-500/40',
      desc:'بونص +20% إضافي على أرباح الكازينو وعجلة الحظ، واسترداد تعادل البلاك جاك.',
      isUsable: true,
      durationTicks: 100
    },
    safe_lock: {
      id:'safe_lock',
      name:'قفل الأمان السويسري المشفر',
      icon:'fa-solid fa-lock text-emerald-400',
      category:'vip',
      badge:'أمان بنكي',
      badgeClass:'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      desc:'أداة حماية متقدمة لحسابك وأرصدتك البنكية ضد المخاطر والأزمات المالية.',
      isUsable: false
    },
    swiss_safe: {
      id:'swiss_safe',
      name:'خزنة البنك السويسري السرية',
      icon:'fa-solid fa-vault text-yellow-400',
      category:'vip',
      badge:'أصول ملكية ️',
      badgeClass:'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
      desc:'خزنة سرية مؤمنة بنكياً ترفع كفاءة حفظ أموالك واستثماراتك.',
      isUsable: false
    },
    swiss_vault: {
      id:'swiss_vault',
      name:'خزنة البنك السويسري السرية',
      icon:'fa-solid fa-vault text-yellow-400',
      category:'vip',
      badge:'أصول ملكية ️',
      badgeClass:'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
      desc:'خزنة سرية مؤمنة بنكياً ترفع كفاءة حفظ أموالك واستثماراتك.',
      isUsable: false
    },
    offshore_account: {
      id:'offshore_account',
      name:'حساب مالي خارجي (Offshore)',
      icon:'fa-solid fa-earth-americas text-sky-400',
      category:'vip',
      badge:'ملاذ دولي',
      badgeClass:'bg-sky-500/20 text-sky-300 border-sky-500/40',
      desc:'حساب مصرفي دولي يحفظ أموالك وأرباحك من الضرائب والمقتطعات.',
      isUsable: false
    },
    lottery_ticket: {
      id:'lottery_ticket',
      name:'تذكرة اليانصيب الكبرى',
      icon:'fa-solid fa-ticket text-rose-400',
      category:'vip',
      badge:'سحب الحظ ️',
      badgeClass:'bg-rose-500/20 text-rose-300 border-rose-500/40',
      desc:'تذكرة مؤهلة للدخول في سحوبات اليانصيب وتوزيع الجوائز الكبرى.',
      isUsable: false
    },
    lottery_tickets: {
      id:'lottery_tickets',
      name:'تذكرة اليانصيب الكبرى',
      icon:'fa-solid fa-ticket text-rose-400',
      category:'vip',
      badge:'سحب الحظ ️',
      badgeClass:'bg-rose-500/20 text-rose-300 border-rose-500/40',
      desc:'تذكرة مؤهلة للدخول في سحوبات اليانصيب وتوزيع الجوائز الكبرى.',
      isUsable: false
    },
    // Store items
    gold_pen: {
      id:'gold_pen',
      name:'القلم الذهبي للمدراء',
      icon:'fa-solid fa-pen-nib text-yellow-400',
      category:'store',
      badge:'خبرة وظيفية ️',
      badgeClass:'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
      desc:'يزيد خبرتك الوظيفية XP بنسبة +8% لتسريع الترقيات.',
      isUsable: true,
      durationTicks: 180
    },
    premium_lawyer: {
      id:'premium_lawyer',
      name:'توكيل محامٍ دولي قدير',
      icon:'fa-solid fa-scale-balanced text-amber-400',
      category:'store',
      badge:'حماية قانونية ️',
      badgeClass:'bg-amber-500/20 text-amber-300 border-amber-500/40',
      desc:'يخفض خطورة القبض في صفقات السوق المحظورة بنسبة -6%.',
      isUsable: true,
      durationTicks: 300
    },
    energy_drink: {
      id:'energy_drink',
      name:'مشروب الطاقة والتركيز الفائق',
      icon:'fa-solid fa-bolt text-lime-400',
      category:'store',
      badge:'نشاط مضاعف',
      badgeClass:'bg-lime-500/20 text-lime-300 border-lime-500/40',
      desc:'يزيد راتب نوبات العمل بنسبة +12.5%.',
      isUsable: true,
      durationTicks: 90
    },
    tax_shield: {
      id:'tax_shield',
      name:'درع الإعفاء والملاذ الضريبي',
      icon:'fa-solid fa-shield-halved text-emerald-400',
      category:'store',
      badge:'ملاذ ضريبي ️',
      badgeClass:'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      desc:'خصم 4% على ترقيات الشركات ويخفض ضريبة الثروة بنسبة 12.5%.',
      isUsable: true,
      durationTicks: 7200
    },
    market_scanner: {
      id:'market_scanner',
      name:'ماسح البورصة والتداول الذكي',
      icon:'fa-solid fa-chart-line text-sky-400',
      category:'store',
      badge:'تداول ذكي',
      badgeClass:'bg-sky-500/20 text-sky-300 border-sky-500/40',
      desc:'يخفف أثر الهبوط والتصحيحات العكسية لأسهمك بنسبة 10%.',
      isUsable: true,
      durationTicks: 240
    },
    quantum_cpu: {
      id:'quantum_cpu',
      name:'معالج الحوسبة الكمومية',
      icon:'fa-solid fa-microchip text-purple-400',
      category:'store',
      badge:'تسريع إنتاج',
      badgeClass:'bg-purple-500/20 text-purple-300 border-purple-500/40',
      desc:'يرفع أرباح وتدفقات كافة مشاريعك بنسبة +12.5%.',
      isUsable: true,
      durationTicks: 240
    },
    diamond_card: {
      id:'diamond_card',
      name:'عضوية النادي الماسي للبنوك',
      icon:'fa-solid fa-gem text-cyan-400',
      category:'store',
      badge:'نادي ماسي',
      badgeClass:'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      desc:'ترفع فوائد الودائع البنكية بنسبة 10% وتخفض ضرائب الثروة بنسبة 12.5%.',
      isUsable: true,
      durationTicks: 480
    },
    cronos_gear: {
      id:'cronos_gear',
      name:'ساعة الكرونوس لتسريع العمليات',
      icon:'fa-solid fa-stopwatch text-orange-400',
      category:'store',
      badge:'تسريع وقت ⏱️',
      badgeClass:'bg-orange-500/20 text-orange-300 border-orange-500/40',
      desc:'تقلل وقت التبريد وفترات نوبات العمل بنسبة 15%.',
      isUsable: true,
      durationTicks: 300
    }
  };

  let _currentInventoryCategory ='all';
  let _inventoryModalEventsBound = false;

  function bindInventoryModalEvents() {
    if (_inventoryModalEventsBound) return;
    _inventoryModalEventsBound = true;

    // Filter tabs
    const filterBtns = document.querySelectorAll('.inventory-filter-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        playMenuSound('click');
        filterBtns.forEach(b => {
          b.classList.remove('active','bg-sky-500','text-slate-950','font-black');
          b.classList.add('bg-slate-900','text-slate-300','font-bold');
        });
        btn.classList.add('active','bg-sky-500','text-slate-950','font-black');
        btn.classList.remove('bg-slate-900','text-slate-300','font-bold');

        _currentInventoryCategory = btn.dataset.category ||'all';
        renderPlayerInventory();
      });
    });

    const closeBtn = document.getElementById('btn-close-inventory-modal');
    if (closeBtn) closeBtn.addEventListener('click', closePlayerInventoryModal);
  }

  function openPlayerInventoryModal() {
    playMenuSound('modal_open');
    bindInventoryModalEvents();
    const modal = document.getElementById('modal-player-inventory');
    if (modal) modal.classList.remove('hidden');
    renderPlayerInventory();
  }

  function closePlayerInventoryModal() {
    playMenuSound('modal_close');
    const modal = document.getElementById('modal-player-inventory');
    if (modal) modal.classList.add('hidden');
  }

  function renderPlayerInventory() {
    const grid = document.getElementById('player-inventory-grid');
    const totalBadge = document.getElementById('modal-inventory-total-badge');
    const desktopBadge = document.getElementById('desktop-inventory-count-badge');
    const mobileBadge = document.getElementById('mobile-inventory-count-badge');

    const s = GameEngine.state || {};
    const inventory = s.inventory || {};
    const itemDurations = s.itemDurations || {};

    let totalItemsCount = 0;
    const ownedItemIds = Object.keys(inventory).filter(id => Number(inventory[id]) > 0);

    // Also include items with active durations even if inventory quantity depleted
    Object.keys(itemDurations).forEach(id => {
      if (itemDurations[id] > 0 && !ownedItemIds.includes(id)) {
        ownedItemIds.push(id);
      }
    });

    ownedItemIds.forEach(id => {
      totalItemsCount += (Number(inventory[id]) || 0);
    });

    if (totalBadge) totalBadge.textContent =`${totalItemsCount} مقتنى`;
    if (desktopBadge) desktopBadge.textContent =`${totalItemsCount}`;
    if (mobileBadge) {
      mobileBadge.textContent = totalItemsCount;
      mobileBadge.classList.toggle('hidden', totalItemsCount === 0);
    }

    if (!grid) return;
    grid.innerHTML ='';

    // Filter by Category
    let visibleIds = ownedItemIds;
    if (_currentInventoryCategory ==='vip') {
      visibleIds = ownedItemIds.filter(id => {
        const def = INVENTORY_ITEM_CATALOG[id];
        return def && def.category ==='vip';
      });
    } else if (_currentInventoryCategory ==='store') {
      visibleIds = ownedItemIds.filter(id => {
        const def = INVENTORY_ITEM_CATALOG[id] || (GameEngine.STORE_ITEMS && GameEngine.STORE_ITEMS[id]);
        return def && def.category !=='vip';
      });
    }

    if (visibleIds.length === 0) {
      grid.innerHTML =`
        <div class="col-span-full p-12 text-center text-slate-500 text-xs">
          <i class="fa-solid fa-briefcase text-3xl mb-3 text-slate-600 block"></i>
          <span class="font-bold block text-sm text-slate-400 mb-1">لا توجد أدوات في هذا القسم</span>
          <span class="text-[11px]">يمكنك الحصول على الأدوات وتصاريح VIP من متجر الأدوات أو باقات الشحن الفوري.</span>
        </div>`;
      return;
    }

    visibleIds.forEach(id => {
      const def = INVENTORY_ITEM_CATALOG[id] || (GameEngine.STORE_ITEMS && GameEngine.STORE_ITEMS[id]) || {
        id,
        name: id,
        icon:'fa-solid fa-cube text-slate-400',
        category:'other',
        badge:'أداة',
        badgeClass:'bg-slate-800 text-slate-300 border-slate-700',
        desc:'أداة ومقتنى خاص في حسابك.',
        isUsable: false
      };

      const count = Number(inventory[id]) || 0;
      const ticksRemaining = Number(itemDurations[id]) || 0;
      const isActive = ticksRemaining > 0;
      const secRemaining = ticksRemaining * 3;

      const card = document.createElement('div');
      card.className =`p-3.5 rounded-2xl border ${isActive ?'bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-950 border-amber-500/40 shadow-md shadow-amber-500/10' :'bg-slate-900/60 border-slate-800'} flex flex-col justify-between gap-2.5`;

      let actionButtonHtml ='';
      if (def.isUsable) {
        if (isActive) {
          actionButtonHtml =`
            <span class="px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
              <span>نشط: ${secRemaining}ث</span>
            </span>`;
        } else if (count > 0) {
          actionButtonHtml =`
            <button onclick="window.UI.useInventoryItem('${id}')" class="px-3 py-1 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-black text-[10px] shadow transition active:scale-95 cursor-pointer">
              تفعيل الآن 
            </button>`;
        } else {
          actionButtonHtml =`<span class="text-[10px] text-slate-500 font-bold">مستنفد</span>`;
        }
      } else {
        actionButtonHtml =`
          <span class="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 text-[10px] font-bold">
            نشط ومحفوظ 
          </span>`;
      }

      card.innerHTML =`
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-base shrink-0 shadow-inner">
              <i class="${def.icon}"></i>
            </div>
            <div>
              <h4 class="font-black text-white text-xs leading-tight">${def.name}</h4>
              <span class="inline-block px-1.5 py-0.5 rounded-md border text-[9px] font-bold ${def.badgeClass ||'bg-slate-800 text-slate-300 border-slate-700'} mt-0.5">
                ${def.badge ||'أداة'}
              </span>
            </div>
          </div>
          <span class="px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-yellow-400 numbers-font font-black text-xs shrink-0">
            x${count}
          </span>
        </div>

        <p class="text-[11px] text-slate-400 leading-relaxed font-medium">
          ${def.desc}
        </p>

        <div class="flex justify-between items-center pt-2 border-t border-slate-800/80">
          <span class="text-[10px] text-slate-500">${isActive ?'المفعول قيد السريان' : (count > 0 ?'جاهز للاستخدام' :'مستنفد')}</span>
          ${actionButtonHtml}
        </div>`;

      grid.appendChild(card);
    });
  }

  function useInventoryItem(itemId) {
    const s = GameEngine.state;
    if (!s || !s.inventory || !s.inventory[itemId] || s.inventory[itemId] <= 0) {
      showToast('خطأ','لا تمتلك رصيداً كافياً من هذه الأداة.','error');
      return;
    }

    const def = INVENTORY_ITEM_CATALOG[itemId] || (GameEngine.STORE_ITEMS && GameEngine.STORE_ITEMS[itemId]);
    if (!def) return;

    if (!s.itemDurations) s.itemDurations = {};
    if (s.itemDurations[itemId] && s.itemDurations[itemId] > 0) {
      showToast('أداة نشطة','هذه الأداة مفعلة ونشطة بالفعل حالياً.','info');
      return;
    }

    s.inventory[itemId]--;
    s.itemDurations[itemId] = def.durationTicks || 100;
    GameEngine.forceSaveState();
    playMenuSound('success');
    showToast('تم التفعيل!',`تم تفعيل أداة"${def.name}" بنجاح!`,'success');
    renderPlayerInventory();
    renderAll();
  }

  return {
    init,
    renderAll,
    switchTab,
    openMobileNav,
    closeMobileNav,
    showToast,
    returnToStartMenu,
    playMenuSound,
    playCasinoSound,
    openPlayerProfileCard,
    handleMailAction,
    deleteMail,
    registerForAuction,
    placeAuctionBid,
    acquireDistressedBusiness,
    renderAcquisitionMarket,
    renderCorporationsTab,
    createCorporationAction,
    joinCorporationAction,
    contributeCorporationAction,
    buyCorporationProjectAction,
    leaveCorporationAction,
    kickCorpMemberAction,
    editCorpInfoAction,
    transferCorpOwnershipAction,
    dissolveCorpAction,
    adminQuickJailAction,
    adminQuickBanAction,
    promoteCorpMemberAction,
    payoutFromCorpTreasuryAction,
    upgradeCorporationLevelAction,
    buyCarAction,
    setActiveCarAction,
    rentCarAction,
    sellCarAction,
    buySmugglingVehicleAction,
    startSmugglingJobAction,
    toggleAdminSidebarAction,
    toggleServerBoostAction,
    manualSaveProgressAction,
    claimFacebookReward,
    updateFacebookButtonUI,
    openCashflowBreakdownModal,
    closeCashflowBreakdownModal,
    renderCashflowBreakdown,
    triggerMandatoryReloadModal,
    handleIncomingForceReload,

    // Trade & Export Company Exports
    renderTradePanel,
    switchTradeSubtab,
    updateTradeShipmentsInDOM,

    // Industrial Conglomerate Exports
    renderIndustryPanel,
    switchIndustrySector,

    // Top-up & Monetization Exports
    openTopupModal,
    closeTopupModal,
    selectPackageForTopup,
    submitTopupOrder,

    // Notifications & Messages Center Exports
    openNotificationsModal,
    closeNotificationsModal,
    markAllMailsReadAction,

    // Settings Modal Exports
    openSettingsModal: () => openSettingsModal(),
    closeSettingsModal: () => closeSettingsModal(),

    // Player Tools & Inventory Exports
    openPlayerInventoryModal,
    closePlayerInventoryModal,
    renderPlayerInventory,
    useInventoryItem
  };

})();


// Export globally
window.UIController = UIController;
window.UI = UIController;
window.playMenuSound = UIController.playMenuSound;
window.playCasinoSound = UIController.playCasinoSound;

// Global watchdog for mandatory reload (Egress-optimized: checks every 90s when active and not idle)
if (typeof window !=='undefined' && !window.location.pathname.includes('ctrl-vault')) {
  setInterval(async () => {
    if (typeof AppDB !=='undefined' && typeof AppDB.isNetworkActive ==='function' && !AppDB.isNetworkActive()) return;
    if (typeof document !=='undefined' && document.hidden) return;
    try {
      if (typeof AppDB !=='undefined' && typeof AppDB.getForceReloadStatus ==='function') {
        const reloadData = await AppDB.getForceReloadStatus();
        if (reloadData && reloadData.timestamp) {
          if (window.UIController && typeof window.UIController.handleIncomingForceReload ==='function') {
            window.UIController.handleIncomingForceReload(reloadData);
          }
        }
      }
    } catch (e) {}
  }, 90000);
}
