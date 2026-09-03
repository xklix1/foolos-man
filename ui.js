/**
 * Ras ALmal Tycoon (رأس المال)
 * UI Controller (ui.js)
 * Manages rendering, tab views, SVG charts, and interactive casino controls
 */

// Admin identity is determined at runtime from Firestore (isAdmin flag) — no hardcoded credentials.

const UIController = (() => {
  console.log('[UI] Controller Loaded (v=107)');
  let activeTab = 'dashboard';
  let tickIntervalId = null;

  // Translation System (New)
  const currentLang = localStorage.getItem('game_lang') || 'ar';
  window.currentLang = currentLang;

  // Set layout direction on load
  document.documentElement.dir = currentLang === 'en' ? 'ltr' : 'rtl';
  if (currentLang === 'en') {
    document.documentElement.lang = 'en';
  }

  const translationDict = {
    // Nav / Sidebar
    "حسابي": "My Account",
    "المهن والوظائف": "Careers & Jobs",
    "إدارة الأعمال": "Businesses",
    "البنك والتحويلات": "Banking & Wire",
    "ممتلكاتي والعقارات": "Real Estate",
    "البورصة والأسهم": "Stock Market",
    "مصلحة الضرائب": "Tax Department",
    "المتجر والمستودع": "VIP Shop & Inventory",
    "المزادات والصفقات الخاصة": "Auctions & Special",
    "السوق السوداء": "Black Market",
    "كازينو التسلية": "Casino & Slots",
    "توب الأغنياء": "Leaderboard",
    "خروج": "Logout",
    "القائمة": "Menu",
    "الدليل": "Guide",
    "الإدارة": "Admin",
    "الإصدار 1": "Version V2",
    "الإصدار V1.01": "Version V2",
    "الإصدار V2": "Version V2.5",
    "الإصدار V2.5": "Version V2.5",
    "خوادم الأونلاين نشطة": "Online Servers Active",
    "جاهز للإقلاع": "Ready for takeoff",
    "المحفظة النشطة": "Active Profile",
    "سيولة الكاش": "Cash Balance",
    "حساب البنك": "Bank Account",
    "التدفق اللحظي": "Passive Cashflow",
    "إجمالي الثروة": "Net Worth",
    "من الصفر إلى عرش المليارات • محاكي إمبراطورية المال والاستثمار": "From Scratch to Billions • Business Empire Tycoon",
    "محفظتك المحفوظة والجاهزة للمتابعة": "Your Saved Wallet Profile",
    "تسجيل الدخول للمحفظة": "Login to Wallet",
    "رأس المال • Ras ALmal": "Ras ALmal Tycoon",
    "أدخل اسم مستخدم فريد ورمز سري لتأسيس محفظتك وحفظ أرباحك السحابية.": "Enter username & PIN to manage your wallet and save progress.",
    "تسجيل الدخول": "Login",
    "إنشاء حساب جديد": "Register",
    "اسم المستخدم (بالأحرف أو الأرقام)": "Username (letters & numbers)",
    "الرقم السري للمحفظة (PIN)": "PIN Code (numbers)",
    "دخول وتزامن الحساب": "Login & Sync",
    "متابعة الإمبراطورية": "Continue Empire",
    "استكمال إدارتك للأموال والمشاريع": "Resume managing funds & business",
    "بدء رحلة جديدة": "Start New Journey",
    "تأسيس محفظة والانطلاق من الصفر": "Create profile & launch from scratch",
    "تسجيل الدخول لمحفظة سابقة": "Login to existing wallet",
    "استعادة حسابك المحفوظ بكلمة المرور (PIN)": "Restore saved wallet via PIN",
    "عرش الأثرياء": "Wealthiest Leaderboard",
    "دليل الملياردير": "Billionaire Guide",
    "الإعدادات": "Settings",
    "إعدادات اللعبة والصوت": "Game & Sound Settings",
    "تخصيص التجربة والمؤثرات الصوتية والبصرية": "Customize audio & visual preferences",
    "المؤثرات الصوتية (Sound FX)": "Sound FX",
    "أصوات النقر والربح والكازينو والتنبيهات": "Click sounds, earnings, casino, and alerts",
    "الموسيقى المحيطية (Ambient Sound)": "Ambient Sound / Synth",
    "موسيقى هادئة سينمائية لأجواء اللعبة": "Quiet cinematic music for game atmosphere",
    "تأثيرات الإضاءة والنيون (Glow FX)": "Glow & Visual FX",
    "تأثير التوهج والفلورسنت (Glow FX)": "Glow & Visual FX",
    "توهج الذهب والجزيئات المتحركة": "Glow details and animated particles",
    "تجربة نغمة الصوت": "Test Sound Tone",
    "حفظ التفضيلات": "Save Preferences",
    "قاعة الشرف وعرش الأثرياء": "Hall of Fame & Leaderboard",
    "أعلى أصحاب الثروات في سيرفر رأس المال (Ras ALmal) المباشر": "Top billionaires on the live Ras ALmal server",
    "دليل الملياردير الإمبراطوري": "Billionaire Imperial Guide",
    "أسرار الهيمنة وصناعة الثروة من الصفر حتى قمة عرش أثرياء رأس المال": "Secrets of wealth and dominance from scratch to the throne of Ras ALmal",
    "👑 الدليل الإمبراطوري الشامل (المفصل)": "👑 Detailed Billionaire Guide",
    "⚡ الدليل السريع والمختصر": "⚡ Compact Quick Guide",
    "الإصدار الشامل ⭐": "Imperial Edition ⭐",
    "إنشاء محفظة جديدة وبدء اللعب": "Create Profile & Play",
    "الرجوع للقائمة الرئيسية": "Return to Menu",
    "فهمت القواعد! انطلق الآن": "Got the Rules! Start Playing",
    "💡 يمكنك الرجوع للدليل في أي وقت من القائمة أو شريط اللعبة": "💡 You can open this guide at any time from the main menu or HUD",
    "تغيير اللغة / Change Language": "اللغة: العربية",
    "EN": "العربية",
    // Toast titles & messages & game status terms
    "تهانينا": "Congratulations",
    "تم ترقيتك لوظيفة:": "You have been promoted to: ",
    "خطأ الترقية": "Promotion Error",
    "نجاح التأسيس": "Establishment Successful",
    "تم افتتاح مشروع ": "Successfully opened ",
    " بنجاح!": "!",
    "فشل المشروع": "Project Failure",
    "عقود عقارية": "Real Estate Contracts",
    "تم شراء عقار ": "Successfully purchased property ",
    " بنجاح وإضافته لمحفظتك.": " and added it to your portfolio.",
    "بيع كلي": "Full Liquidation",
    "تمت بيع وتسييل كامل الأسهم ": "Successfully sold and liquidated all shares ",
    " سهم) بقيمة ": " shares) for ",
    "فشل البيع": "Sale Failed",
    "خطأ رهان": "Bet Error",
    "ربح ملكي!": "Royal Win!",
    "صبت التخمين ": "You guessed correctly ",
    "التاج الملكي": "Royal Crown",
    "الدرع الدفاعي": "Defense Shield",
    " كسبت ": " won ",
    "بونص سلسلة الفوز: ": "Win streak bonus: ",
    "خسارة الجولة": "Round Lost",
    "لسوء الحظ، استقرت العملة على ": "Unfortunately, the coin landed on ",
    "التاج": "Heads",
    "الدرع": "Tails",
    " خسرت ": " lost ",
    "تحطم الصاروخ": "Rocket Crashed",
    "انفجر الصاروخ عند مضاعف ": "Rocket exploded at multiplier ",
    "خسرت رهانك ": "You lost your bet ",
    "عملية سحب ناجحة": "Cashout Successful",
    "تم سحب أرباحك بقيمة ": "Your profits were cashed out at ",
    " بمضاعف ": " at multiplier ",
    "فاتورة متجر": "Store Bill",
    "تم شراء ": "Successfully purchased ",
    " ودفع القيمة النقود.": " and paid the cash value.",
    "رصيد معلق": "Insufficient Balance",
    "لا تملك أي أسهم في هذه الشركة لبيعها.": "You do not own any shares in this company to sell.",
    "يرجى تحديد مبلغ رهان صحيح.": "Please enter a valid bet amount.",
    "جاكبوت كاسح!": "Jackpot!",
    "🎉 مبروك! حصلت على الجاكبوت الذهبي الأقصى! ربحت ": "🎉 Congrats! You hit the golden jackpot! You won ",
    "فوز الآلة": "Slots Win",
    "ربحت ": "You won ",
    "خسرت ": "You lost ",
    "حظ أوفر": "Better Luck Next Time",
    "خطأ الآلة": "Slots Error",
    "فوز بلاك جاك": "Blackjack Win",
    "تعادل": "Push",
    "خسارة رهان": "Loss",
    "بلاك جاك طبيعي! ربحت ": "Natural Blackjack! You won ",
    "تجاوز الموزع! ربحت ": "Dealer Bust! You won ",
    "تفوقت على الموزع! ربحت ": "You beat the dealer! You won ",
    "تعادل بمجموع ": "Push at score ",
    "! تم احتسابه فوزاً لصالحك (عضوية VIP) ": "! counted as a win (VIP Benefit) ",
    "تعادل (Push) بمجموع ": "Push at score ",
    "؛ تم استرداد الرهان.": "; bet refunded.",
    "تجاوزت الـ 21 (Bust)! خسرت الرهان ": "You went over 21 (Bust)! You lost the bet ",
    "تغلّب الموزع عليك! خسرت الرهان ": "Dealer beat you! You lost the bet ",
    "تم التسجيل بنجاح": "Registered Successfully",
    "تم تسجيل اسمك للمزايدة الحية بنجاح.": "Your name has been registered for the live auction.",
    "فشل التسجيل": "Registration Failed",
    "رصيد غير كافي": "Insufficient Funds",
    "لا تملك رصيداً كافياً لتقديم هذا العرض.": "You do not have enough funds to place this bid.",
    "تمت المزايدة": "Bid Placed",
    "لقد قدمت عرض مزايدة أعلى بنجاح! 🚀": "You placed a higher bid successfully! 🚀",
    "فشل المزايدة": "Bid Failed",
    "لوحة العمل والاستثمار اليومي": "Daily Work & Investment Board",
    "انقر للعمل، أسس مشاريعك الحرة، ودع الأرباح تصب في محفظتك تلقائياً.": "Click to work, build businesses, and accumulate passive income directly.",
    "العمل بنوبة اعتيادية": "Perform Regular Shift",
    "نوبة إضافية مضاعفة (x2.5 راتب + x3 خبرة)": "Double Overtime Shift (x2.5 Pay, x3 XP)",
    "لوحة التحكم والإشراف": "Admin Dashboard",
    "إصدار النظام": "System Version",
    "نوع التخزين": "Storage Type",
    "تحديث الإحصائيات الحية": "Refresh Stats",
    "اللعبة في وضع الصيانة": "Game Under Maintenance",
    "تخضع اللعبة حالياً لأعمال تحديث وصيانة طارئة. يرجى المحاولة لاحقاً.": "The game is currently under maintenance. Please try again later.",
    "حسناً": "OK",
    "الخوادم رهن الصيانة الفنية!": "Servers Under Maintenance!",
    "تخضع اللعبة حالياً لأعمال تحديث وصيانة طارئة من قبل الإدارة لتحسين الأداء وتأمين الحسابات. يرجى الانتظار والمحاولة لاحقاً.": "The game is currently undergoing maintenance. Please try again later.",
    "إعادة فحص حالة الخادم": "Re-check Server Status",
    "بوابة دخول الإدارة والمشرفين (Admin Portal)": "Admin Portal Portal",

    // Jobs
    "عامل باليومية": "Daily Laborer",
    "محاسب صندوق": "Cashier",
    "محاسب مالي قانوني": "Certified Accountant",
    "مدير فرع": "Branch Manager",
    "مدير تنفيذي للمجموعة": "Group CEO",
    "رئيس مجلس الإدارة": "Chairman",
    "مستشار اقتصادي ووزير سابق": "Economic Advisor & Ex-Minister",
    "محافظ البنك المركزي": "Central Bank Governor",
    "رئيس صندوق الاستثمار السيادي": "Sovereign Fund President",
    "إمبراطور كبار المستثمرين": "Emperor of Investors",

    // Businesses
    "عربة القهوة الشعبية": "Street Coffee Cart",
    "سلسلة سوبرماركت البقالة": "Grocery Supermarket Chain",
    "شركة النقل والشحن البري": "Land Shipping & Logistics",
    "مصنع الملابس المنسوجة": "Woven Clothing Factory",
    "مجموعة سلسلة المطاعم الفاخرة": "Luxury Restaurant Chain",
    "شركة البرمجيات والتقنية": "Software & Tech Company",
    "شركة الاتصالات والشبكات": "Telecom & Networks",
    "مصنع البتروكيماويات والغاز": "Petrochemicals & Gas Plant",
    "شركة الملاحة والتنقيب عن الذهب": "Navigation & Gold Mining",
    "مؤسسة استكشاف وتعدين الفضاء": "Space Mining Corporation",

    // Assets
    "شقة سكنية متوسطة": "Standard Apartment",
    "فيلا سكنية بحديقة": "Residential Villa",
    "مبنى إداري تجاري": "Commercial Office Building",
    "فندق سياحي فاخر": "Luxury Tourist Hotel",
    "منتجع شاطئي استوائي": "Tropical Beach Resort",
    "يخت ملكي فاخر خاص": "Giant Royal Yacht",
    "ناطحة سحاب استثمارية": "Investment Skyscraper",
    "جزيرة خاصة مشفرة": "Private Encrypted Island",
    "مجمع قنوات السويس اللوجستي": "Suez Canal Logistics Hub",
    "المحطة المدارية الفضائية": "Orbit Space Station",

    // Stocks
    "البنك التجاري الدولي": "Commercial International Bank",
    "الشرقية للدخان": "Eastern Tobacco Company",
    "المصرية للاتصالات": "Telecom Egypt",
    "فوري للمدفوعات الإلكترونية": "Fawry Payments",
    "صندوق الاستثمار التقني البديل": "Alternative Tech Fund",
    "مؤشر البيتكوين والأصول الرقمية": "Bitcoin Index (Crypto)",
    "صندوق سبائك الذهب الخالص": "Pure Gold Bullion Fund",
    "صندوق الذكاء الاصطناعي العالمي": "Global AI Index Fund",

    // Black Market
    "تهريب سجائر": "Cigarettes Smuggling",
    "أجهزة إلكترونية": "Electronics Smuggling",
    "تسريب بيانات": "Intelligence Data Leak",
    "غسيل أموال سويسري": "Swiss Laundering Hub",
    "اختراق كريبتو": "Crypto Hacking",
    "تهريب الآثار": "Antiques Smuggling",
    "سطو الماس": "Grand Diamond Heist",
    "تهريب اليورانيوم": "Uranium Smuggling",
    "تكنولوجيا دفاعية": "Defense Tech Smuggling",
    "قرصنة البنوك": "Central Bank Cyber Heist",
    "أقمار صناعية": "Satellite Network Hack",
    "عملية العرّاب": "Operation Godfather",
    "تهريب بضائع وسيجار جمركي فاخر": "Cigarettes Smuggling",
    "تهريب حاوية أجهزة إلكترونية حديثة": "Electronics Smuggling",
    "صفقة تسريب سيرفرات وبيانات استخباراتية": "Intelligence Data Leak",
    "مركز غسيل الأموال السويسري": "Swiss Money Laundering Hub",
    "اختراق منصات رقمية وغسيل عملات مشفرة": "Crypto Hacking",
    "تهريب آثار ومخطوطات نادرة لمزادات سرية": "Antiques Smuggling",
    "عملية السطو الكبرى على خزائن الماس الدولية": "Grand Diamond Heist",
    "تهريب اليورانيوم المخصب الدولي": "Uranium Smuggling",
    "صفقة تكنولوجيا دفاعية وشفرات رادار مسربة": "Defense Tech Smuggling",
    "قرصنة واختراق البنوك المركزية": "Central Bank Cyber Heist",
    "السيطرة على شبكة أقمار صناعية وتشفيرها": "Satellite Network Hack",
    "عملية العراب: السيطرة على كارتيل التجارة العالمي": "Operation Godfather",

    // Shop Items
    "جهاز تشويش رادارات الشرطة": "Police Radar Jammer",
    "جواز سفر دبلوماسي مزور": "Fake Diplomatic Passport",
    "المحامي الدولي الكبير": "Premium International Lawyer",
    "الحقيبة الدبلوماسية المؤمنة": "Secured Diplomatic Bag",
    "القلم الذهبي لكتابة العقود": "Golden Pen (XP Boost)",
    "معالج الكوانتم الخارق للبيانات": "Quantum CPU (Biz Boost)",
    "بطاقة العضوية الماسية للبنك": "Diamond Banking Card",
    "بطاقة حظ الكازينو الذهبية": "Golden Casino VIP Pass",
    "ساعة كورنوس لتسريع الزمن": "Cronos Time Accelerator",
    "ترخيص الإدارة الذاتية والمساعدة": "Auto AFK Manager License",
    "القلم الذهبي للمدراء": "Golden Pen for Managers",
    "توكيل محامٍ دولي قدير": "Hire Premium International Lawyer",
    "مشروب الطاقة والتركيز الفائق": "Super Energy & Focus Drink",
    "درع الإعفاء والملاذ الضريبي": "Tax Exemption Shield",
    "ماسح البورصة والتداول الذكي": "Smart Stock Scanner",
    "بطاقة VIP لكازينو الحظ": "Lucky Casino VIP Pass",
    "معالج الحوسبة الكمومية (Quantum Core)": "Quantum Computing Core (Quantum Core)",
    "عضوية النادي الماسي للبنوك الدولية": "International Banks Diamond Club Membership",
    "يزيد خبرتك الوظيفية XP بنسبة +35% لتسريع الترقيات. ينتهي مفعوله بعد دقيقتين.": "Increases job XP gain by +35% to speed up promotions. Expires in 2 minutes.",
    "يخفض خطورة القبض في صفقات السوق المحظورة بنسبة -18% لمدة 4 دقائق.": "Decreases capture risk in black market deals by -18% for 4 minutes.",
    "يمنحك نشاطاً فائقاً ويزيد راتب نوبات العمل بنسبة +60% لمدة 90 ثانية.": "Grants super energy and increases shift salary by +60% for 90 seconds.",
    "يمنحك خصماً قدره 15% على ترقيات الشركات ويخفض ضريبة الثروة بنسبة 50% لمدة 12 ساعة.": "Grants a 15% discount on franchise upgrades and cuts wealth tax by 50% for 12 hours.",
    "يخفف أثر الهبوط والتصحيحات العكسية لأسهمك بنسبة 40% لمدة 3 دقائق.": "Reduces stock drops and corrections impact by 40% for 3 minutes.",
    "ترفع نسبة الفوز في الكازينو وعجلة الحظ بنسبة +15%. تنتهي وتدمر صلاحيتها بعد 300 ثانية.": "Raises casino and fortune wheel win rate by +15%. Expires and self-destructs in 300 seconds.",
    "يضاعف أرباح وتدفقات كافة مشاريعك وشركاتك بنسبة +50% لمدة 6 دقائق.": "Boosts profits and cashflow of all businesses by +50% for 6 minutes.",
    "ترفع فوائد الودائع البنكية وتخفض ضرائب الثروة بنسبة 50% لمدة 10 دقائق.": "Raises bank deposit interest and cuts wealth tax by 50% for 10 minutes.",

    // General Words
    "رصيد البنك:": "Bank Balance:",
    "السيولة النقدية:": "Cash Balance:",
    "العائد المتوقع:": "Expected Yield:",
    "التكلفة الاستثمارية:": "Investment Cost:",
    "شراء وتملك العقار": "Purchase Property",
    "الراتب المضمون:": "Guaranteed Pay:",
    "العائد من الخبرة:": "Experience Gain:",
    "الترقية والتعيين بالوظيفة": "Apply for Promotion",
    "الرتبة الحالية": "Current Rank",
    "مغلق": "Locked",
    "توقيع وتنفيذ العملية": "Sign & Execute",
    "تفاصيل العملية": "Deal Details",
    "تاريخ إنشاء الحساب:": "Account Created:",
    "التدفق اللحظي الإجمالي:": "Gross Passive Flow:",
    "الاستقطاع الضريبي اللحظي:": "Periodic Tax:",
    "صافي التدفق (الفرق):": "Net Flow (Diff):",
    "إحصائيات الخادم الحية": "Live Server Statistics",
    "المستخدمين المسجلين": "Registered Users",
    "إجمالي ثروة السيرفر": "Total Server Wealth",
    "المساجين حالياً": "Jailed Players",
    "الحسابات المحظورة": "Banned Players"
  };

  function translateDOM(root = document.body) {
    if (window.currentLang === 'ar') return;

    // Recursively walk text nodes
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while (node = walker.nextNode()) {
      const text = node.nodeValue.trim();
      if (text && translationDict[text]) {
        node.nodeValue = node.nodeValue.replace(text, translationDict[text]);
      }
    }

    // Translate input placeholders, titles, values
    const elements = root.querySelectorAll('[placeholder], [title], input[type="button"], input[type="submit"]');
    elements.forEach(el => {
      const ph = el.getAttribute('placeholder');
      if (ph && translationDict[ph.trim()]) el.setAttribute('placeholder', translationDict[ph.trim()]);

      const title = el.getAttribute('title');
      if (title && translationDict[title.trim()]) el.setAttribute('title', translationDict[title.trim()]);
    });
  }

  // Work shift cooldown state (2.5 seconds)
  let workCooldownActive = false;
  let workCooldownTimer = null;
  const WORK_COOLDOWN_MS = 2500;

  // Sound FX & Audio System State
  let audioCtx = null;
  let sfxEnabled = localStorage.getItem('rasalmal_sfx_enabled') !== 'false';
  let musicEnabled = localStorage.getItem('rasalmal_music_enabled') === 'true';
  let glowEnabled = localStorage.getItem('rasalmal_glow_enabled') !== 'false';
  let notificationsEnabled = localStorage.getItem('rasalmal_notifications_enabled') !== 'false';
  let coinFlipStreak = 0;
  let ambientOscillator = null;
  let ambientGainNode = null;

  function getAudioCtx() {
    if (!audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        audioCtx = new AudioCtx();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => { });
    }
    return audioCtx;
  }

  // Global user interaction audio unlocker
  const _unlockAudio = () => {
    getAudioCtx();
    window.removeEventListener('pointerdown', _unlockAudio);
    window.removeEventListener('keydown', _unlockAudio);
  };
  window.addEventListener('pointerdown', _unlockAudio, { once: true });
  window.addEventListener('keydown', _unlockAudio, { once: true });

  // ─────────────────────────────────────────────
  //  TOP NOTIFICATIONS (TOAST ENGINE)
  // ─────────────────────────────────────────────
  // ─────────────────────────────────────────────
  //  TOP NOTIFICATIONS (TOAST ENGINE)
  // ─────────────────────────────────────────────
  function showToast(title, message, type = 'info', duration = 2400) {
    if (!notificationsEnabled && type !== 'error') return;
    const container = document.getElementById('toast-container');
    if (!container) return;

    // Trigger corresponding audio chime
    if (sfxEnabled) {
      if (type === 'success') playMenuSound('success');
      else if (type === 'error') playMenuSound('error');
      else if (type === 'warning') playMenuSound('back');
      else playMenuSound('click');
    }

    // Dynamic translation for English mode
    if (window.currentLang === 'en') {
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
    }

    // Cap maximum visible toasts to 2 to prevent screen clutter on mobile
    while (container.children.length >= 2) {
      container.lastElementChild?.remove();
    }

    const toast = document.createElement('div');
    toast.className = 'pointer-events-auto w-full flex items-center gap-2.5 p-2 sm:p-2.5 px-3 rounded-xl border shadow-xl backdrop-blur-xl transition-all duration-300 transform -translate-y-3 opacity-0 cursor-pointer select-none';

    let borderColor = 'border-sky-500/50 shadow-sky-500/10';
    let bgColor = 'bg-slate-950/95';
    let iconHtml = '<i class="fa-solid fa-circle-info text-sky-400 text-sm"></i>';
    let titleColor = 'text-sky-400';

    if (type === 'success') {
      borderColor = 'border-emerald-500/50 shadow-emerald-500/10';
      iconHtml = '<i class="fa-solid fa-circle-check text-emerald-400 text-sm"></i>';
      titleColor = 'text-emerald-400';
    } else if (type === 'error') {
      borderColor = 'border-rose-500/50 shadow-rose-500/10';
      iconHtml = '<i class="fa-solid fa-circle-xmark text-rose-400 text-sm"></i>';
      titleColor = 'text-rose-400';
    } else if (type === 'warning') {
      borderColor = 'border-amber-500/50 shadow-amber-500/10';
      iconHtml = '<i class="fa-solid fa-triangle-exclamation text-amber-400 text-sm"></i>';
      titleColor = 'text-amber-400';
    }

    toast.classList.add(...borderColor.split(' '), ...bgColor.split(' '));

    toast.innerHTML = `
      <div class="shrink-0">${iconHtml}</div>
      <div class="flex-1 min-w-0">
        <h4 class="text-[11px] sm:text-xs font-black ${titleColor} leading-tight">${title || 'إشعار المنظومة'}</h4>
        ${message ? `<p class="text-[10px] sm:text-[11px] text-slate-300 leading-tight mt-0.5 break-words">${message}</p>` : ''}
      </div>
      <button class="text-slate-500 hover:text-white transition text-xs shrink-0 px-1 py-0.5">
        <i class="fa-solid fa-xmark"></i>
      </button>
    `;

    let isDismissed = false;
    const dismiss = () => {
      if (isDismissed) return;
      isDismissed = true;
      toast.style.transform = 'translateY(-10px) scale(0.96)';
      toast.style.opacity = '0';
      setTimeout(() => {
        if (toast.parentElement) toast.parentElement.removeChild(toast);
      }, 200);
    };

    toast.addEventListener('click', dismiss);
    setTimeout(dismiss, duration);

    container.prepend(toast);

    requestAnimationFrame(() => {
      toast.style.transform = 'translateY(0)';
      toast.style.opacity = '1';
    });
  }

  function playMenuSound(type) {
    if (!sfxEnabled) return;
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;

      if (type === 'hover') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1600, ctx.currentTime + 0.035);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.035);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.035);
      } else if (type === 'click') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } else if (type === 'start') {
        const freqs = [440, 554.37, 659.25, 880];
        freqs.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f, ctx.currentTime + idx * 0.07);
          gain.gain.setValueAtTime(0.18, ctx.currentTime + idx * 0.07);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.07 + 0.28);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.07);
          osc.stop(ctx.currentTime + idx * 0.07 + 0.28);
        });
      } else if (type === 'success') {
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.05);
          gain.gain.setValueAtTime(0.14, ctx.currentTime + idx * 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.05 + 0.2);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.05);
          osc.stop(ctx.currentTime + idx * 0.05 + 0.2);
        });
      } else if (type === 'error') {
        const freqs = [320, 220];
        freqs.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
          gain.gain.setValueAtTime(0.14, ctx.currentTime + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.16);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.08);
          osc.stop(ctx.currentTime + idx * 0.08 + 0.16);
        });
      } else if (type === 'back') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(260, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      } else if (type === 'modal_open') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } else if (type === 'modal_close') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
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

      if (type === 'coin') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(987.77, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1318.51, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else if (type === 'win') {
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
          gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.25);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.08);
          osc.stop(ctx.currentTime + idx * 0.08 + 0.25);
        });
      } else if (type === 'jackpot') {
        const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.07);
          gain.gain.setValueAtTime(0.25, ctx.currentTime + idx * 0.07);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.07 + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.07);
          osc.stop(ctx.currentTime + idx * 0.07 + 0.35);
        });
      } else if (type === 'lose') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(140, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else if (type === 'tick') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      } else if (type === 'dice') {
        [0, 0.06, 0.12, 0.18].forEach(t => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(300 + Math.random() * 200, ctx.currentTime + t);
          gain.gain.setValueAtTime(0.1, ctx.currentTime + t);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.04);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + t);
          osc.stop(ctx.currentTime + t + 0.04);
        });
      } else if (type === 'card') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } else if (type === 'siren') {
        [0, 0.25, 0.5, 0.75].forEach((t, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          const freq = idx % 2 === 0 ? 880 : 660;
          osc.frequency.setValueAtTime(freq, ctx.currentTime + t);
          gain.gain.setValueAtTime(0.12, ctx.currentTime + t);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.22);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + t);
          osc.stop(ctx.currentTime + t + 0.22);
        });
      } else if (type === 'fail') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
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
    localStorage.setItem('rasalmal_music_enabled', enabled ? 'true' : 'false');
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

      ambientOscillator.type = 'sine';
      ambientOscillator.frequency.setValueAtTime(110, ctx.currentTime); // A2 deep drone

      filter.type = 'lowpass';
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
  let crashTarget = 1.0;
  let crashState = 'idle'; // 'idle', 'running', 'cashed_out', 'crashed'
  let crashAnimationId = null;
  let crashStartTime = 0;

  // UI Setup & Bindings
  async function init() {
    setupStartMenu();
    setupAuthPanel();
    setupNavigation();
    setupEventListeners();
    setupAdminModal();

    if (window.currentLang === 'en') {
      translateDOM(document.body);
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

    // 4.1 Season 2 Launch Announcement Modal
    const season2Btn = document.getElementById('btn-menu-season2-announce');
    const season2Modal = document.getElementById('season2-launch-modal');
    const closeSeason2Btn = document.getElementById('btn-close-season2-modal');
    const confirmSeason2Btn = document.getElementById('btn-confirm-season2-action');
    const copyS2CodeBtn = document.getElementById('btn-copy-s2-code');

    const openSeason2Modal = async () => {
      playMenuSound('modal_open');
      if (season2Modal) {
        season2Modal.classList.remove('hidden');
        try {
          const honors = await AppDB.getSeasonHonors();
          if (honors) {
            const t1 = document.getElementById('s1-honors-name-top1');
            const t2 = document.getElementById('s1-honors-name-top2');
            const t3 = document.getElementById('s1-honors-name-top3');
            if (t1 && honors.top1 && honors.top1.username) t1.textContent = honors.top1.username;
            if (t2 && honors.top2 && honors.top2.username) t2.textContent = honors.top2.username;
            if (t3 && honors.top3 && honors.top3.username) t3.textContent = honors.top3.username;
          }
        } catch (e) {}
      }
    };

    const hideSeason2Modal = () => {
      playMenuSound('modal_close');
      if (season2Modal) season2Modal.classList.add('hidden');
      try { localStorage.setItem('rasalmal_s2_modal_seen', 'true'); } catch (e) {}
    };

    if (season2Btn) season2Btn.addEventListener('click', openSeason2Modal);
    const inGameSeason2Btn = document.getElementById('btn-ingame-season2');
    const inGameSeason2MobileBtn = document.getElementById('btn-ingame-season2-mobile');
    if (inGameSeason2Btn) inGameSeason2Btn.addEventListener('click', openSeason2Modal);
    if (inGameSeason2MobileBtn) inGameSeason2MobileBtn.addEventListener('click', openSeason2Modal);
    if (closeSeason2Btn) closeSeason2Btn.addEventListener('click', hideSeason2Modal);
    if (confirmSeason2Btn) confirmSeason2Btn.addEventListener('click', hideSeason2Modal);

    if (copyS2CodeBtn) {
      copyS2CodeBtn.addEventListener('click', () => {
        playMenuSound('click');
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText('T3WED').then(() => {
            showToast('نسخ الكود', 'تم نسخ كود التعويض T3WED إلى الحافظة بنجاح! يمكنك استرداده من قسم الهدايا.', 'success');
          }).catch(() => {
            showToast('كود التعويض', 'كود التعويض هو: T3WED', 'info');
          });
        } else {
          showToast('كود التعويض', 'كود التعويض هو: T3WED', 'info');
        }
      });
    }

    // Auto show Season 2 announcement on first visit
    try {
      if (!localStorage.getItem('rasalmal_s2_modal_seen')) {
        setTimeout(() => {
          if (season2Modal && !sessionStorage.getItem('s2_modal_popup_shown')) {
            sessionStorage.setItem('s2_modal_popup_shown', 'true');
            openSeason2Modal();
          }
        }, 900);
      }
    } catch (e) {}

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
        tabDetailedBtn.className = 'flex-1 py-2 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-500 to-amber-600 text-slate-950 shadow-md';
        tabCompactBtn.className = 'flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800';
      });

      tabCompactBtn.addEventListener('click', () => {
        playMenuSound('click');
        viewCompact.classList.remove('hidden');
        viewDetailed.classList.add('hidden');
        tabCompactBtn.className = 'flex-1 py-2 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md';
        tabDetailedBtn.className = 'flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800';
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

    if (sfxToggle) sfxToggle.checked = sfxEnabled;
    if (musicToggle) musicToggle.checked = musicEnabled;
    if (glowToggle) glowToggle.checked = glowEnabled;
    if (notificationsToggle) notificationsToggle.checked = notificationsEnabled;
    updateSoundIconState();

    const openSettingsModal = () => {
      playMenuSound('modal_open');
      if (sfxToggle) sfxToggle.checked = sfxEnabled;
      if (musicToggle) musicToggle.checked = musicEnabled;
      if (glowToggle) glowToggle.checked = glowEnabled;
      if (notificationsToggle) notificationsToggle.checked = notificationsEnabled;
      startSettingsModal.classList.remove('hidden');
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
      closeSettingsBtn.addEventListener('click', () => {
        playMenuSound('modal_close');
        startSettingsModal.classList.add('hidden');
      });
    }

    if (saveSettingsBtn && startSettingsModal) {
      saveSettingsBtn.addEventListener('click', () => {
        playMenuSound('click');
        sfxEnabled = sfxToggle.checked;
        localStorage.setItem('rasalmal_sfx_enabled', sfxEnabled ? 'true' : 'false');
        setAmbientMusicState(musicToggle.checked);
        glowEnabled = glowToggle.checked;
        localStorage.setItem('rasalmal_glow_enabled', glowEnabled ? 'true' : 'false');
        if (notificationsToggle) {
          notificationsEnabled = notificationsToggle.checked;
          localStorage.setItem('rasalmal_notifications_enabled', notificationsEnabled ? 'true' : 'false');
        }
        updateSoundIconState();
        startSettingsModal.classList.add('hidden');
        showToast('تم حفظ الإعدادات', 'تم تحديث تفضيلات الصوت والإشعارات بنجاح.', 'success');
      });
    }

    if (testSoundBtn) {
      testSoundBtn.addEventListener('click', () => {
        playMenuSound('start');
      });
    }

    if (menuSoundBtn) {
      menuSoundBtn.addEventListener('click', () => {
        sfxEnabled = !sfxEnabled;
        localStorage.setItem('rasalmal_sfx_enabled', sfxEnabled ? 'true' : 'false');
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
      langToggleBtn.textContent = currentLang === 'ar' ? 'EN' : 'العربية';
      langToggleBtn.addEventListener('click', () => {
        playMenuSound('click');
        const nextLang = currentLang === 'ar' ? 'en' : 'ar';
        localStorage.setItem('game_lang', nextLang);
        location.reload();
      });
    }

    const langToggleIngameBtn = document.getElementById('btn-lang-toggle-ingame');
    if (langToggleIngameBtn) {
      langToggleIngameBtn.querySelector('span').textContent = currentLang === 'ar' ? 'Language: English' : 'اللغة: العربية';
      langToggleIngameBtn.addEventListener('click', () => {
        playMenuSound('click');
        const nextLang = currentLang === 'ar' ? 'en' : 'ar';
        localStorage.setItem('game_lang', nextLang);
        location.reload();
      });
    }

    const langToggleMobileBtn = document.getElementById('btn-lang-toggle-mobile');
    if (langToggleMobileBtn) {
      langToggleMobileBtn.querySelector('span').textContent = currentLang === 'ar' ? 'EN' : 'العربية';
      langToggleMobileBtn.addEventListener('click', () => {
        playMenuSound('click');
        const nextLang = currentLang === 'ar' ? 'en' : 'ar';
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
      if (e.key === 'Escape') {
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
    container.innerHTML = '';
    const symbols = ['🪙', '💵', '💎', '📈', '🏛️', '💰', '👑', '★'];
    const particleCount = 18;

    for (let i = 0; i < particleCount; i++) {
      const p = document.createElement('div');
      p.className = 'menu-particle';
      p.textContent = symbols[Math.floor(Math.random() * symbols.length)];
      p.style.left = `${Math.random() * 96}%`;
      p.style.fontSize = `${12 + Math.random() * 16}px`;
      p.style.animationDelay = `${Math.random() * 9}s`;
      p.style.animationDuration = `${7 + Math.random() * 7}s`;
      container.appendChild(p);
    }
  }

  function updateSoundIconState() {
    const icon = document.getElementById('menu-sound-icon');
    if (icon) {
      icon.className = sfxEnabled ? 'fa-solid fa-volume-high text-sm' : 'fa-solid fa-volume-xmark text-sm text-rose-400';
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
        if (titleEl) titleEl.textContent = state.title || 'مستثمر صاعد';
        if (worthEl) worthEl.textContent = `${(state.netWorth || (state.cash + state.bank) || 0).toLocaleString()} EGP`;
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
      const mainLayout = document.getElementById('main-game-layout');
      document.getElementById('start-menu-screen').classList.add('hidden');
      document.getElementById('auth-screen').classList.add('hidden');
      hideMaintenanceOverlay();
      if (mainLayout) {
        mainLayout.classList.remove('hidden');
        mainLayout.classList.add('flex');
      }
      setupRealTimeListeners(username);
      AppDB.checkAndCreateDailyBackup(username, GameEngine.state);
      startGameLoop();
      renderAll();
      showToast('أهلاً بعودتك', `تم استئناف جلسة الإمبراطور: ${username}`, 'success');

      // Check and display offline idle earnings with 12-Hour Manager context
      if (playerState && playerState.offlineReport) {
        const rep = playerState.offlineReport;
        const mins = Math.max(1, Math.round(rep.seconds / 60));
        setTimeout(() => {
          if (rep.earnings > 0) {
            showToast('💰 أرباح أثناء غيابك!', `جمعت إمبراطوريتك +${rep.earnings.toLocaleString()} EGP أثناء غيابك (${mins} دقيقة) بفضل ترخيص الإدارة الذاتية!`, 'success');
          } else if (rep.expiredDuringAbsence) {
            showToast('⚠️ تنبيه الإدارة الذاتية', 'انتهت صلاحية ترخيص الـ 12 ساعة أثناء غيابك! يرجى الضغط على زر التجديد لمواصلة جمع الأرباح عند الخروج.', 'warning');
          }
        }, 1200);
        delete playerState.offlineReport;
      }
    } catch (err) {
      showToast('خطأ في التحميل', err.message, 'error');
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

  let currentAuthMode = 'login'; // Shared state across auth triggers
  let isAuthSubmitting = false;

  function showAuthModal(mode = 'login') {
    currentAuthMode = mode;
    const authScreen = document.getElementById('auth-screen');
    const authRegBtn = document.getElementById('auth-switch-reg');
    const authLoginBtn = document.getElementById('auth-switch-login');
    const authModeTitle = document.getElementById('auth-mode-title');
    const authActionBtn = document.getElementById('auth-action-text');

    if (mode === 'register') {
      if (authModeTitle) authModeTitle.textContent = 'تسجيل حساب جديد';
      if (authActionBtn) authActionBtn.textContent = 'إنشاء حساب وبدء اللعب';
      if (authRegBtn) authRegBtn.classList.add('border-yellow-500', 'text-yellow-500');
      if (authLoginBtn) authLoginBtn.classList.remove('border-yellow-500', 'text-yellow-500');
    } else {
      if (authModeTitle) authModeTitle.textContent = 'تسجيل الدخول للمحفظة';
      if (authActionBtn) authActionBtn.textContent = 'دخول وتزامن الحساب';
      if (authLoginBtn) authLoginBtn.classList.add('border-yellow-500', 'text-yellow-500');
      if (authRegBtn) authRegBtn.classList.remove('border-yellow-500', 'text-yellow-500');
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
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="py-6 text-center text-slate-400">
          <i class="fa-solid fa-spinner animate-spin ml-2"></i>
          جاري جلب أحدث بيانات المتصدرين...
        </td>
      </tr>
    `;

    try {
      const players = await AppDB.getLeaderboard(forceRefresh);
      tbody.innerHTML = '';
      if (typeof updateHourlyLeaderboardTimerUI === 'function') updateHourlyLeaderboardTimerUI();

      if (!players || players.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="py-6 text-center text-slate-500">لا يوجد متصدرين مسجلين حالياً.</td></tr>`;
        return;
      }

      // Podium Top 3
      const top1 = players[0];
      const top2 = players[1];
      const top3 = players[2];

      if (top1) {
        document.getElementById('start-podium-name-1').textContent = top1.username;
        document.getElementById('start-podium-worth-1').textContent = `${Number(top1.netWorth || 0).toLocaleString()} EGP`;
      }
      if (top2) {
        document.getElementById('start-podium-name-2').textContent = top2.username;
        document.getElementById('start-podium-worth-2').textContent = `${Number(top2.netWorth || 0).toLocaleString()} EGP`;
      }
      if (top3) {
        document.getElementById('start-podium-name-3').textContent = top3.username;
        document.getElementById('start-podium-worth-3').textContent = `${Number(top3.netWorth || 0).toLocaleString()} EGP`;
      }

      // Rows
      players.slice(0, 15).forEach((p, idx) => {
        const tr = document.createElement('tr');
        const rank = idx + 1;
        const initials = (p.username || 'P').substring(0, 2).toUpperCase();
        tr.className = `transition duration-150 border-b border-slate-900/60 ${rank === 1 ? 'bg-yellow-500/10' : 'hover:bg-slate-900/50'}`;

        let rankBadge = '';
        if (rank === 1) {
          rankBadge = `<span class="w-6 h-6 rounded-lg bg-gradient-to-r from-yellow-500 to-amber-500 text-slate-950 font-black text-[10px] flex items-center justify-center shadow">👑1</span>`;
        } else if (rank === 2) {
          rankBadge = `<span class="w-6 h-6 rounded-lg bg-slate-700 border border-slate-500 text-slate-200 font-black text-[10px] flex items-center justify-center">🥈2</span>`;
        } else if (rank === 3) {
          rankBadge = `<span class="w-6 h-6 rounded-lg bg-amber-950 border border-amber-700 text-amber-300 font-black text-[10px] flex items-center justify-center">🥉3</span>`;
        } else {
          rankBadge = `<span class="text-slate-400 font-bold numbers-font text-xs">#${rank}</span>`;
        }

        tr.innerHTML = `
          <td class="py-2.5 pr-2 text-right">${rankBadge}</td>
          <td class="py-2.5">
            <div class="flex items-center gap-2">
              <div class="w-6 h-6 rounded bg-slate-800 border border-slate-700 text-[9px] font-black text-slate-300 flex items-center justify-center numbers-font">
                ${initials}
              </div>
              <span class="font-black ${rank === 1 ? 'text-yellow-400 glow-gold' : 'text-white'} text-xs truncate max-w-[110px] sm:max-w-none">${p.username}</span>
            </div>
          </td>
          <td class="py-2.5 text-slate-400">
            <span class="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-300 inline-block truncate max-w-[90px] sm:max-w-none">${p.title || 'مستثمر'}</span>
          </td>
          <td class="py-2.5 pl-2 text-left numbers-font font-black ${rank === 1 ? 'text-yellow-400 text-xs glow-gold' : 'text-emerald-400 text-xs'} whitespace-nowrap">
            ${Number(p.netWorth || 0).toLocaleString()} EGP
          </td>
        `;
        tbody.appendChild(tr);
      });
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="4" class="py-6 text-center text-rose-400">تعذر تحميل المتصدرين. تحقق من اتصالك.</td></tr>`;
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
        currentAuthMode = 'register';
        if (authModeTitle) authModeTitle.textContent = 'تسجيل حساب جديد';
        if (authActionBtn) authActionBtn.textContent = 'إنشاء حساب وبدء اللعب';
        authRegBtn.classList.add('border-yellow-500', 'text-yellow-500');
        authLoginBtn.classList.remove('border-yellow-500', 'text-yellow-500');
      });
    }

    if (authLoginBtn) {
      authLoginBtn.addEventListener('click', () => {
        playMenuSound('click');
        currentAuthMode = 'login';
        if (authModeTitle) authModeTitle.textContent = 'تسجيل الدخول للمحفظة';
        if (authActionBtn) authActionBtn.textContent = 'دخول وتزامن الحساب';
        authLoginBtn.classList.add('border-yellow-500', 'text-yellow-500');
        authRegBtn.classList.remove('border-yellow-500', 'text-yellow-500');
      });
    }

    if (authSubmitBtn) {
      authSubmitBtn.addEventListener('click', async () => {
        if (isAuthSubmitting) return; // Prevent concurrent duplicate submissions

        const usernameInput = document.getElementById('auth-username').value.trim();
        const pinInput = document.getElementById('auth-pin').value.trim();

        if (!usernameInput || !pinInput) {
          showToast('خطأ', 'يرجى ملء جميع الحقول للمتابعة.', 'error');
          playMenuSound('back');
          return;
        }

        try {
          isAuthSubmitting = true;
          setAuthLoading(true);



          let playerState;

          if (currentAuthMode === 'register') {
            await AppDB.registerPlayer(usernameInput, pinInput);
            playerState = await GameEngine.loadUserSession(usernameInput);
            localStorage.setItem('rasalmal_active_session_user', usernameInput);
            showToast('نجاح', 'تم تسجيل حسابك الجديد بنجاح! مرحباً بك.', 'success');
          } else {
            const loggedUser = await AppDB.loginPlayer(usernameInput, pinInput);
            playerState = await GameEngine.loadUserSession(usernameInput, loggedUser);
            localStorage.setItem('rasalmal_active_session_user', usernameInput);
            showToast('أهلاً بك', `تم تحميل بيانات الحساب: ${usernameInput}`, 'success');
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

          setupRealTimeListeners(usernameInput);

          startGameLoop();
          renderAll();

          // Check and display offline idle earnings with 12-Hour Manager context
          if (playerState && playerState.offlineReport) {
            const rep = playerState.offlineReport;
            const mins = Math.max(1, Math.round(rep.seconds / 60));
            setTimeout(() => {
              if (rep.earnings > 0) {
                showToast('💰 أرباح أثناء غيابك!', `جمعت إمبراطوريتك +${rep.earnings.toLocaleString()} EGP أثناء غيابك (${mins} دقيقة) بفضل ترخيص الإدارة الذاتية!`, 'success');
              } else if (rep.expiredDuringAbsence) {
                showToast('⚠️ تنبيه الإدارة الذاتية', 'انتهت صلاحية ترخيص الـ 12 ساعة أثناء غيابك! يرجى الضغط على زر التجديد لمواصلة جمع الأرباح عند الخروج.', 'warning');
              }
            }, 1200);
            delete playerState.offlineReport;
          }
        } catch (err) {
          showToast('فشل التحقق', err.message, 'error');
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

  // --- Navigation Controls ---
  function setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-tab-btn');
    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-tab');
        switchTab(target);
      });
    });
  }

  function switchTab(tabId) {
    if (activeTab !== tabId) {
      playMenuSound('click');
    }
    activeTab = tabId;
    if (tabId === 'bank') {
      fetchAndRenderTransferRequests(true);
    } else if (tabId === 'store') {
      GameEngine.syncItemsConfig().then(() => {
        renderStore();
      });
    } else if (tabId === 'auctions') {
      fetchAndRenderAuctions();
      renderAcquisitionMarket();
    } else if (tabId === 'corporations') {
      renderCorporationsTab();
    }

    // Immediate toggle of jail-overlay based on selected tab
    const jailOverlay = document.getElementById('jail-overlay');
    if (jailOverlay) {
      const state = GameEngine.state;
      const isBlackMarketTab = (tabId === 'blackmarket' || tabId === 'smuggling');
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
        btn.classList.add('text-yellow-500', 'glass-panel-active', 'border-b-2', 'border-yellow-500');
        btn.classList.remove('text-slate-400');
      } else {
        btn.classList.remove('text-yellow-500', 'glass-panel-active', 'border-b-2', 'border-yellow-500');
        btn.classList.add('text-slate-400');
      }
    });

    // Toggle panels visibility
    const panels = document.querySelectorAll('.game-panel');
    panels.forEach(panel => {
      const panelId = panel.getAttribute('id');
      if (panelId === `panel-${tabId}`) {
        panel.classList.remove('hidden');
      } else {
        panel.classList.add('hidden');
      }
    });

    if (tabId === 'careers') {
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
      const isBlackMarketTab = (activeTab === 'blackmarket' || activeTab === 'smuggling');
      if (state && state.jailTimer > 0 && isBlackMarketTab) {
        jailOverlay.classList.remove('hidden');
        const countdownEl = document.getElementById('jail-countdown');
        if (countdownEl) countdownEl.textContent = state.jailTimer;
      } else if (jailOverlay) {
        jailOverlay.classList.add('hidden');
      }

      // Bind legal exit button from jail overlay
      const jailExitBtn = document.getElementById('btn-jail-exit-to-legal');
      if (jailExitBtn && !jailExitBtn._bound) {
        jailExitBtn._bound = true;
        jailExitBtn.addEventListener('click', () => {
          if (jailOverlay) jailOverlay.classList.add('hidden');
          switchTab('dashboard');
        });
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
        if (dirtyEl) dirtyEl.textContent = `${(state.dirtyCash || 0).toLocaleString()} EGP`;
        if (bribeEl) bribeEl.textContent = `${(state.raidBribeCost || 0).toLocaleString()} EGP`;
        if (escapeEl) escapeEl.textContent = `${state.raidEscapeChance || 0}%`;
      } else if (raidOverlay) {
        raidOverlay.classList.add('hidden');
      }

      if (updates.jailFree) {
        showToast('العدالة', 'انتهت مدة محكوميتك. تم الإفراج عنك ويمكنك مزاولة نشاطك!', 'success');
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
          showToast('استثمار ناضج', `اكتمل استثمار "${inv.name}". الأرباح الإجمالية المستلمة: ${inv.payout.toLocaleString()} EGP.`, 'success');
        });
      }

      // Handle random Tip Events
      if (updates.tipEvent) {
        showToast(updates.tipEvent.title, updates.tipEvent.message, updates.tipEvent.gain > 0 ? 'success' : 'error');
      }

      // Handle Dynamic Stock Market Events
      if (updates.marketEvent) {
        showToast(updates.marketEvent.title, updates.marketEvent.desc, updates.marketEvent.toastType || 'info');
        const ticker = document.getElementById('stock-market-news-ticker');
        if (ticker) {
          ticker.textContent = `${updates.marketEvent.title}: ${updates.marketEvent.desc}`;
          ticker.classList.add('text-yellow-400');
        }
      }

      // Fast in-place numerical updates on every tick without DOM destruction
      renderStatsBar();

      if (activeTab === 'dashboard') renderDashboard();
      else if (activeTab === 'bank') updateBankInDOM();
      else if (activeTab === 'business') updateBusinessesInDOM();
      else if (activeTab === 'assets') updateAssetsInDOM();
      else if (activeTab === 'stocks') updateStockPricesInDOM();
      else if (activeTab === 'taxes') renderTaxesTab();
      else if (activeTab === 'blackmarket') updateBlackMarketCooldownsInDOM();

      checkAndClaimDividends();

      // V2: Check and auto-activate pending live auctions from cache
      if (window.lastLiveAuctionsCache) {
        window.lastLiveAuctionsCache.forEach(auc => {
          if (auc.status === 'pending') {
            checkAndStartAuction(auc);
          }
        });
      }

      // V2: Refresh live auctions timer tick in real-time
      if (activeTab === 'auctions' && window.lastLiveAuctionsCache) {
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

    // Desktop stats
    const uEl = document.getElementById('stat-username');
    if (uEl) {
      uEl.textContent = username;
      uEl.classList.add('cursor-pointer', 'hover:underline');
      uEl.title = 'اضغط لعرض ملفك الشخصي وأوسمتك';
      uEl.onclick = () => openPlayerProfileCard(username);
    }
    const tEl = document.getElementById('stat-title');
    if (tEl) tEl.textContent = s.title;

    const cEl = document.getElementById('stat-cash');
    if (cEl) cEl.textContent = s.cash.toLocaleString();
    const bEl = document.getElementById('stat-bank');
    if (bEl) bEl.textContent = s.bank.toLocaleString();
    const nEl = document.getElementById('stat-networth');
    if (nEl) nEl.textContent = s.netWorth.toLocaleString();

    // Live Cashflow Rate
    const cashflow = GameEngine.calculatePassiveIncomePerSecond ? GameEngine.calculatePassiveIncomePerSecond() : 0;
    const cfEl = document.getElementById('stat-cashflow');
    if (cfEl) cfEl.textContent = `+${cashflow.toLocaleString()}`;

    // Mobile stats
    const umEl = document.getElementById('stat-username-mobile');
    if (umEl) {
      umEl.textContent = username;
      umEl.classList.add('cursor-pointer', 'hover:underline');
      umEl.title = 'اضغط لعرض ملفك الشخصي وأوسمتك';
      umEl.onclick = () => openPlayerProfileCard(username);
    }
    const tmEl = document.getElementById('stat-title-mobile');
    if (tmEl) tmEl.textContent = s.title;

    const cmEl = document.getElementById('stat-cash-mobile');
    if (cmEl) cmEl.textContent = s.cash.toLocaleString();
    const bmEl = document.getElementById('stat-bank-mobile');
    if (bmEl) bmEl.textContent = s.bank.toLocaleString();
    const nmEl = document.getElementById('stat-networth-mobile');
    if (nmEl) nmEl.textContent = s.netWorth.toLocaleString();

    const cfmEl = document.getElementById('stat-cashflow-mobile');
    if (cfmEl) cfmEl.textContent = `+${cashflow.toLocaleString()}`;

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
      case 'dashboard':
        renderDashboard();
        break;
      case 'careers':
        renderCareers();
        break;
      case 'business':
        renderBusinesses();
        break;
      case 'bank':
        renderBank();
        break;
      case 'assets':
        renderAssets();
        break;
      case 'stocks':
        renderStocks();
        break;
      case 'taxes':
        renderTaxesTab();
        break;
      case 'store':
        renderStore();
        break;
      case 'auctions':
        renderAuctionsTab();
        break;
      case 'blackmarket':
        renderBlackMarket();
        break;
      case 'casino':
        renderCasino();
        break;
      case 'leaderboard':
        renderLeaderboard();
        break;
    }
    if (window.currentLang === 'en') {
      translateDOM(document.body);
    }
  }

  // --- Tab 1: Dashboard Panel ---
  function renderDashboard() {
    const s = GameEngine.state;
    if (!s) return;

    document.getElementById('dash-uid').textContent = GameEngine.activeUsername;
    document.getElementById('dash-title').textContent = s.title;
    document.getElementById('dash-xp').textContent = s.xp.toLocaleString();
    document.getElementById('dash-cash').textContent = s.cash.toLocaleString() + ' EGP';
    document.getElementById('dash-bank').textContent = s.bank.toLocaleString() + ' EGP';
    const dashDirtyEl = document.getElementById('dash-dirty-cash');
    if (dashDirtyEl) dashDirtyEl.textContent = (s.dirtyCash || 0).toLocaleString() + ' EGP';
    document.getElementById('dash-worth').textContent = s.netWorth.toLocaleString() + ' EGP';

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
      const formatted = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      const pct = Math.min(100, Math.max(2, Math.round((remainingMs / (12 * 3600 * 1000)) * 100)));

      if (badgeEl) {
        badgeEl.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>نشط (تجميع مستمر)`;
        badgeEl.className = 'text-[10px] px-2.5 py-0.5 rounded-full font-black border bg-emerald-500/20 text-emerald-300 border-emerald-500/30 flex items-center gap-1';
      }
      if (barEl) {
        barEl.style.width = `${pct}%`;
        barEl.className = 'bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-500';
      }
      if (timeEl) {
        timeEl.textContent = `${formatted} متبقية`;
        timeEl.className = 'numbers-font text-xs font-bold text-emerald-400';
      }
      if (btnTextEl) {
        btnTextEl.textContent = 'تمديد وردية الإدارة (12 ساعة)';
      }
    } else {
      if (badgeEl) {
        badgeEl.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span>متوقف (يلزم التفعيل)`;
        badgeEl.className = 'text-[10px] px-2.5 py-0.5 rounded-full font-black border bg-rose-500/20 text-rose-300 border-rose-500/30 flex items-center gap-1';
      }
      if (barEl) {
        barEl.style.width = '0%';
        barEl.className = 'bg-rose-500 h-full transition-all duration-500';
      }
      if (timeEl) {
        timeEl.textContent = 'منتهي (انتهت الـ 12 ساعة)';
        timeEl.className = 'numbers-font text-xs font-bold text-rose-400';
      }
      if (btnTextEl) {
        btnTextEl.textContent = 'تفعيل وردية الإدارة (12 ساعة)';
      }
    }
  }

  // --- Tab 2: Careers Panel ---
  function renderCareers() {
    const s = GameEngine.state;
    const container = document.getElementById('careers-list');
    container.innerHTML = '';

    Object.keys(GameEngine.JOBS).forEach(id => {
      const job = GameEngine.JOBS[id];
      const isCurrent = s.jobId === id;
      const isUnlocked = s.xp >= job.xpNeeded;

      const card = document.createElement('div');
      card.className = `glass-panel p-4 rounded-xl flex flex-col justify-between items-start border ${isCurrent ? 'border-yellow-500 bg-yellow-950/20' : 'border-slate-800'}`;

      const translatedJobName = window.currentLang === 'en' ? (translationDict[job.name] || job.name) : job.name;

      card.innerHTML = `
        <div class="w-full flex justify-between items-center mb-2">
          <h4 class="text-lg font-bold text-white">${translatedJobName}</h4>
          ${isCurrent ? `<span class="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-500 rounded border border-yellow-500/30">${window.currentLang === 'en' ? 'Current Job' : 'الوظيفة الحالية'}</span>` : ''}
        </div>
          <div class="text-sm text-slate-400 space-y-1 mb-4 w-full">
          <div class="flex justify-between"><span>${window.currentLang === 'en' ? 'Base Salary:' : 'الراتب الثابت:'}</span><span class="numbers-font text-emerald-400 font-semibold">+${job.salary} EGP / ${window.currentLang === 'en' ? 'cycle' : 'دورة'}</span></div>
          <div class="flex justify-between"><span>${window.currentLang === 'en' ? 'XP Reward:' : 'العائد من الخبرة:'}</span><span class="numbers-font text-blue-400">+${job.xpReward} XP</span></div>
          <div class="flex justify-between"><span>${window.currentLang === 'en' ? 'XP Required:' : 'الخبرة المطلوبة:'}</span><span class="numbers-font">${job.xpNeeded} XP</span></div>
        </div>
        <button 
          data-job-id="${id}"
          class="w-full py-2 rounded-lg font-bold transition duration-300 text-sm ${isCurrent
          ? 'bg-slate-700 text-slate-300 cursor-not-allowed'
          : isUnlocked
            ? 'bg-yellow-500 hover:bg-yellow-600 text-slate-950'
            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
        }"
          ${isCurrent || !isUnlocked ? 'disabled' : ''}
        >
          ${isCurrent ? (window.currentLang === 'en' ? 'You are in this career' : 'أنت تمارس هذه المهنة') : isUnlocked ? (window.currentLang === 'en' ? 'Apply to this job' : 'التحاق بهذه الوظيفة') : (window.currentLang === 'en' ? 'Locked (XP needed)' : `مغلق (تحتاج لخبرة)`)}
        </button>
      `;

      // Apply Promotion Action
      if (!isCurrent && isUnlocked) {
        card.querySelector('button').addEventListener('click', () => {
          try {
            GameEngine.promoteJob(id);
            showToast('تهانينا', `تم ترقيتك لوظيفة: ${job.name}`, 'success');
            renderAll();
          } catch (err) {
            showToast('خطأ الترقية', err.message, 'error');
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

    container.innerHTML = '';
    lastBizLevels = {};

    Object.keys(GameEngine.BUSINESSES).forEach(key => {
      const biz = GameEngine.BUSINESSES[key];
      const bizState = s.businesses[key] || { level: 0, price: biz.optimumPrice, workers: 0 };
      const isOwned = bizState.level > 0;
      lastBizLevels[key] = bizState.level;

      const card = document.createElement('div');
      card.id = `biz-card-${key}`;
      card.className = `glass-panel p-5 rounded-xl border border-slate-800 flex flex-col justify-between ${isOwned ? 'pulse-border-gold bg-slate-900/40' : ''}`;

      if (!isOwned) {
        // Render Purchase Form
        const translatedBizName = window.currentLang === 'en' ? (translationDict[biz.name] || biz.name) : biz.name;
        card.innerHTML = `
          <div class="mb-4">
            <h4 class="text-lg font-bold text-slate-300">${translatedBizName}</h4>
            <p class="text-xs text-slate-500 mt-1">${window.currentLang === 'en' ? 'Purchase a business to start generating automatic profits and hire workers.' : 'شراء مشروع تجاري والبدء بجني الأرباح تلقائياً وتوظيف العمالة.'}</p>
          </div>
          <div class="text-sm text-slate-400 space-y-1 mb-6">
            <div class="flex justify-between"><span>${window.currentLang === 'en' ? 'Establish Cost:' : 'تكلفة التأسيس:'}</span><span class="numbers-font text-yellow-500 font-semibold">${biz.cost.toLocaleString()} EGP</span></div>
            <div class="flex justify-between"><span>${window.currentLang === 'en' ? 'Approx. Base Yield:' : 'العائد التقريبي الأساسي:'}</span><span class="numbers-font text-emerald-400">~${biz.baseDemand * (biz.optimumPrice - biz.costOfGoods)} EGP / ${window.currentLang === 'en' ? 'cycle' : 'دورة'}</span></div>
          </div>
          <button class="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition duration-300">
            ${window.currentLang === 'en' ? 'Establish Business & Invest Capital' : 'تأسيس المشروع واستثمار رأس المال'}
          </button>
        `;
        card.querySelector('button').addEventListener('click', () => {
          try {
            GameEngine.purchaseBusiness(key);
            showToast('نجاح التأسيس', `تم افتتاح مشروع "${biz.name}" بنجاح!`, 'success');
            renderBusinesses(true);
            renderStatsBar();
          } catch (err) {
            showToast('فشل المشروع', err.message, 'error');
          }
        });
      } else {
        const nextUpgradeCost = Math.floor(biz.cost * Math.pow(1.75, bizState.level));
        const workerHireCost = Math.floor(biz.cost * 0.15 * (1 + (bizState.workers || 0)));
        const campaignCost = Math.floor(biz.cost * 0.25);
        const marketingActive = (bizState.marketingTicks && bizState.marketingTicks > 0);
        const marketingSecRemaining = marketingActive ? bizState.marketingTicks * 3 : 0;

        const levelMultiplier = Math.pow(1.12, Math.max(0, (bizState.level || 1) - 1));
        const franchiseOptMultiplier = bizState.isFranchise ? 1.30 : 1.0;
        const opt = Math.round(biz.optimumPrice * levelMultiplier * franchiseOptMultiplier);
        const price = bizState.price || opt;
        let elasticityFactor = 1.0;
        if (price > opt) {
          elasticityFactor = Math.max(0, 1 - (price - opt) / opt);
        } else if (price < opt) {
          elasticityFactor = 1 + (opt - price) / opt * 0.3;
        }

        const costFactor = 1.0 + ((Math.sin(Date.now() / 20000) * 0.1) + 0.05);
        const costOfGoodsLevelMultiplier = Math.pow(1.06, Math.max(0, (bizState.level || 1) - 1));
        const actualCostOfGoods = Math.floor(biz.costOfGoods * costOfGoodsLevelMultiplier * costFactor);
        const upgradeFactor = Math.pow(biz.upgradeMultiplier, bizState.level - 1);
        const workerFactor = 1 + ((bizState.workers || 0) * ((biz.workerMultiplier || 1.2) - 1));
        const marketingBoost = marketingActive ? 1.4 : 1.0;
        const estimatedDemand = Math.floor(biz.baseDemand * upgradeFactor * elasticityFactor * workerFactor * marketingBoost);
        const profitMargin = price - actualCostOfGoods;
        const grossProfit = Math.max(0, Math.floor(estimatedDemand * profitMargin * 0.12));
        const workerPayroll = (bizState.workers || 0) * (biz.workerWage || 0);
        const profitPerTick = Math.max(0, grossProfit - workerPayroll);

        const translatedBizName = window.currentLang === 'en' ? (translationDict[biz.name] || biz.name) : biz.name;
        card.innerHTML = `
          <div class="flex justify-between items-center mb-3">
            <h4 class="text-lg font-bold text-white">${translatedBizName}</h4>
            <span id="biz-level-badge-${key}" class="text-xs px-2.5 py-0.5 ${bizState.isFranchise ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30'} rounded border font-bold">
              ${bizState.isFranchise ? (window.currentLang === 'en' ? 'Franchise Brand 👑' : 'علامة تجارية 👑') : `${window.currentLang === 'en' ? 'Level' : 'المستوى'} ${bizState.level}`}
            </span>
          </div>
          
          <div class="text-xs text-slate-400 space-y-1 mb-4 border-b border-slate-800 pb-3">
            <div class="flex justify-between"><span>${window.currentLang === 'en' ? 'Current Employees:' : 'العمالة الحالية:'}</span><span id="biz-workers-${key}" class="numbers-font text-white font-bold">${bizState.workers || 0} ${window.currentLang === 'en' ? 'workers' : 'عمال'} (${window.currentLang === 'en' ? 'wages' : 'أجور'}: -${workerPayroll} EGP/${window.currentLang === 'en' ? 'cycle' : 'دورة'})</span></div>
            <div class="flex justify-between"><span>${window.currentLang === 'en' ? 'Material/Operation Cost:' : 'تكلفة المواد/التشغيل:'}</span><span id="biz-cog-${key}" class="numbers-font text-rose-400">${actualCostOfGoods} EGP/${window.currentLang === 'en' ? 'unit' : 'وحدة'}</span></div>
            <div class="flex justify-between"><span>${window.currentLang === 'en' ? 'Current Expected Demand:' : 'الطلب الحالي المتوقع:'}</span><span id="biz-demand-${key}" class="numbers-font text-sky-400 font-bold">${estimatedDemand} ${window.currentLang === 'en' ? 'units/cycle' : 'وحدة/دورة'} ${marketingActive ? `<span class="text-yellow-400 font-bold">(${window.currentLang === 'en' ? '+40% Promo' : '+40% ترويج'})</span>` : ''}</span></div>
            <div class="flex justify-between"><span>${window.currentLang === 'en' ? 'Unit Profit Margin:' : 'هامش ربح الوحدة:'}</span><span id="biz-margin-${key}" class="numbers-font ${profitMargin >= 0 ? 'text-teal-400' : 'text-rose-400'} font-bold">${profitMargin} EGP</span></div>
            <div class="flex justify-between"><span>${window.currentLang === 'en' ? 'Actual Net Return:' : 'العائد الصافي الفعلي:'}</span><span id="biz-profit-${key}" class="numbers-font text-emerald-400 font-bold">+${profitPerTick.toLocaleString()} EGP / ${window.currentLang === 'en' ? 'cycle' : 'دورة'} ${bizState.isFranchise ? `<span class="text-amber-400 text-[10px] font-black">(${window.currentLang === 'en' ? '+25% Brand' : '+25% براند'})</span>` : ''}</span></div>
          </div>

          <div class="mb-3">
            <div class="flex justify-between text-xs text-slate-400 mb-1">
              <span>${window.currentLang === 'en' ? 'Adjust Product Price:' : 'تعديل سعر المنتج:'}</span>
              <span class="numbers-font font-bold text-yellow-500"><span id="price-val-${key}">${price}</span> EGP (${window.currentLang === 'en' ? 'Optimum' : 'المثالي'}: ${opt} EGP)</span>
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

          <!-- Marketing Campaign Trigger -->
          <div class="mb-3">
            <button id="btn-marketing-${key}" class="w-full py-1.5 ${marketingActive ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' : 'bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 border-indigo-500/40'} border rounded-lg text-xs font-bold transition flex items-center justify-center gap-1">
              📢 <span id="biz-mktg-text-${key}">${marketingActive ? (window.currentLang === 'en' ? `Active Ad Campaign (${marketingSecRemaining}s remaining)` : `حملة إعلانية نشطة (متبقي ${marketingSecRemaining}ث)`) : (window.currentLang === 'en' ? `Launch promo campaign (+40% demand) — ${campaignCost.toLocaleString()} EGP` : `إطلاق حملة ترويجية مكثفة (+40% مبيعات) — ${campaignCost.toLocaleString()} EGP`)}</span>
            </button>
          </div>

          <div class="grid grid-cols-2 gap-2 mt-2">
            ${bizState.isFranchise ? `
              <button disabled class="py-2 bg-amber-950/20 text-amber-500/50 border border-amber-500/10 rounded-lg text-xs font-bold cursor-not-allowed">
                ${window.currentLang === 'en' ? 'Registered Brand 👑' : 'علامة مسجلة 👑'}
              </button>
            ` : bizState.level >= 10 ? `
              <button id="btn-upgrade-${key}" class="py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-black transition">
                ${window.currentLang === 'en' ? 'Upgrade to Brand 👑' : 'ترقية لبراند 👑'}<br><span id="biz-upgrade-cost-${key}" class="numbers-font text-[9px] opacity-80">${(biz.cost * 15).toLocaleString()} EGP</span>
              </button>
            ` : `
              <button id="btn-upgrade-${key}" class="py-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 rounded-lg text-xs font-bold transition">
                ${window.currentLang === 'en' ? 'Upgrade Level' : 'ترقية المستوى'}<br><span id="biz-upgrade-cost-${key}" class="numbers-font text-[10px] opacity-75">${nextUpgradeCost.toLocaleString()} EGP</span>
              </button>
            `}
            <button id="btn-hire-${key}" class="py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold transition">
              ${window.currentLang === 'en' ? 'Hire Worker' : 'توظيف عمالة'}<br><span id="biz-hire-cost-${key}" class="numbers-font text-[10px] opacity-75">${workerHireCost.toLocaleString()} EGP</span>
            </button>
          </div>
          ${bizState.isFranchise ? `
            <button id="btn-sell-franchise-${key}" class="w-full mt-2 py-2 bg-amber-500/15 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-black transition flex items-center justify-center gap-1 shadow-md">
              <i class="fa-solid fa-right-from-bracket"></i> ${window.currentLang === 'en' ? 'Sell Brand (Liquidate & Refund)' : 'بيع العلامة التجارية (تصفية واسترداد مالي)'}
            </button>
          ` : (bizState.workers && bizState.workers > 0) ? `
            <button id="btn-fire-${key}" class="w-full mt-2 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-xs transition">
              ${window.currentLang === 'en' ? 'Lay off one employee' : 'تسريح عامل واحد'}
            </button>
          ` : ''}
        `;

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
            showToast('حملة ترويجية', `تم إطلاق حملة إعلانية مكثفة لمشروع "${biz.name}" بتكلفة ${res.cost.toLocaleString()} EGP!`, 'success');
            renderBusinesses(true);
            renderStatsBar();
          } catch (err) {
            showToast('فشل الحملة', err.message, 'error');
          }
        });

        // Upgrade action
        const btnUpgrade = card.querySelector(`#btn-upgrade-${key}`);
        if (btnUpgrade) {
          btnUpgrade.addEventListener('click', () => {
            try {
              if (bizState.level >= 10 && !bizState.isFranchise) {
                GameEngine.convertToFranchise(key);
                showToast('علامة تجارية 👑', `تم تسجيل مشروع "${biz.name}" كعلامة تجارية مسجلة بنجاح! 🎉`, 'success');
              } else {
                GameEngine.upgradeBusiness(key);
                showToast('ترقية ناجحة', `تم ترقية مشروع "${biz.name}" للمستوى التالي!`, 'success');
              }
              renderBusinesses(true);
              renderStatsBar();
            } catch (err) {
              showToast('خطأ الترقية', err.message, 'error');
            }
          });
        }

        // Sell Franchise action
        const btnSellFranchise = card.querySelector(`#btn-sell-franchise-${key}`);
        if (btnSellFranchise) {
          btnSellFranchise.addEventListener('click', () => {
            const payoutAmount = Math.floor(biz.cost * 45);
            if (!confirm(`هل أنت متأكد من رغبتك في بيع العلامة التجارية لـ "${biz.name}" بالكامل والخروج من المشروع؟ ستحصل على تعويض نقدي فوري قدره ${payoutAmount.toLocaleString()} EGP!`)) return;
            try {
              const res = GameEngine.sellFranchise(key);
              showToast('استراتيجية خروج 💸', `تم بيع وتصفية علامة "${biz.name}" واستلام مبلغ ${res.payout.toLocaleString()} EGP بنجاح!`, 'success');
              renderBusinesses(true);
              renderStatsBar();
            } catch (err) {
              showToast('خطأ التصفية', err.message, 'error');
            }
          });
        }

        // Hire action
        card.querySelector(`#btn-hire-${key}`).addEventListener('click', () => {
          try {
            GameEngine.hireWorker(key);
            showToast('توظيف عمالة', `تم إضافة عامل جديد إلى "${biz.name}" لتسريع الإنتاج.`, 'success');
            renderBusinesses(true);
            renderStatsBar();
          } catch (err) {
            showToast('خطأ التوظيف', err.message, 'error');
          }
        });

        // Fire action
        if (bizState.workers > 0) {
          const fireBtn = card.querySelector(`#btn-fire-${key}`);
          if (fireBtn) {
            fireBtn.addEventListener('click', () => {
              try {
                GameEngine.fireWorker(key);
                showToast('تعديل عمالة', `تم تسريح عامل لتخفيض تكلفة الإنتاج لـ "${biz.name}".`, 'info');
                renderBusinesses(true);
                renderStatsBar();
              } catch (err) {
                showToast('خطأ', err.message, 'error');
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

      const levelMultiplier = Math.pow(1.12, Math.max(0, (bizState.level || 1) - 1));
      const franchiseOptMultiplier = bizState.isFranchise ? 1.30 : 1.0;
      const opt = Math.round(biz.optimumPrice * levelMultiplier * franchiseOptMultiplier);
      const price = bizState.price || opt;
      let elasticityFactor = 1.0;
      if (price > opt) {
        elasticityFactor = Math.max(0, 1 - (price - opt) / opt);
      } else if (price < opt) {
        elasticityFactor = 1 + (opt - price) / opt * 0.3;
      }

      const costFactor = 1.0 + ((Math.sin(Date.now() / 20000) * 0.1) + 0.05);
      const costOfGoodsLevelMultiplier = Math.pow(1.06, Math.max(0, (bizState.level || 1) - 1));
      const actualCostOfGoods = Math.floor(biz.costOfGoods * costOfGoodsLevelMultiplier * costFactor);
      const upgradeFactor = Math.pow(biz.upgradeMultiplier, bizState.level - 1);
      const workerFactor = 1 + ((bizState.workers || 0) * ((biz.workerMultiplier || 1.2) - 1));
      const marketingActive = (bizState.marketingTicks && bizState.marketingTicks > 0);
      const marketingBoost = marketingActive ? 1.4 : 1.0;
      const estimatedDemand = Math.floor(biz.baseDemand * upgradeFactor * elasticityFactor * workerFactor * marketingBoost);
      const profitMargin = price - actualCostOfGoods;
      const grossProfit = Math.max(0, Math.floor(estimatedDemand * profitMargin * 0.12));
      const workerPayroll = (bizState.workers || 0) * (biz.workerWage || 0);
      const profitPerTick = Math.max(0, grossProfit - workerPayroll);

      const cogEl = document.getElementById(`biz-cog-${key}`);
      if (cogEl) cogEl.textContent = `${actualCostOfGoods} EGP/وحدة`;

      const demandEl = document.getElementById(`biz-demand-${key}`);
      if (demandEl) demandEl.innerHTML = `${estimatedDemand} وحدة/دورة ${marketingActive ? '<span class="text-yellow-400 font-bold">(+40% ترويج)</span>' : ''}`;

      const marginEl = document.getElementById(`biz-margin-${key}`);
      if (marginEl) {
        marginEl.textContent = `${profitMargin} EGP`;
        marginEl.className = `numbers-font ${profitMargin >= 0 ? 'text-teal-400' : 'text-rose-400'} font-bold`;
      }

      const profitEl = document.getElementById(`biz-profit-${key}`);
      if (profitEl) profitEl.textContent = `+${profitPerTick.toLocaleString()} EGP / دورة`;

      const mktgTextEl = document.getElementById(`biz-mktg-text-${key}`);
      if (mktgTextEl) {
        const campaignCost = Math.floor(biz.cost * 0.25);
        const marketingSecRemaining = marketingActive ? bizState.marketingTicks * 3 : 0;
        mktgTextEl.textContent = marketingActive
          ? `حملة إعلانية نشطة (متبقي ${marketingSecRemaining}ث)`
          : `إطلاق حملة ترويجية مكثفة (+40% مبيعات) — ${campaignCost.toLocaleString()} EGP`;
      }
    });
  }

  // --- Tab 4: Bank & Wire Transfers Panel ---
  function formatInvestmentDuration(totalSeconds) {
    if (!totalSeconds || totalSeconds <= 0) return 'جاهز للاستلام! ⚡';
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hrs > 0) return `${hrs}س ${mins}د ${secs}ث`;
    if (mins > 0) return `${mins}د ${secs}ث`;
    return `${secs} ثانية`;
  }

  function renderBank() {
    const s = GameEngine.state;

    // Display basic balances
    document.getElementById('bank-cash').textContent = s.cash.toLocaleString() + ' EGP';
    document.getElementById('bank-balance').textContent = s.bank.toLocaleString() + ' EGP';

    // Show locked investments in bank
    const invContainer = document.getElementById('investments-locked-list');
    if (!invContainer) return;
    invContainer.innerHTML = '';

    if (s.investments.length === 0) {
      invContainer.innerHTML = `
        <div class="text-center text-slate-500 text-sm py-4 border border-dashed border-slate-800 rounded-lg">
          لا يوجد أصول مقفلة حالياً في الصناديق الاستثمارية.
        </div>
      `;
    } else {
      s.investments.forEach((inv, idx) => {
        const remainingSec = inv.ticksRemaining || 0;
        const totalPayout = Math.floor(inv.investedAmount * (1 + inv.rate));

        const row = document.createElement('div');
        row.className = 'glass-panel p-3 rounded-lg border border-slate-800 flex justify-between items-center text-sm';
        row.innerHTML = `
          <div>
            <h5 class="font-bold text-white">${inv.name}</h5>
            <p class="text-xs text-slate-400 mt-1">الرأس مال المودع: <span class="numbers-font">${inv.investedAmount.toLocaleString()} EGP</span></p>
          </div>
          <div class="text-left">
            <span class="text-emerald-400 font-bold numbers-font block">+${totalPayout.toLocaleString()} EGP</span>
            <span id="inv-sec-${idx}" class="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full border border-slate-700 numbers-font inline-block mt-1">متبقي: ${formatInvestmentDuration(remainingSec)}</span>
          </div>
        `;
        invContainer.appendChild(row);
      });
    }
    // Fetch and render transfer requests
    fetchAndRenderTransferRequests();
  }

  function updateBankInDOM() {
    const s = GameEngine.state;
    const cashEl = document.getElementById('bank-cash');
    if (cashEl) cashEl.textContent = s.cash.toLocaleString() + ' EGP';
    const balEl = document.getElementById('bank-balance');
    if (balEl) balEl.textContent = s.bank.toLocaleString() + ' EGP';

    // Update Loan Info
    const maxLoan = Math.max(50000, Math.floor(s.netWorth * 0.35));
    const maxLoanEl = document.getElementById('loan-max-limit');
    if (maxLoanEl) maxLoanEl.textContent = `${maxLoan.toLocaleString()} EGP`;

    const activeLoanEl = document.getElementById('loan-active-amount');
    const dueLoanEl = document.getElementById('loan-due-amount');
    const loanTimeEl = document.getElementById('loan-time-left');
    const loanBadgeEl = document.getElementById('loan-status-badge');

    if (s.activeLoan && s.activeLoan.amount > 0) {
      if (activeLoanEl) activeLoanEl.textContent = `${s.activeLoan.amount.toLocaleString()} EGP`;
      if (dueLoanEl) dueLoanEl.textContent = `${s.activeLoan.totalDue.toLocaleString()} EGP`;
      if (loanTimeEl) loanTimeEl.textContent = `${s.activeLoan.ticksRemaining * 3} ثانية`;
      if (loanBadgeEl) {
        loanBadgeEl.textContent = 'قرض نشط (يلزم السداد)';
        loanBadgeEl.className = 'text-[10px] px-2.5 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-full font-bold';
      }
    } else {
      if (activeLoanEl) activeLoanEl.textContent = 'لا يوجد قرض';
      if (dueLoanEl) dueLoanEl.textContent = '0 EGP';
      if (loanTimeEl) loanTimeEl.textContent = '--';
      if (loanBadgeEl) {
        loanBadgeEl.textContent = 'مؤهل للاقتراض';
        loanBadgeEl.className = 'text-[10px] px-2.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full font-bold';
      }
    }

    if (s.investments && s.investments.length > 0) {
      s.investments.forEach((inv, idx) => {
        const secEl = document.getElementById(`inv-sec-${idx}`);
        if (secEl) {
          secEl.textContent = `متبقي: ${formatInvestmentDuration(inv.ticksRemaining || 0)}`;
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
      .replace(/bg-yellow-\d+/g, 'bg-slate-700')
      .replace(/hover:bg-yellow-\d+/g, '')
      .replace(/text-slate-950/g, 'text-slate-400');
    btn.style.opacity = '0.65';
    btn.style.cursor = 'not-allowed';

    const hasCronos = GameEngine.state && GameEngine.state.inventory && GameEngine.state.inventory.cronos_gear > 0;
    
    let cooldownReduction = 0.0;
    if (hasCronos) cooldownReduction += 0.50;
    
    const activeCarId = GameEngine.state && GameEngine.state.activeCar;
    if (activeCarId === 'lambo') {
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
      btn.innerHTML = `
        <span class="flex items-center justify-center gap-2 w-full">
          <svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
          <span>مهلة زمنية... ${remaining}ث</span>
        </span>
        <div class="absolute bottom-0 right-0 h-0.5 bg-yellow-500/60 transition-all duration-75 rounded-b-lg" style="width: ${barWidth}%; left: 0;"></div>
      `;
      btn.style.position = 'relative';
      btn.style.overflow = 'hidden';
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
        btn.style.opacity = '';
        btn.style.cursor = '';
        btn.style.position = '';
        btn.style.overflow = '';
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
          showToast('خطأ إدخال', 'يرجى إدخال رمز الكود أولاً.', 'error');
          return;
        }

        try {
          btnPlayerRedeemGift.disabled = true;
          btnPlayerRedeemGift.textContent = 'جاري التحقق...';

          const result = await AppDB.redeemGiftCode(code, GameEngine.activeUsername);

          showToast('تم استرداد الهدية! 🎉', `تهانينا! حصلت على: ${result.rewardText}`, 'success');
          playMenuSound('success');

          // Apply changes to local GameEngine.state
          if (result.rewardType === 'cash') {
            GameEngine.state.cash = result.playerUpdates.cash;
            GameEngine.state.netWorth = result.playerUpdates.netWorth;
          } else if (result.rewardType === 'business') {
            GameEngine.state.businesses = result.playerUpdates.businesses;
          } else if (result.rewardType === 'item') {
            GameEngine.state.inventory = result.playerUpdates.inventory;
            GameEngine.state.itemDurations = result.playerUpdates.itemDurations;
          }

          codeInput.value = '';
          renderAll();
        } catch (err) {
          showToast('فشل استرداد الكود', err.message, 'error');
        } finally {
          btnPlayerRedeemGift.disabled = false;
          btnPlayerRedeemGift.innerHTML = '<i class="fa-solid fa-gift"></i> <span>استرداد الهدية</span>';
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
        } else if (action === 'half') {
          input.value = Math.max(100, Math.floor(currentVal / 2));
        } else if (action === 'max') {
          input.value = Math.max(100, Math.min(userCash, 50000000));
        }

        // Add subtle tactile bump animation
        btn.classList.add('scale-90');
        setTimeout(() => btn.classList.remove('scale-90'), 150);
      });
    });

    const s = GameEngine.state;

    // Shift worker button click — with 2-second cooldown + floating reward particle
    const jobWorkBtn = document.getElementById('btn-perform-shift');
    if (jobWorkBtn) {
      jobWorkBtn.addEventListener('click', () => {
        if (workCooldownActive) return;
        try {
          const res = GameEngine.performJobShift();
          const boosts = [];
          if (res.isEnergyBoosted) boosts.push('⚡ مضاعفة الطاقة 2x');
          if (res.isPenBoosted) boosts.push('✍️ القلم الذهبي +50% XP');
          const boostText = boosts.length > 0 ? ` (${boosts.join(' + ')})` : '';

          showPassiveGainFloat(`+${res.salary.toLocaleString()} EGP ⚡`);
          showToast('عمل نوبة', `كسبت +${res.salary.toLocaleString()} EGP و +${res.xp} خبرة${boostText}.`, 'success');
          renderAll();
          startWorkCooldown(jobWorkBtn);
        } catch (err) {
          showToast('خطأ العمل', err.message, 'error');
        }
      });
    }

    // Overtime Double Shift Button
    const overtimeWorkBtn = document.getElementById('btn-perform-overtime-shift');
    if (overtimeWorkBtn) {
      overtimeWorkBtn.addEventListener('click', () => {
        if (workCooldownActive) return;
        try {
          const res = GameEngine.performOvertimeShift();
          const boosts = [];
          if (res.isEnergyBoosted) boosts.push('⚡ مشروب الطاقة 2x');
          if (res.isPenBoosted) boosts.push('✍️ القلم الذهبي +50% XP');
          const boostText = boosts.length > 0 ? ` (${boosts.join(' + ')})` : '';

          showPassiveGainFloat(`+${res.earnedSalary.toLocaleString()} EGP 🔥`);
          showToast('نوبة عمل إضافية مضاعفة', `كسبت +${res.earnedSalary.toLocaleString()} EGP و +${res.earnedXp} خبرة مضاعفة${boostText}!`, 'success');
          renderAll();
          startWorkCooldown(overtimeWorkBtn);
        } catch (err) {
          showToast('خطأ العمل الإضافي', err.message, 'error');
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
          showToast('تجديد وردية الإدارة', 'تم تفعيل ترخيص الإدارة الذاتية والأرباح أثناء الغياب لمدة 12 ساعة بنجاح! ⚡', 'success');
          renderAll();
        } catch (err) {
          showToast('خطأ التجديد', err.message, 'error');
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
          showToast('الدرع الضريبي', 'تم شراء وتفعيل الدرع الضريبي بنجاح! تم خفض ضريبة الثروة بنسبة 75% وتفعيل خصم ترقية المشاريع.', 'success');
          renderAll();
        } catch (err) {
          showToast('فشل التفعيل', err.message, 'error');
        }
      });
    }

    const fileTaxReturnBtn = document.getElementById('btn-file-tax-return');
    if (fileTaxReturnBtn) {
      fileTaxReturnBtn.addEventListener('click', () => {
        try {
          const res = GameEngine.fileTaxDeclaration();
          playMenuSound('success');
          showToast('إقرار ضريبي طوعي', `تم تقديم الإقرار الضريبي وتسوية ${res.cost.toLocaleString()} ج.م بنجاح (+${res.xpGain} XP).`, 'success');
          renderAll();
        } catch (err) {
          showToast('فشل تقديم الإقرار', err.message, 'error');
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
          input.value = '';
          showToast('إيداع بنكي', `تم إيداع ${val.toLocaleString()} EGP بنجاح في حسابك البنكي.`, 'success');
          renderAll();
        } catch (err) {
          showToast('فشل الإيداع', err.message, 'error');
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
          input.value = '';
          showToast('سحب بنكي', `تم سحب ${val.toLocaleString()} EGP نقدية بنجاح.`, 'success');
          renderAll();
        } catch (err) {
          showToast('فشل السحب', err.message, 'error');
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
          input.value = '';
          showToast('تمويل مصرفي', `تم صرف قرض فوري بقيمة ${res.amount.toLocaleString()} EGP وإيداعه في الكاش!`, 'success');
          renderAll();
        } catch (err) {
          showToast('رفض القرض', err.message, 'error');
        }
      });
    }

    // Bank Loan Repayment Action
    const repayLoanBtn = document.getElementById('btn-repay-loan');
    if (repayLoanBtn) {
      repayLoanBtn.addEventListener('click', () => {
        try {
          const res = GameEngine.repayBankLoan();
          showToast('سداد القرض', `تم سداد القرض بالكامل بقيمة ${res.repaid.toLocaleString()} EGP بنجاح وتصفية المستحقات!`, 'success');
          renderAll();
        } catch (err) {
          showToast('فشل السداد', err.message, 'error');
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

        if (action === 'deposit') {
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
        document.getElementById('wire-recipient-input').value = '';
        document.getElementById('wire-amount-input').value = '';

        showToast('حوالة صادرة', `تم تحويل مبلغ ${amount.toLocaleString()} EGP بنجاح إلى "${recipient}".`, 'success');

        // Log transaction locally
        addTransferHistoryRow(recipient, amount);

        renderAll();
      } catch (err) {
        showToast('فشل التحويل', err.message, 'error');
      } finally {
        wireSubmitBtn.disabled = false;
        btnText.classList.remove('hidden');
        btnSpinner.classList.add('hidden');
      }
    });

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
          document.getElementById('request-recipient-input').value = '';
          document.getElementById('request-amount-input').value = '';

          showToast('طلب تحويل', `تم إرسال طلب التحويل بمبلغ ${amount.toLocaleString()} EGP إلى "${recipient}" بنجاح.`, 'success');

          await fetchAndRenderTransferRequests(true);
        } catch (err) {
          showToast('فشل طلب التحويل', err.message, 'error');
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
        requestsTabActive = 'incoming';
        tabIncomingBtn.classList.add('bg-yellow-500', 'text-slate-950');
        tabIncomingBtn.classList.remove('text-slate-400');
        tabSentBtn.classList.remove('bg-yellow-500', 'text-slate-950');
        tabSentBtn.classList.add('text-slate-400');
        if (incomingList) incomingList.classList.remove('hidden');
        if (sentList) sentList.classList.add('hidden');
      });

      tabSentBtn.addEventListener('click', () => {
        requestsTabActive = 'sent';
        tabSentBtn.classList.add('bg-yellow-500', 'text-slate-950');
        tabSentBtn.classList.remove('text-slate-400');
        tabIncomingBtn.classList.remove('bg-yellow-500', 'text-slate-950');
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
        const inputId = `invest-amount-${type}`;
        const amount = parseInt(document.getElementById(inputId).value);

        try {
          if (isNaN(amount) || amount <= 0) throw new Error("يرجى إدخال مبلغ استثمار صحيح.");
          GameEngine.startInvestment(type, amount);
          document.getElementById(inputId).value = '';
          showToast('استثمار مقفل', `تم قفل مبلغ الاستثمار في صندوق: ${GameEngine.INVESTMENTS[type].name}`, 'success');
          renderAll();
        } catch (err) {
          showToast('فشل الاستثمار', err.message, 'error');
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
        } else if (btn.dataset.action === 'half') {
          input.value = Math.max(100, Math.floor(current / 2));
        } else if (btn.dataset.action === 'max') {
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
          ? '<i class="fa-solid fa-volume-high"></i><span>المؤثرات الصوتية: مفعلة</span>'
          : '<i class="fa-solid fa-volume-xmark text-slate-500"></i><span class="text-slate-500">المؤثرات الصوتية: مكتومة</span>';
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
          if (isNaN(bet) || bet <= 0) throw new Error("يرجى إدخال قيمة رهان صحيحة.");
          if (GameEngine.state.cash < bet) throw new Error("رصيدك النقدي لا يكفي لهذا الرهان.");

          coinFlipBtn.disabled = true;
          playCasinoSound('coin');

          const coinVisual = document.getElementById('coin-visual-3d') || document.getElementById('coin-visual');
          if (coinVisual) {
            coinVisual.style.transition = 'transform 0.45s cubic-bezier(0.2, 0.8, 0.3, 1)';
            coinVisual.style.transform = 'rotateY(1800deg) scale(1.1)';
          }

          setTimeout(() => {
            try {
              const res = GameEngine.playCoinFlip(bet, choice, coinFlipStreak);
              const isTails = (res.side === 'tails');
              if (coinVisual) {
                coinVisual.style.transition = 'transform 0.2s ease-out';
                coinVisual.style.transform = isTails ? 'rotateY(1980deg) scale(1)' : 'rotateY(1800deg) scale(1)';
              }

              const streakBadge = document.getElementById('coin-streak-badge');
              if (res.won) {
                coinFlipStreak = (coinFlipStreak || 0) + 1;
                playCasinoSound('win');
                if (streakBadge) {
                  streakBadge.textContent = `سلسلة الانتصارات: ${coinFlipStreak}x متتالية`;
                  streakBadge.className = 'text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30 animate-pulse';
                }
                const multText = res.streakMultiplier > 1 ? ` (بونص سلسلة الفوز: ${res.streakMultiplier}x)` : '';
                showToast('ربح ملكي!', `صبت التخمين (${res.side === 'heads' ? 'التاج الملكي' : 'الدرع الدفاعي'})!${multText} كسبت +${res.profit.toLocaleString()} EGP.`, 'success');
              } else {
                coinFlipStreak = 0;
                playCasinoSound('lose');
                if (streakBadge) {
                  streakBadge.textContent = 'سلسلة الانتصارات: 0';
                  streakBadge.className = 'text-[10px] text-slate-500 font-bold bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800';
                }
                showToast('خسارة الجولة', `لسوء الحظ، استقرت العملة على (${res.side === 'heads' ? 'التاج' : 'الدرع'}). خسرت -${res.loss.toLocaleString()} EGP.`, 'error');
              }
              renderAll();
            } catch (e) {
              showToast('خطأ رهان', e.message, 'error');
            } finally {
              coinFlipBtn.disabled = false;
            }
          }, 450);

        } catch (err) {
          showToast('خطأ رهان', err.message, 'error');
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
          if (isNaN(bet) || bet <= 0) throw new Error("يرجى تحديد مبلغ رهان صحيح.");
          if (GameEngine.state.cash < bet) throw new Error("رصيدك النقدي لا يكفي لهذا الرهان.");

          slotsSpinBtn.disabled = true;
          playCasinoSound('coin');

          const r1 = document.getElementById('slot-reel-1');
          const r2 = document.getElementById('slot-reel-2');
          const r3 = document.getElementById('slot-reel-3');

          r1.classList.add('slot-blur-spin');
          r2.classList.add('slot-blur-spin');
          r3.classList.add('slot-blur-spin');

          const tempIcons = ['CROWN', 'DIAMOND', 'GOLD', 'SACK', 'KEY'];
          const spinInterval = setInterval(() => {
            r1.innerHTML = getReelSymbolIcon(tempIcons[Math.floor(Math.random() * tempIcons.length)]);
            r2.innerHTML = getReelSymbolIcon(tempIcons[Math.floor(Math.random() * tempIcons.length)]);
            r3.innerHTML = getReelSymbolIcon(tempIcons[Math.floor(Math.random() * tempIcons.length)]);
          }, 45);

          setTimeout(() => {
            try {
              const res = GameEngine.playSlots(bet);
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

                  if (res.won) {
                    if (res.isJackpot) {
                      playCasinoSound('jackpot');
                      showToast('جاكبوت كاسح!', `🎉 مبروك! حصلت على الجاكبوت الذهبي الأقصى! ربحت +${res.profit.toLocaleString()} EGP!`, 'success');
                    } else {
                      playCasinoSound('win');
                      showToast('فوز الآلة', `${res.message} ربحت +${res.profit.toLocaleString()} EGP!`, 'success');
                    }
                  } else {
                    playCasinoSound('lose');
                    showToast('حظ أوفر', `${res.message} خسرت -${bet.toLocaleString()} EGP.`, 'error');
                  }
                  renderAll();
                  slotsSpinBtn.disabled = false;
                }, 140);
              }, 140);

            } catch (e) {
              clearInterval(spinInterval);
              showToast('خطأ الآلة', e.message, 'error');
              slotsSpinBtn.disabled = false;
            }
          }, 240);

        } catch (err) {
          showToast('خطأ رهان', err.message, 'error');
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
          if (isNaN(bet) || bet <= 0) throw new Error("يرجى تحديد مبلغ رهان صحيح للروليت.");
          if (GameEngine.state.cash < bet) throw new Error("رصيدك النقدي لا يكفي لهذا الرهان.");

          rouletteBtn.disabled = true;
          playCasinoSound('tick');
          wheel.style.transform = `rotate(${1800 + Math.floor(Math.random() * 360)}deg)`;
          wheel.style.transition = 'all 0.6s cubic-bezier(0.15, 0.9, 0.25, 1)';

          setTimeout(() => {
            try {
              GameEngine.state.cash -= bet;

              // 0 to 36
              const landedNum = Math.floor(Math.random() * 37);
              resNum.textContent = landedNum;

              // Color determination
              let color = 'green';
              const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
              if (landedNum !== 0) {
                color = redNumbers.includes(landedNum) ? 'red' : 'black';
              }

              let won = false;
              let multiplier = 0;

              if (choice === 'green' && landedNum === 0) {
                won = true;
                multiplier = 35;
              } else if (choice === color && landedNum !== 0) {
                won = true;
                multiplier = 2;
              } else if (choice === 'even' && landedNum !== 0 && landedNum % 2 === 0) {
                won = true;
                multiplier = 2;
              } else if (choice === 'odd' && landedNum !== 0 && landedNum % 2 !== 0) {
                won = true;
                multiplier = 2;
              }

              if (won) {
                const winAmount = bet * multiplier;
                GameEngine.state.cash += winAmount;
                const profit = winAmount - bet;
                playCasinoSound('win');
                showToast('فوز الروليت!', `أصابت روليت الحظ رقم ${landedNum} (${color === 'red' ? 'أحمر' : color === 'black' ? 'أسود' : 'الصفر الأخضر'})! ربحت +${profit.toLocaleString()} EGP!`, 'success');
              } else {
                playCasinoSound('lose');
                showToast('خسارة الروليت', `استقرت العجلة على رقم ${landedNum} (${color === 'red' ? 'أحمر' : color === 'black' ? 'أسود' : 'الصفر الأخضر'}). خسرت -${bet.toLocaleString()} EGP.`, 'error');
              }

              GameEngine.forceSaveState();
              renderAll();
            } catch (e) {
              showToast('خطأ روليت', e.message, 'error');
            } finally {
              rouletteBtn.disabled = false;
              wheel.style.transform = 'rotate(0deg)';
              wheel.style.transition = 'none';
            }
          }, 600);

        } catch (err) {
          showToast('خطأ رهان', err.message, 'error');
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
          if (isNaN(bet) || bet <= 0) throw new Error("يرجى تحديد مبلغ رهان صحيح لعجلة الحظ.");
          if (GameEngine.state.cash < bet) throw new Error("رصيدك النقدي لا يكفي لهذا الرهان.");

          wheelBtn.disabled = true;
          playCasinoSound('tick');
          wheelVis.style.transform = `rotate(${1440 + Math.floor(Math.random() * 360)}deg)`;
          wheelVis.style.transition = 'all 0.6s cubic-bezier(0.25, 1, 0.3, 1)';

          setTimeout(() => {
            try {
              GameEngine.state.cash -= bet;

              // Wheel Multipliers distribution table
              const multipliers = [0, 0.5, 1.2, 1.5, 2.0, 3.0, 5.0, 10.0];
              const weights = [15, 25, 25, 15, 10, 6, 3, 1];

              let rand = Math.floor(Math.random() * 100);
              let cumulative = 0;
              let selectedMult = 1.2;

              for (let i = 0; i < multipliers.length; i++) {
                cumulative += weights[i];
                if (rand < cumulative) {
                  selectedMult = multipliers[i];
                  break;
                }
              }

              resText.textContent = `${selectedMult}x`;
              const payout = Math.floor(bet * selectedMult);
              GameEngine.state.cash += payout;

              if (selectedMult > 1.0) {
                playCasinoSound(selectedMult >= 5.0 ? 'jackpot' : 'win');
                showToast('ضربة عجلة الحظ!', `حصلت على مضاعف ${selectedMult}x! ربحت +${(payout - bet).toLocaleString()} EGP.`, 'success');
              } else if (selectedMult === 1.0) {
                showToast('استرداد الرهان', `حصلت على 1.0x واسترددت رهانك بالكامل.`, 'info');
              } else {
                playCasinoSound('lose');
                showToast('خسارة العجلة', `توقفت العجلة عند مضاعف ${selectedMult}x. خسرت -${(bet - payout).toLocaleString()} EGP.`, 'error');
              }

              GameEngine.forceSaveState();
              renderAll();
            } catch (e) {
              showToast('خطأ العجلة', e.message, 'error');
            } finally {
              wheelBtn.disabled = false;
              wheelVis.style.transform = 'rotate(0deg)';
              wheelVis.style.transition = 'none';
            }
          }, 600);

        } catch (err) {
          showToast('خطأ رهان', err.message, 'error');
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
          if (isNaN(bet) || bet <= 0) throw new Error("يرجى تحديد مبلغ رهان صحيح للنرد.");
          if (GameEngine.state.cash < bet) throw new Error("رصيدك النقدي لا يكفي لهذا الرهان.");

          diceRollBtn.disabled = true;
          playCasinoSound('dice');

          d1.classList.add('dice-rolling');
          d2.classList.add('dice-rolling');

          setTimeout(() => {
            try {
              const res = GameEngine.playDice(bet, choice);
              d1.classList.remove('dice-rolling');
              d2.classList.remove('dice-rolling');

              d1.innerHTML = getDicePipIcon(res.die1);
              d2.innerHTML = getDicePipIcon(res.die2);
              if (sumDisplay) sumDisplay.textContent = res.sum;

              if (res.won) {
                playCasinoSound(res.multiplier >= 5 ? 'jackpot' : 'win');
                showToast('فوز النرد الملكي!', `${res.message} ربحت +${res.profit.toLocaleString()} EGP!`, 'success');
              } else {
                playCasinoSound('lose');
                showToast('خسارة النرد', `${res.message} خسرت -${res.loss.toLocaleString()} EGP.`, 'error');
              }

              renderAll();
            } catch (e) {
              showToast('خطأ النرد', e.message, 'error');
            } finally {
              diceRollBtn.disabled = false;
            }
          }, 350);

        } catch (err) {
          showToast('خطأ رهان', err.message, 'error');
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
      if (suit === 'H') return '♥️';
      if (suit === 'D') return '♦️';
      if (suit === 'C') return '♣️';
      if (suit === 'S') return '♠️';
      return suit;
    }

    function createDeck() {
      const suits = ['H', 'D', 'C', 'S'];
      const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
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
      if (card.value === 'A') return 11;
      if (['K', 'Q', 'J'].includes(card.value)) return 10;
      return parseInt(card.value);
    }

    function calculateScore(hand) {
      let score = 0;
      let aces = 0;
      for (let card of hand) {
        score += getCardValue(card);
        if (card.value === 'A') aces++;
      }
      while (score > 21 && aces > 0) {
        score -= 10;
        aces--;
      }
      return score;
    }

    function formatCardHtml(card, hidden = false) {
      if (hidden) {
        return `<div class="w-10 h-14 rounded-lg bg-gradient-to-br from-indigo-950 to-purple-900 border border-indigo-500/50 flex items-center justify-center text-indigo-400 font-bold shadow shadow-indigo-500/20 animate-fade-in"><i class="fa-solid fa-square text-lg"></i></div>`;
      }
      const isRed = ['H', 'D'].includes(card.suit);
      const colorClass = isRed ? 'text-rose-500 border-rose-500/30' : 'text-slate-200 border-slate-700';
      return `<div class="w-10 h-14 rounded-lg bg-slate-900 border ${colorClass} flex flex-col justify-between p-1 shadow font-bold text-xs select-none animate-fade-in">
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
          if (isNaN(bet) || bet < 100) throw new Error("الحد الأدنى للرهان هو 100 EGP.");
          if (GameEngine.state.cash < bet) throw new Error("رصيدك النقدي لا يكفي لهذا الرهان.");

          // Deduct Bet
          GameEngine.state.cash -= bet;
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
          showToast('بلاك جاك', e.message, 'error');
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
        if (GameEngine.state.cash < bjBet) {
          showToast('مضاعفة الرهان', 'رصيدك لا يكفي لمضاعفة الرهان!', 'error');
          return;
        }

        GameEngine.state.cash -= bjBet;
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
      let winText = '';
      let toastType = 'success';
      let sound = 'win';

      const hasVIP = GameEngine.state.inventory && GameEngine.state.inventory.vip_casino_pass > 0;

      if (result === 'blackjack') {
        multiplier = hasVIP ? 2.6 : 2.5;
        winText = `بلاك جاك طبيعي! ربحت +${Math.floor(bjBet * multiplier).toLocaleString()} EGP.`;
        sound = 'jackpot';
      } else if (result === 'win' || result === 'dealer_bust' || result === 'win_vip_push') {
        multiplier = 2.0;
        winText = result === 'dealer_bust'
          ? `تجاوز الموزع! ربحت +${Math.floor(bjBet * multiplier).toLocaleString()} EGP.`
          : (result === 'win_vip_push' ? `تعادل بمجموع ${calculateScore(bjPlayerHand)}! تم احتسابه فوزاً لصالحك (عضوية VIP) +${Math.floor(bjBet * multiplier).toLocaleString()} EGP.` : `تفوقت على الموزع! ربحت +${Math.floor(bjBet * multiplier).toLocaleString()} EGP.`);
      } else if (result === 'push') {
        multiplier = 1.0;
        winText = `تعادل (Push) بمجموع ${calculateScore(bjPlayerHand)}؛ تم استرداد الرهان.`;
        toastType = 'info';
        sound = 'tick';
      } else {
        multiplier = 0;
        winText = result === 'bust'
          ? `تجاوزت الـ 21 (Bust)! خسرت الرهان -${bjBet.toLocaleString()} EGP.`
          : `تغلّب الموزع عليك! خسرت الرهان -${bjBet.toLocaleString()} EGP.`;
        toastType = 'error';
        sound = 'lose';
      }

      if (multiplier > 0) {
        GameEngine.state.cash += Math.floor(bjBet * multiplier);
      }

      playCasinoSound(sound);
      showToast(
        result.includes('win') || result === 'blackjack' || result === 'dealer_bust' ? 'فوز بلاك جاك' : (result === 'push' ? 'تعادل' : 'خسارة رهان'),
        winText,
        toastType
      );

      bjDealBtn.classList.remove('hidden');
      bjBetArea.classList.remove('hidden');
      bjActions.classList.add('hidden');

      updateBlackjackUI(false);
      GameEngine.forceSaveState();
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
          showToast('تم دفع الرشوة', `تم تسوية الوضع بنجاح ودفع رشوة بقيمة ${res.bribeCost.toLocaleString()} EGP.`, 'success');
          const overlay = document.getElementById('police-raid-overlay');
          if (overlay) overlay.classList.add('hidden');
          renderAll();
        } catch (e) {
          showToast('فشل الدفع', e.message, 'error');
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
            showToast('نجاح المقاومة!', 'نجحت في الإفلات من المداهمة الأمنية وتخفيض مستوى الملاحقة دون خسارة مليم واحد!', 'success');
          } else {
            playCasinoSound('fail');
            showToast('فشل المقاومة (سجن ومصادرة)', `ألقت الشرطة القبض عليك؛ تم مصادرة ${res.loss.toLocaleString()} EGP من كاشك القذر وسجنك لمدة 10 دقائق!`, 'error');
          }
          renderAll();
        } catch (e) {
          showToast('خطأ مقاومة', e.message, 'error');
        } finally {
          raidResistBtn.disabled = false;
        }
      });
    }

    // --- Unified Panel Help Modal Logic ---
    const HELP_CONTENT = {
      'panel-admin': {
        title: 'لوحة التحكم والرقابة الإدارية',
        desc: `هذه هي محطة المراقبة والتحكم الشاملة الخاصة بمدير اللعبة (الآدمن):
        <br>• <strong>إدارة اللاعبين</strong>: ابحث عن اللاعبين واعرض بياناتهم التفصيلية (الأرصدة، الأصول، الشركات، والخبرة).
        <br>• <strong>فحص الحساب 🔍</strong>: استخدم أداة كشف الاحتيال المدمجة لتحليل المعاملات، الأرصدة، وخبرة اللاعب الحالية للكشف عن عمليات التلاعب أو الحقن غير القانوني.
        <br>• <strong>إجراءات إدارية</strong>: قم بحقن الأموال، تصفير الكروت، إرسال بث للجميع (Broadcast)، تنظيم وتفعيل المزادات والفعاليات المباشرة.`
      },
      'panel-dashboard': {
        title: 'لوحة التحكم والعمل اليومي',
        desc: `هذه هي لوحة قيادتك المالية والتحكم اليومي:
        <br>• <strong>نوبة العمل العادية</strong>: تمنحك الراتب الأساسي لمهنتك الحالية ونقاط خبرة (XP).
        <br>• <strong>النوبة الإضافية (Overtime 🔥)</strong>: تمنحك <strong>2.5 ضعف الراتب + 3 أضعاف الخبرة (XP)</strong> ولكنها تزيد تعبك.
        <br>• <strong>رخصة العمل التلقائي (AFK Manager)</strong>: عند تفعيلها، تستمر شركاتك في جني أرباحها وتودعها في حسابك البنكي تلقائياً لمدة تصل إلى 12 ساعة وأنت خارج اللعبة.`
      },
      'panel-careers': {
        title: 'الوظائف والمسار المهني',
        desc: `سلم الترقية وزيادة الدخل:
        <br>• تدرج من عامل باليومية إلى إمبراطور المستثمرين عبر 10 مراتب وظيفية.
        <br>• تحتاج إلى تجميع نقاط الخبرة المطلوبة (XP) والضغط على "ترقية وظيفية".
        <br>• تُضاف الرواتب تلقائياً إلى <strong>البنك</strong> لحمايتها من ضرائب السيولة.`
      },
      'panel-business': {
        title: 'إمبراطورية التجارة وإدارة الأعمال',
        desc: `مصدر الأرباح اللحظية كل ثانية:
        <br>• يمكنك الاستثمار في 10 قطاعات مختلفة (قهوة، برمجيات، طيران، فضاء).
        <br>• قم بترقية مستوى الشركة لرفع طاقتها الاستيعابية، ووظف عمالة لمضاعفة الإنتاج.
        <br>• <strong>التسعير المرن</strong>: اضبط السعر المناسب؛ السعر المرتفع يقلل المبيعات، والسعر المنخفض يرفع المبيعات بهامش أقل.
        <br>• جميع أرباح الشركات تودع مباشرة في <strong>البنك</strong> لحمايتها.`
      },
      'panel-bank': {
        title: 'البنك المركزي والادخار والتحويلات',
        desc: `حصنك المالي الآمن واستثمارك التلقائي:
        <br>• <strong>فائدة الادخار</strong>: تنمو ودائعك البنكية تلقائياً بفائدة مركبة بنسبة 0.003% لكل دورة تيك.
        <br>• <strong>التحويلات المالية</strong>: أرسل الأموال لأي لاعب متواجد بالسيرفر فوراً وبشكل مباشر.
        <br>• <strong>القروض البنكية</strong>: خذ قرضاً لتمويل مشاريعك وسدده تدريجياً لتفادي عقوبات السجن الاقتصادي.`
      },
      'panel-assets': {
        title: 'الأصول والعقارات والسيارات',
        desc: `تجميد الأرباح في أصول حقيقية:
        <br>• <strong>العقارات</strong>: اشترِ الفلل وناطحات السحاب والجزر لجني عوائد إيجار لحظية تضاف لحسابك.
        <br>• <strong>السيارات</strong>: امتلك السيارات الفارهة لركوبها أو تأجيرها للاعبين الآخرين لجني عائد دوري.
        <br>• الأصول العقارية والسيارات ترفع من <strong>صافي ثروتك (Net Worth)</strong> بشكل كبير.`
      },
      'panel-stocks': {
        title: 'البورصة والمضاربة المالية',
        desc: `سوق الأسهم الحية:
        <br>• تداول في 8 أسهم وأصول مالية (CIB، فوري، بيتكوين، ذهب، إلخ).
        <br>• <strong>شريط الأخبار 📣</strong>: راقب الأخبار؛ فالحدث الإيجابي يرفع السهم والسلبي يهبط به.
        <br>• <strong>توزيعات الأرباح</strong>: تحصل على عوائد أرباح دورية تلقائية لمجرد احتفاظك بالأسهم.`
      },
      'panel-taxes': {
        title: 'مصلحة الضرائب والوعاء الضريبي',
        desc: `النظام المالي والضرائب:
        <br>• <strong>ضريبة الثروة</strong>: تفرض ضريبة تصاعدية إذا تخطت ثروتك 3 ملايين EGP.
        <br>• <strong>الدروع الضريبية</strong>: يمكنك شراء درع ضريبي من المتجر لحماية جزء من ثروتك وتقليل المبالغ المستقطعة تلقائياً.
        <br>• <strong>التهرب الضريبي</strong>: يؤدي لتصنيف حسابك غير ممتثل ويعرضك للغرامات الفورية.`
      },
      'panel-store': {
        title: 'متجر كبار الشخصيات والحقيبة',
        desc: `المستلزمات ومقويات الكفاءة:
        <br>• اشترِ أغراض تعزز أدائك (القلم الذهبي لزيادة الـ XP، معالج الكوانتم لرفع أرباح شركاتك +50%، تذكرة VIP الكازينو لرفع الحظ).
        <br>• استخدم الأغراض مباشرة من الحقيبة لتفعيلها بمؤقت زمني محدد.`
      },
      'panel-auctions': {
        title: 'المزادات والصفقات الحصرية',
        desc: `الصفقات النادرة:
        <br>• يعرض مسؤولو النظام صفقات ومقتنيات حصرية محدودة.
        <br>• تتم المزايدة والتداول عليها مباشرة، وتنقل الملكية تلقائياً لمن يدفع السعر الأعلى.`
      },
      'panel-corporations': {
        title: 'الشركات المشتركة والتحالفات',
        desc: `العمل الاستثماري الجماعي:
        <br>• أسس أو انضم لشركة قابضة مشتركة بالتعاون مع لاعبين آخرين.
        <br>• ساهم بالأموال لتنفيذ مشاريع سيادية عملاقة تدر أرباحاً هائلة بالثانية.
        <br>• يتم تقسيم الأرباح بنسبة مساهمة كل لاعب في رأس مال الشركة القابضة.`
      },
      'panel-blackmarket': {
        title: 'السوق السوداء وعالم الظلال',
        desc: `عمليات التهريب الممنوعة وغسيل الأموال:
        <br>• صفقات غير مشروعة لتهريب الآثار والماس والسلاح تدر أرباحاً خيالية كاش قذر (Dirty Cash).
        <br>• <strong>المداهمات الأمنية 🚨</strong>: تجميع أكثر من 100K كاش قذر يعرضك للمداهمة الفجائية؛ ويجب دفع الرشوة أو المقاومة للإفلات.
        <br>• <strong>غسيل الأموال</strong>: شركاتك العادية تغسل أموالك تلقائياً كل ثانية بنسبة ضريبية 25%.`
      },
      'panel-casino': {
        title: 'كازينو التسلية والألعاب الملكية',
        desc: `ألعاب الحظ والمخاطرة:
        <br>• 7 ألعاب مميزة: الصاروخ (Crash)، السلوتس، الروليت، النرد، ولعبة <strong>البلاك جاك الجديدة (الـ 21 🃏)</strong>.
        <br>• راهن بذكاء لتفادي الخسارة، واستخدم تذكرة VIP Pass لرفع احتمالات الحظ ومضاعفة عوائد البلاك جاك وتفادي التعادل.`
      },
      'panel-leaderboard': {
        title: 'توب الأغنياء وقاعة المشاهير',
        desc: `لوحة الترتيب العام المباشر:
        <br>• يتم ترتيب كافة لاعبي السيرفر بناءً على <strong>صافي الثروة الكلية (Net Worth)</strong>.
        <br>• يحصل أصحاب المراكز الثلاثة الأولى على التاج الذهبي 👑 والرموز الملكية الخاصة التي تظهر أمام الجميع في السيرفر.`
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
          
          if (title) title.innerHTML = `<i class="fa-solid fa-circle-question text-yellow-400"></i> <span>شرح صفحة: ${content.title}</span>`;
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
        showToast('تحديث الترتيب', 'جاري جلب أحدث بيانات المتصدرين...', 'info');
        await renderLeaderboard(true);
      });
    }
    setupV2UIHandlers();
  }

  function getReelSymbolIcon(sym) {
    const map = {
      'CROWN': '<i class="fa-solid fa-crown text-yellow-400 text-2xl"></i>',
      'DIAMOND': '<i class="fa-solid fa-gem text-cyan-400 text-2xl"></i>',
      'GOLD': '<i class="fa-solid fa-coins text-amber-400 text-2xl"></i>',
      'SACK': '<i class="fa-solid fa-sack-dollar text-emerald-400 text-2xl"></i>',
      'KEY': '<i class="fa-solid fa-key text-sky-400 text-2xl"></i>'
    };
    return map[sym] || `<span class="text-xs font-bold text-slate-300">${sym}</span>`;
  }

  function getDicePipIcon(n) {
    const diceIcons = {
      1: '<i class="fa-solid fa-dice-one"></i>',
      2: '<i class="fa-solid fa-dice-two"></i>',
      3: '<i class="fa-solid fa-dice-three"></i>',
      4: '<i class="fa-solid fa-dice-four"></i>',
      5: '<i class="fa-solid fa-dice-five"></i>',
      6: '<i class="fa-solid fa-dice-six"></i>'
    };
    return diceIcons[n] || `<i class="fa-solid fa-dice-d6"></i>`;
  }

  function getReelSymbolText(sym) {
    // Emojis strictly forbidden, mapping representation texts instead
    const map = {
      'GOLD': 'ذهب [GOLD]',
      'DIAMOND': 'ألماس [DIAMOND]',
      'COIN': 'عملة [COIN]',
      'BAG': 'حقيبة [BAG]',
      'KEY': 'مفتاح [KEY]'
    };
    return map[sym] || sym;
  }

  function addTransferHistoryRow(recipient, amount) {
    const list = document.getElementById('wire-history-list');
    const emptyMsg = list.querySelector('.empty-wire-msg');
    if (emptyMsg) emptyMsg.remove();

    const row = document.createElement('div');
    row.className = 'flex justify-between items-center text-xs text-slate-400 py-1.5 border-b border-slate-800/50';
    row.innerHTML = `
      <span>حوالة صادرة إلى <strong class="text-white">${recipient}</strong></span>
      <span class="numbers-font text-rose-400">-${amount.toLocaleString()} EGP</span>
    `;
    list.prepend(row);
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

    container.innerHTML = '';
    lastAssetsOwned = {};

    Object.keys(GameEngine.ASSETS).forEach(key => {
      const asset = GameEngine.ASSETS[key];
      const owned = s.assets[key] || 0;
      lastAssetsOwned[key] = owned;

      const card = document.createElement('div');
      card.id = `asset-card-${key}`;
      card.className = `glass-panel p-5 rounded-xl border border-slate-800 flex flex-col justify-between`;
      
      const translatedAssetName = window.currentLang === 'en' ? (translationDict[asset.name] || asset.name) : asset.name;

      card.innerHTML = `
        <div class="flex justify-between items-start mb-3">
          <div>
            <h4 class="text-lg font-bold text-white">${translatedAssetName}</h4>
            <p class="text-xs text-slate-500 mt-1">${window.currentLang === 'en' ? 'Generates stable passive income and property appreciation over time.' : 'توليد عائد مالي مستقر، وتقدير لقيمة العقار بمرور الوقت.'}</p>
          </div>
          <span class="text-xs px-2.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded border border-emerald-500/30 font-bold">${window.currentLang === 'en' ? 'Owned:' : 'مملوك:'} <span id="asset-owned-${key}" class="numbers-font">${owned}</span></span>
        </div>

        <div class="text-sm text-slate-400 space-y-1 mb-5 border-t border-b border-slate-800/80 py-3 my-2">
          <div class="flex justify-between"><span>${window.currentLang === 'en' ? 'Current Market Value:' : 'القيمة السوقية الحالية:'}</span><span id="asset-cost-${key}" class="numbers-font text-yellow-500 font-semibold">${asset.cost.toLocaleString()} EGP</span></div>
          <div class="flex justify-between"><span>${window.currentLang === 'en' ? 'Passive Rental Yield:' : 'عائد الإيجار السلبي:'}</span><span id="asset-rent-${key}" class="numbers-font text-emerald-400">+${Math.floor(asset.rent * 0.1).toLocaleString()} EGP / ${window.currentLang === 'en' ? 'cycle' : 'دورة'}</span></div>
          <div class="flex justify-between"><span>${window.currentLang === 'en' ? 'Immediate Liquidation (85%):' : 'قيمة التسييل الفوري (85%):'}</span><span id="asset-liquid-${key}" class="numbers-font text-amber-500/80">${Math.floor(asset.cost * 0.85).toLocaleString()} EGP</span></div>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <button id="btn-buy-asset-${key}" class="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition">
            ${window.currentLang === 'en' ? 'Buy Additional Unit' : 'شراء وحدة إضافية'}
          </button>
          <button id="btn-sell-asset-${key}" class="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-bold transition" ${owned === 0 ? 'disabled' : ''}>
            ${window.currentLang === 'en' ? 'Liquidate & Sell Unit' : 'تسييل وبيع وحدة'}
          </button>
        </div>
      `;

      card.querySelector(`#btn-buy-asset-${key}`).addEventListener('click', () => {
        try {
          GameEngine.buyAsset(key);
          showToast('عقود عقارية', `تم شراء عقار "${asset.name}" بنجاح وإضافته لمحفظتك.`, 'success');
          renderAssets(true);
          renderStatsBar();
        } catch (err) {
          showToast('مرفوض', err.message, 'error');
        }
      });

      card.querySelector(`#btn-sell-asset-${key}`).addEventListener('click', () => {
        try {
          const cashBack = GameEngine.sellAsset(key);
          showToast('تسييل عقاري', `تم بيع العقار بنجاح وتسييل مبلغ بقيمة ${cashBack.toLocaleString()} EGP.`, 'success');
          renderAssets(true);
          renderStatsBar();
        } catch (err) {
          showToast('فشل التسييل', err.message, 'error');
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
      if (costEl) costEl.textContent = `${asset.cost.toLocaleString()} EGP`;

      const rentEl = document.getElementById(`asset-rent-${key}`);
      if (rentEl) rentEl.textContent = `+${Math.floor(asset.rent * 0.1)} EGP / دورة`;

      const liquidEl = document.getElementById(`asset-liquid-${key}`);
      if (liquidEl) liquidEl.textContent = `${Math.floor(asset.cost * 0.85).toLocaleString()} EGP`;

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

    container.innerHTML = '';
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
      card.id = `stock-card-${sym}`;
      card.className = `glass-panel p-5 rounded-xl border border-slate-800 flex flex-col justify-between`;

      const svgPath = generateSparklineSVG(prices);

      const translatedStockName = window.currentLang === 'en' ? (translationDict[stock.name] || stock.name) : stock.name;

      card.innerHTML = `
        <div class="flex justify-between items-start mb-3">
          <div>
            <h4 class="text-md font-bold text-white">${translatedStockName}</h4>
            <span class="numbers-font text-xs text-slate-500 font-bold block mt-1">${stock.symbol}</span>
          </div>
          <div class="text-left">
            <span id="stock-price-${sym}" class="numbers-font font-bold block ${isUp ? 'text-emerald-400 glow-emerald' : 'text-rose-400 glow-rose'}">${currentPrice} EGP</span>
            <span id="stock-change-${sym}" class="numbers-font text-xs ${isUp ? 'text-emerald-500' : 'text-rose-500'} inline-block mt-0.5">${isUp ? '+' : ''}${changePct.toFixed(2)}%</span>
          </div>
        </div>

        <div class="w-full h-16 bg-slate-950/50 rounded-lg p-1 border border-slate-900/60 my-2 overflow-hidden">
          <svg viewBox="0 0 100 30" class="w-full h-full" preserveAspectRatio="none">
            <path id="stock-svg-path-${sym}" d="${svgPath}" fill="none" stroke="${isUp ? '#10b981' : '#f43f5e'}" stroke-width="1.8" />
          </svg>
        </div>

        <div class="text-xs text-slate-400 space-y-1 mb-3 border-t border-slate-800 pt-3 mt-1">
          <div class="flex justify-between"><span>${window.currentLang === 'en' ? 'Owned Shares:' : 'الأسهم المملوكة:'}</span><span id="stock-shares-${sym}" class="numbers-font text-white">${ownedData.shares} ${window.currentLang === 'en' ? 'shares' : 'سهم'}</span></div>
          <div class="flex justify-between"><span>${window.currentLang === 'en' ? 'Avg Buy Price:' : 'متوسط سعر الشراء:'}</span><span id="stock-avg-${sym}" class="numbers-font">${ownedData.avgPrice} EGP</span></div>
          <div class="flex justify-between"><span>${window.currentLang === 'en' ? 'Total Shares Value:' : 'قيمة الأسهم الكلية:'}</span><span id="stock-worth-${sym}" class="numbers-font text-yellow-500 font-semibold">${totalWorth.toLocaleString()} EGP</span></div>
          <div class="flex justify-between"><span>${window.currentLang === 'en' ? 'Portfolio Profit/Loss:' : 'ربح/خسارة المحفظة:'}</span><span id="stock-profit-${sym}" class="numbers-font font-bold ${totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}">${totalProfit >= 0 ? '+' : ''}${totalProfit.toLocaleString()} EGP</span></div>
          <div class="flex justify-between text-[11px] text-slate-500 border-t border-slate-800/60 pt-1.5 mt-1"><span>${window.currentLang === 'en' ? 'Max Holding Limit:' : 'سقف تملك السهم:'}</span><span class="numbers-font text-slate-300 font-semibold">${(stock.maxShares || 50000).toLocaleString()} ${window.currentLang === 'en' ? 'shares' : 'سهم'}</span></div>
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
            <input type="number" id="shares-buy-input-${sym}" placeholder="${window.currentLang === 'en' ? 'Qty' : 'الكمية'}" class="glass-input w-full p-2 text-center text-xs rounded-lg mb-1.5" min="1" step="1"/>
            <button id="btn-buy-shares-${sym}" class="py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition">${window.currentLang === 'en' ? 'Buy Shares' : 'شراء الأسهم'}</button>
          </div>
          <div class="flex flex-col">
            <div class="flex gap-1 mb-1">
              <button id="btn-sell-all-${sym}" class="w-full py-0.5 bg-rose-950/60 hover:bg-rose-900/80 border border-rose-500/30 text-[10px] text-rose-300 rounded font-bold" ${ownedData.shares === 0 ? 'disabled' : ''}>${window.currentLang === 'en' ? '🔥 Sell All' : '🔥 بيع كل الأسهم'}</button>
            </div>
            <input type="number" id="shares-sell-input-${sym}" placeholder="${window.currentLang === 'en' ? 'Qty' : 'الكمية'}" class="glass-input w-full p-2 text-center text-xs rounded-lg mb-1.5" min="1" step="1"/>
            <button id="btn-sell-shares-${sym}" class="py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition" ${ownedData.shares === 0 ? 'disabled' : ''}>${window.currentLang === 'en' ? 'Sell Shares' : 'بيع الأسهم'}</button>
          </div>
        </div>
      `;

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
              ? `(صافي ربح: +${profitOrLoss.toLocaleString()} EGP 🟢)`
              : `(صافي خسارة: -${Math.abs(profitOrLoss).toLocaleString()} EGP 🔴)`;
            
            showToast(
              profitOrLoss >= 0 ? 'بيع كلي رابح! 📈' : 'بيع وتسييل كلي 📉',
              `تم بيع كامل الأسهم (${res.shares} سهم) بقيمة +${totalPayout.toLocaleString()} EGP ${prevAvgPrice > 0 ? pnlText : ''}`,
              profitOrLoss >= 0 ? 'success' : 'info'
            );
            renderStocks(true);
            renderStatsBar();
          } catch (err) {
            showToast('فشل البيع', err.message, 'error');
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
          input.value = '';
          showToast('شراء أسهم', `تم شراء عدد ${res.shares} سهم من سهم "${stock.name}" بنجاح.`, 'success');
          renderStocks(true);
          renderStatsBar();
        } catch (err) {
          showToast('فشل الشراء', err.message, 'error');
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
            ? `(صافي ربح: +${profitOrLoss.toLocaleString()} EGP 🟢)`
            : `(صافي خسارة: -${Math.abs(profitOrLoss).toLocaleString()} EGP 🔴)`;

          input.value = '';
          showToast(
            profitOrLoss >= 0 ? 'بيع أسهم رابح! 📈' : 'بيع أسهم 📉',
            `تم بيع عدد ${res.shares} سهم بقيمة +${totalPayout.toLocaleString()} EGP ${prevAvgPrice > 0 ? pnlText : ''}`,
            profitOrLoss >= 0 ? 'success' : 'info'
          );
          renderStocks(true);
          renderStatsBar();
        } catch (err) {
          showToast('فشل البيع', err.message, 'error');
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
        priceEl.textContent = `${currentPrice} EGP`;
        priceEl.className = `numbers-font font-bold block ${isUp ? 'text-emerald-400 glow-emerald' : 'text-rose-400 glow-rose'}`;
      }

      const changeEl = document.getElementById(`stock-change-${sym}`);
      if (changeEl) {
        changeEl.textContent = `${isUp ? '+' : ''}${changePct.toFixed(2)}%`;
        changeEl.className = `numbers-font text-xs ${isUp ? 'text-emerald-500' : 'text-rose-500'} inline-block mt-0.5`;
      }

      const svgPathEl = document.getElementById(`stock-svg-path-${sym}`);
      if (svgPathEl) {
        svgPathEl.setAttribute('d', generateSparklineSVG(prices));
        svgPathEl.setAttribute('stroke', isUp ? '#10b981' : '#f43f5e');
      }

      const worthEl = document.getElementById(`stock-worth-${sym}`);
      if (worthEl) worthEl.textContent = `${totalWorth.toLocaleString()} EGP`;

      const profitEl = document.getElementById(`stock-profit-${sym}`);
      if (profitEl) {
        profitEl.textContent = `${totalProfit >= 0 ? '+' : ''}${totalProfit.toLocaleString()} EGP`;
        profitEl.className = `numbers-font font-bold ${totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`;
      }

      const sharesEl = document.getElementById(`stock-shares-${sym}`);
      if (sharesEl) sharesEl.textContent = `${ownedData.shares} سهم`;

      const avgEl = document.getElementById(`stock-avg-${sym}`);
      if (avgEl) avgEl.textContent = `${ownedData.avgPrice} EGP`;

      const sellAllBtn = document.getElementById(`btn-sell-all-${sym}`);
      if (sellAllBtn) sellAllBtn.disabled = (ownedData.shares === 0);

      const sellBtn = document.getElementById(`btn-sell-shares-${sym}`);
      if (sellBtn) sellBtn.disabled = (ownedData.shares === 0);
    });
  }

  // Draw Line Charts inside SVG
  function generateSparklineSVG(prices) {
    if (prices.length < 2) return "M 0 15 L 100 15";
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min === 0 ? 1 : max - min;

    const width = 100;
    const height = 30;

    let path = "";
    prices.forEach((price, idx) => {
      const x = (idx / (prices.length - 1)) * width;
      // Invert Y axis since SVG 0 is top
      const y = height - ((price - min) / range) * (height - 6) - 3;
      path += `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)} `;
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
      idEl.textContent = `EG-TAX-${(GameEngine.activeUsername || 'ANON').toUpperCase().substring(0, 10)}`;
    }

    // 4 KPI Cards
    const taxableEl = document.getElementById('tax-kpi-taxable');
    if (taxableEl) taxableEl.textContent = `${taxReport.taxableNetWorth.toLocaleString()} EGP`;

    let bracketName = taxReport.bracketName;
    if (window.currentLang === 'en') {
      if (bracketName.includes('الشريحة الأولى')) bracketName = 'First Bracket (Fully Exempt)';
      else if (bracketName.includes('الشريحة الفضية')) bracketName = 'Silver Bracket (3M - 15M EGP)';
      else if (bracketName.includes('شريحة كبار الممولين')) bracketName = 'Major Taxpayer Bracket (15M - 50M EGP)';
      else if (bracketName.includes('شريحة حيتان المال')) bracketName = 'Whale & Billionaire Bracket (+50M EGP)';
    }

    const bracketEl = document.getElementById('tax-kpi-bracket');
    if (bracketEl) {
      bracketEl.textContent = bracketName;
      bracketEl.className = `text-sm font-black ${taxReport.bracketColor} block mt-1`;
    }

    const deductionEl = document.getElementById('tax-kpi-deduction');
    if (deductionEl) deductionEl.textContent = taxReport.taxPerSecond.toLocaleString();

    const ratePctEl = document.getElementById('tax-kpi-rate-pct');
    if (ratePctEl) ratePctEl.textContent = taxReport.effectiveRatePct;

    const totalPaidEl = document.getElementById('tax-kpi-total-paid');
    if (totalPaidEl) totalPaidEl.textContent = `${(taxReport.totalTaxesPaid || 0).toLocaleString()} EGP`;

    // Tax Shield Status Card
    const shieldBadge = document.getElementById('tax-shield-active-badge');
    const shieldTimeLeft = document.getElementById('tax-shield-time-left');
    const buyShieldLabel = document.getElementById('tax-buy-shield-label');

    if (shieldBadge) {
      if (taxReport.taxShieldActive) {
        shieldBadge.className = 'text-[10px] px-2.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full font-bold animate-pulse';
        shieldBadge.textContent = window.currentLang === 'en' ? 'Active 🛡️ (-50%)' : 'نشط وفعال 🛡️ (-50%)';
      } else {
        shieldBadge.className = 'text-[10px] px-2.5 py-0.5 bg-slate-800 text-slate-400 rounded-full font-bold';
        shieldBadge.textContent = window.currentLang === 'en' ? 'Inactive ⚠️' : 'غير مفعل ⚠️';
      }
    }

    if (shieldTimeLeft) {
      if (taxReport.taxShieldActive) {
        const sec = (taxReport.shieldDurationTicks || 0) * 3;
        shieldTimeLeft.textContent = window.currentLang === 'en' ? `Validity remaining: ${sec} seconds` : `متبقي على الصلاحية: ${sec} ثانية`;
        shieldTimeLeft.className = 'text-[11px] text-emerald-400 font-mono font-bold';
      } else {
        shieldTimeLeft.textContent = window.currentLang === 'en' ? 'Duration: 12 hours (43,200 seconds)' : 'المدة: 12 ساعة (43,200 ثانية)';
        shieldTimeLeft.className = 'text-[11px] text-slate-400 font-mono';
      }
    }

    if (buyShieldLabel) {
      buyShieldLabel.textContent = taxReport.taxShieldActive 
        ? (window.currentLang === 'en' ? 'Renew Tax Shield (550,000 EGP)' : 'تجديد وتمديد الدرع الضريبي (550,000 EGP)')
        : (window.currentLang === 'en' ? 'Purchase Tax Shield (550,000 EGP)' : 'شراء وتفعيل الدرع الضريبي (550,000 EGP)');
    }

    // Active row badges in table
    for (let i = 1; i <= 4; i++) {
      const badge = document.getElementById(`tax-badge-row-${i}`);
      if (badge) {
        if (taxReport.bracketId === i) {
          badge.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
          badge.textContent = window.currentLang === 'en' ? 'Current Bracket 👈' : 'شريحتك الحالية 👈';
        } else {
          badge.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-500';
          badge.textContent = window.currentLang === 'en' ? 'Exempt' : 'غير خاضع';
        }
      }
    }
  }

  // --- Tab 8: Store & Inventory Panel ---
  function renderStore() {
    const s = GameEngine.state;

    // Render store shelf
    const shelf = document.getElementById('store-shelf');
    shelf.innerHTML = '';

    Object.keys(GameEngine.STORE_ITEMS).forEach(id => {
      const item = GameEngine.STORE_ITEMS[id];
      const count = s.inventory[id] || 0;
      const ticksRemaining = (s.itemDurations && s.itemDurations[id]) ? s.itemDurations[id] : 0;
      const secRemaining = ticksRemaining * 3;

      const card = document.createElement('div');
      card.className = 'glass-panel p-4 rounded-xl border border-slate-800 flex flex-col justify-between items-start';

      const translatedName = window.currentLang === 'en' ? (translationDict[item.name] || item.name) : item.name;
      const translatedDesc = window.currentLang === 'en' ? (translationDict[item.desc] || item.desc) : item.desc;

      card.innerHTML = `
        <div class="mb-3 w-full">
          <div class="flex justify-between items-center mb-1">
            <h4 class="font-bold text-white text-sm">${translatedName}</h4>
            <span class="text-xs px-2 py-0.5 bg-slate-800 text-slate-400 border border-slate-700 rounded-full font-bold">${window.currentLang === 'en' ? 'Available:' : 'متاح:'} <span class="numbers-font">${count}</span></span>
          </div>
          <p class="text-[11px] text-slate-400 leading-relaxed mb-2">${translatedDesc || (window.currentLang === 'en' ? 'Temporary special effect that will eventually self-destruct.' : 'مفعول خاص ومؤقت ينتهي ويدمر ذاته.')}</p>
        </div>
        <div class="w-full text-xs text-slate-400 space-y-1 mb-4 border-t border-slate-800/60 pt-2.5">
          <div class="flex justify-between"><span>${window.currentLang === 'en' ? 'Selling Price:' : 'سعر البيع:'}</span><span class="numbers-font text-yellow-500 font-bold">${item.cost.toLocaleString()} EGP</span></div>
          <div class="flex justify-between"><span>${window.currentLang === 'en' ? 'Validity Duration:' : 'مدة الصلاحية:'}</span><span class="numbers-font text-rose-400 font-semibold">${item.durationTicks * 3} ${window.currentLang === 'en' ? 'seconds' : 'ثانية'}</span></div>
          ${count > 0 ? `<div class="flex justify-between"><span>${window.currentLang === 'en' ? 'Self-Destruct Timer:' : 'عداد التدمير الذاتي:'}</span><span class="numbers-font text-yellow-400 font-bold animate-pulse">${secRemaining} ${window.currentLang === 'en' ? 'seconds remaining' : 'ثانية متبقية'}</span></div>` : ''}
        </div>
        <button id="btn-buy-store-${id}" class="w-full py-2 bg-yellow-500 hover:bg-yellow-400 text-slate-950 rounded-lg text-xs font-bold transition shadow-lg shadow-yellow-500/10">
          ${window.currentLang === 'en' ? 'Buy & Activate Effect' : 'شراء وتفعيل المفعول'}
        </button>
      `;

      card.querySelector(`#btn-buy-store-${id}`).addEventListener('click', () => {
        try {
          GameEngine.buyStoreItem(id);
          showToast('فاتورة متجر', `تم شراء "${item.name}" ودفع القيمة النقود.`, 'success');
          renderAll();
        } catch (err) {
          showToast('رصيد معلق', err.message, 'error');
        }
      });

      shelf.appendChild(card);
    });

    // Render backpack inventory
    const bag = document.getElementById('backpack-inventory');
    bag.innerHTML = '';

    const usableItems = Object.keys(s.inventory).filter(id => s.inventory[id] > 0 && GameEngine.STORE_ITEMS[id]);

    if (usableItems.length === 0) {
      bag.innerHTML = `
        <div class="col-span-full text-center text-slate-500 text-xs py-4">
          ${window.currentLang === 'en' 
            ? 'Your backpack is completely empty. Visit the shelf above to buy support items and super boosts.' 
            : 'حقيبة ظهرك فارغة تماماً. قم بزيارة الرف الأعلى لشراء عناصر الدعم والتعزيزات الفائقة.'}
        </div>
      `;
    } else {
      usableItems.forEach(id => {
        const item = GameEngine.STORE_ITEMS[id];
        const count = s.inventory[id];
        const ticksRemaining = (s.itemDurations && s.itemDurations[id]) ? s.itemDurations[id] : 0;
        const secRemaining = ticksRemaining * 3;

        const card = document.createElement('div');
        card.className = 'glass-panel p-3 rounded-lg border border-slate-800 flex justify-between items-center text-xs';
        
        const translatedName = window.currentLang === 'en' ? (translationDict[item.name] || item.name) : item.name;
        const translatedDesc = window.currentLang === 'en' ? (translationDict[item.desc] || item.desc) : item.desc;

        card.innerHTML = `
          <div>
            <h5 class="font-bold text-white mb-0.5">${translatedName}</h5>
            <p class="text-[10px] text-slate-400 leading-snug">${translatedDesc}</p>
          </div>
          <div class="text-left whitespace-nowrap mr-3">
            <span class="text-[10px] text-yellow-400 border border-yellow-500/30 px-2 py-1 rounded bg-yellow-500/10 font-bold block mb-1">
              ⏳ ${window.currentLang === 'en' ? 'Self-destruct:' : 'تدمير ذاتي:'} <span class="numbers-font">${secRemaining}${window.currentLang === 'en' ? 's' : 'ث'}</span>
            </span>
          </div>
        `;

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
      const stars = '⭐'.repeat(heat) + '☆'.repeat(5 - heat);
      heatEl.textContent = `${window.currentLang === 'en' ? 'Police Heat' : 'الملاحقة'}: ${stars}`;
    }

    // 2. Money Laundering Status & Presets
    const maxCashEl = document.getElementById('laundering-max-cash');
    if (maxCashEl) maxCashEl.textContent = (s.dirtyCash || 0).toLocaleString();

    const feeBadgeEl = document.getElementById('laundering-fee-badge');
    const hasCryptoCleaner = Boolean(s.inventory && s.inventory.crypto_cleaner > 0);
    if (feeBadgeEl) {
      feeBadgeEl.textContent = hasCryptoCleaner 
        ? (window.currentLang === 'en' ? '25% (Zero-Trace Active)' : '25% (Zero-Trace نشط)')
        : '35%';
      feeBadgeEl.className = hasCryptoCleaner ? 'numbers-font font-black text-cyan-400' : 'numbers-font font-black text-emerald-400';
    }

    // 3. Render Black Market Operations
    const dealsContainer = document.getElementById('blackmarket-deals');
    if (dealsContainer) {
      dealsContainer.innerHTML = '';

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

        let badgeStyle = 'bg-slate-800 text-slate-300 border-slate-700';
        if (deal.tier === 'عملية خاصة') badgeStyle = 'bg-rose-500/20 text-rose-300 border-rose-500/40 glow-gold animate-pulse';
        else if (deal.tier === 'سهل') badgeStyle = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
        else if (deal.tier === 'متوسط') badgeStyle = 'bg-sky-500/20 text-sky-400 border-sky-500/30';
        else if (deal.tier === 'متقدم') badgeStyle = 'bg-amber-500/20 text-amber-400 border-amber-500/30';
        else if (deal.tier === 'محترف') badgeStyle = 'bg-purple-500/20 text-purple-400 border-purple-500/30';
        else if (deal.tier === 'خطر جداً') badgeStyle = 'bg-rose-500/20 text-rose-400 border-rose-500/30';
        else if (deal.tier === 'أسطوري') badgeStyle = 'bg-purple-500/20 text-purple-300 border-purple-500/40';
        else if (deal.tier === 'خطر مطلق') badgeStyle = 'bg-red-600/20 text-red-400 border-red-500/40';
        else if (deal.tier === 'سيد الظلال') badgeStyle = 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40 glow-gold';

        const now = Date.now();
        const cdExpiresAt = (s.blackMarketCooldowns && s.blackMarketCooldowns[id]) || 0;
        const remainingMs = Math.max(0, cdExpiresAt - now);
        const isOnCooldown = remainingMs > 0;
        const remSec = Math.ceil(remainingMs / 1000);
        const remMins = Math.floor(remSec / 60);
        const remSecsFormatted = (remSec % 60).toString().padStart(2, '0');
        const cdFormatted = remMins > 0 ? `${remMins}:${remSecsFormatted}` : `${remSec} ${window.currentLang === 'en' ? 'seconds' : 'ثانية'}`;

        const cdSec = deal.cooldownSec || 120;
        const cdSuccessStr = cdSec >= 3600 
          ? `${Math.round(cdSec / 3600)} ${window.currentLang === 'en' ? 'hours' : 'ساعة'}` 
          : cdSec >= 60 
            ? `${Math.round(cdSec / 60)} ${window.currentLang === 'en' ? 'minutes' : 'دقيقة'}` 
            : `${cdSec} ${window.currentLang === 'en' ? 'seconds' : 'ثانية'}`;
        const failCdSec = Math.floor(cdSec / 2);
        const cdFailStr = failCdSec >= 3600 
          ? `${(failCdSec / 3600).toFixed(1)} ${window.currentLang === 'en' ? 'hours' : 'ساعة'}` 
          : failCdSec >= 60 
            ? `${Math.round(failCdSec / 60)} ${window.currentLang === 'en' ? 'minutes' : 'دقيقة'}` 
            : `${failCdSec} ${window.currentLang === 'en' ? 'seconds' : 'ثانية'}`;

        const costLabel = deal.requireDirtyCost 
          ? (window.currentLang === 'en' ? 'Dirty Cash Required:' : 'الأموال المشبوهة المطلوبة:')
          : (window.currentLang === 'en' ? 'Capital Required:' : 'رأس المال المطلوب:');
        const costValStr = `${deal.cost.toLocaleString()} EGP`;
        const payoutLabel = deal.cleanPayout 
          ? (window.currentLang === 'en' ? 'Clean Return (Win):' : 'العائد النظيف (الفوز):')
          : (window.currentLang === 'en' ? 'Dirty Return (Win):' : 'العائد المشبوه (الفوز):');
        const payoutValStr = `+${deal.payout.toLocaleString()} EGP`;
        const payoutColor = deal.cleanPayout ? 'text-emerald-400' : 'text-rose-400';
        const netProfitLabel = deal.cleanPayout 
          ? (window.currentLang === 'en' ? 'Net Cleaned Cash:' : 'المال المغسول الصافي:')
          : (window.currentLang === 'en' ? 'Net Illicit Profit:' : 'الربح الصافي غير المشروع:');
        const netProfitVal = deal.payout - deal.cost;
        const netProfitSign = netProfitVal >= 0 ? '+' : '';
        const netProfitColor = deal.cleanPayout ? 'text-emerald-400' : (netProfitVal >= 0 ? 'text-teal-400' : 'text-rose-500');

        const repLossVal = deal.repLoss || Math.floor((deal.repGain || 20) * 1.2);
        const repGainStr = deal.repGain > 0 ? `+${deal.repGain} ${window.currentLang === 'en' ? 'pts' : 'نقطة'}` : (window.currentLang === 'en' ? 'None' : 'لا يوجد');
        const repLossStr = repLossVal > 0 ? `-${repLossVal} ${window.currentLang === 'en' ? 'pts' : 'نقطة'}` : (window.currentLang === 'en' ? 'None' : 'لا يوجد');

        const card = document.createElement('div');
        card.id = `bm-deal-card-${id}`;
        card.className = isLockedByRep
          ? 'glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col justify-between opacity-40 relative overflow-hidden saturate-50 select-none'
          : 'glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col justify-between hover:border-rose-500/40 transition duration-300 shadow-lg relative overflow-hidden';
        card.style.background = 'radial-gradient(ellipse at top left, rgba(225,29,72,0.08), rgba(15,23,42,0.95))';

        const lockOverlay = isLockedByRep ? `
          <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2.5 z-10">
            <div class="w-11 h-11 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <i class="fa-solid fa-lock"></i>
            </div>
            <span class="text-xs font-bold text-slate-300">${window.currentLang === 'en' ? `Locked! Requires ${deal.repNeeded} Rep` : `مغلق! يتطلب سمعة ${deal.repNeeded} نقطة`}</span>
          </div>
        ` : '';

        const translatedDealName = window.currentLang === 'en' ? (translationDict[deal.name] || deal.name) : deal.name;
        const translatedDealDesc = window.currentLang === 'en' ? (translationDict[deal.desc] || deal.desc) : deal.desc;
        const translatedDealTier = window.currentLang === 'en' ? (translationDict[deal.tier] || deal.tier) : deal.tier;

        card.innerHTML = `
          ${lockOverlay}
          <div>
            <div class="flex justify-between items-start mb-2">
              <div class="flex items-center gap-2.5">
                <div class="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                  <i class="fa-solid ${deal.icon || 'fa-box-open'} text-sm"></i>
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
              <div class="flex justify-between"><span>${window.currentLang === 'en' ? 'Est. Success Rate:' : 'نسبة النجاح المقدرة:'}</span><span class="numbers-font ${successPct >= 70 ? 'text-emerald-400' : successPct >= 50 ? 'text-yellow-400' : 'text-rose-400'} font-black">${successPct}%</span></div>
              <div class="flex justify-between"><span>${window.currentLang === 'en' ? 'Cooldown Period:' : 'فترة التهدئة (كول داون):'}</span><span class="numbers-font text-amber-400 font-bold">${cdSuccessStr} (${cdFailStr} ${window.currentLang === 'en' ? 'on failure' : 'عند الفشل'})</span></div>
              <div class="flex justify-between"><span>${window.currentLang === 'en' ? 'Raid Penalty:' : 'عقوبة المداهمة:'}</span><span class="numbers-font text-rose-400">${deal.jailDuration * 3} ${window.currentLang === 'en' ? 'seconds' : 'ثانية'} (${window.currentLang === 'en' ? 'confiscate dirty + 20%' : 'مصادرة المشبوه + 20%'})</span></div>
              <div class="flex justify-between"><span>${window.currentLang === 'en' ? 'Reputation Gain:' : 'زيادة السمعة:'}</span><span class="numbers-font text-rose-300 font-bold">${repGainStr}</span></div>
              <div class="flex justify-between"><span>${window.currentLang === 'en' ? 'Reputation Penalty:' : 'عقوبة خسارة السمعة:'}</span><span class="numbers-font text-rose-500 font-bold">${repLossStr}</span></div>
            </div>

            ${(hasLawyer || hasJammer || hasPassport) ? `
              <div class="flex flex-wrap gap-1 mb-3">
                ${hasLawyer ? `<span class="text-[10px] px-1.5 py-0.5 bg-sky-500/20 text-sky-300 rounded border border-sky-500/30">${window.currentLang === 'en' ? 'Lawyer (+22% success / acquittal 50%)' : 'محامي (+22% نجاح / براءة 50%)'}</span>` : ''}
                ${hasJammer ? `<span class="text-[10px] px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30">${window.currentLang === 'en' ? 'Jammer (+15% success)' : 'تشويش (+15% نجاح)'}</span>` : ''}
                ${hasPassport ? `<span class="text-[10px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">${window.currentLang === 'en' ? 'Fake Passport (Secured Smuggler)' : 'جواز مزور (مهرب مؤمن)'}</span>` : ''}
              </div>
            ` : ''}
          </div>

          <div id="bm-deal-btn-wrapper-${id}">
            <button id="btn-run-deal-${id}" ${(isOnCooldown || isLockedByRep) ? 'disabled' : ''} class="w-full py-2.5 ${(isOnCooldown || isLockedByRep) ? 'bg-slate-900 border border-amber-500/30 text-amber-400 cursor-not-allowed opacity-90' : 'bg-gradient-to-r from-rose-900/60 to-rose-800/60 hover:from-rose-800 hover:to-rose-700 border border-rose-500/40 text-rose-100'} rounded-xl text-xs font-black transition shadow-md flex items-center justify-center gap-2">
              <i class="fa-solid ${(isOnCooldown && !isLockedByRep) ? 'fa-hourglass-half text-amber-400 animate-spin' : 'fa-handshake'}"></i>
              <span>${isLockedByRep ? (window.currentLang === 'en' ? 'Locked (Insufficient Rep)' : 'مغلق (سمعة غير كافية)') : (isOnCooldown ? (window.currentLang === 'en' ? `Police Cooldown (${cdFormatted})` : `تهدئة أمنية (${cdFormatted})`) : (window.currentLang === 'en' ? 'Sign & Execute Operation' : 'توقيع وتنفيذ العملية'))}</span>
            </button>
          </div>
        `;

        if (!isLockedByRep) {
          card.querySelector(`#btn-run-deal-${id}`).addEventListener('click', () => {
            try {
              const res = GameEngine.runBlackMarketDeal(id);
              if (res.success) {
                const payoutText = deal.cleanPayout ? 'كاش نظيف' : 'ربح مشبوه';
                const repText = res.repGain > 0 ? ` (+${res.repGain} سمعة)` : '';
                showToast('ضربة معلم!', `نجحت العملية السرية! ${payoutText} قدره +${res.payout.toLocaleString()} EGP أضيف لخزينتك${repText}. كول داون: ${Math.round((res.cooldownSec || 60) / 60)}د`, 'success');
                playMenuSound('success');
              } else if (res.escaped) {
                showToast('هروب دبلوماسي!', `تمت المداهمة ولكنك استخدمت جواز السفر المزور وهربت فوراً دون سجن أو غرامات! (كول داون مخفض 50%: ${Math.round((res.cooldownSec || 30) / 60)}د)`, 'warning');
                playMenuSound('click');
              } else {
                const repLossText = res.repLoss > 0 ? ` وفقدان -${res.repLoss} سمعة` : '';
                showToast('مداهمة الشرطة!', `تم ضبط عمليتك! مصادرة كافة الأموال المشبوهة وغرامة ${res.confiscation.toLocaleString()} EGP وسجن ${res.jailDuration * 3} ثانية${repLossText}. (كول داون مخفض 50%: ${Math.round((res.cooldownSec || 30) / 60)}د)`, 'error');
                playMenuSound('error');
              }
              renderAll();
            } catch (err) {
              showToast('خطأ في العملية', err.message, 'error');
            }
          });
        }

        dealsContainer.appendChild(card);
      });
    }

    // 4. Render Black-Ops Gear
    const gearContainer = document.getElementById('blackmarket-gear-list');
    if (gearContainer) {
      gearContainer.innerHTML = '';
      Object.keys(GameEngine.BLACK_MARKET_GEAR).forEach(gearId => {
        const gear = GameEngine.BLACK_MARKET_GEAR[gearId];
        const ownedCount = (s.inventory && s.inventory[gearId]) || 0;
        const ticksLeft = (s.itemDurations && s.itemDurations[gearId]) || 0;
        const secLeft = ticksLeft * 3;

        const card = document.createElement('div');
        card.className = 'glass-panel p-4 rounded-xl border border-slate-800 flex flex-col justify-between bg-slate-950/40';
        card.innerHTML = `
          <div>
            <div class="flex justify-between items-center mb-2">
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <i class="fa-solid ${gear.icon || 'fa-microchip'}"></i>
                </div>
                <h5 class="font-bold text-white text-xs">${gear.name}</h5>
              </div>
              <span class="text-[10px] px-2 py-0.5 ${ownedCount > 0 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'} rounded-full font-bold">
                ${ownedCount > 0 ? `نشط (${secLeft}ث)` : 'غير مفعل'}
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
          </button>
        `;

        card.querySelector(`#btn-buy-gear-${gearId}`).addEventListener('click', () => {
          try {
            GameEngine.buyBlackMarketGear(gearId);
            showToast('تجهيز العتاد', `تم شراء وتفعيل "${gear.name}" بنجاح!`, 'success');
            renderAll();
          } catch (err) {
            showToast('فشل الشراء', err.message, 'error');
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
        const remSecsFormatted = (remSec % 60).toString().padStart(2, '0');
        const cdFormatted = remMins > 0 ? `${remMins}:${remSecsFormatted}` : `${remSec} ثانية`;
        btn.disabled = true;
        btn.className = 'w-full py-2.5 bg-slate-900 border border-amber-500/30 text-amber-400 rounded-xl text-xs font-black transition shadow-md flex items-center justify-center gap-2 cursor-not-allowed opacity-90';
        btn.innerHTML = `<i class="fa-solid fa-hourglass-half text-amber-400 animate-spin"></i><span>تهدئة أمنية (${cdFormatted})</span>`;
      } else if (btn.disabled) {
        btn.disabled = false;
        btn.className = 'w-full py-2.5 bg-gradient-to-r from-rose-900/60 to-rose-800/60 hover:from-rose-800 hover:to-rose-700 border border-rose-500/40 text-rose-100 rounded-xl text-xs font-black transition shadow-md flex items-center justify-center gap-2';
        btn.innerHTML = `<i class="fa-solid fa-handshake"></i><span>توقيع وتنفيذ العملية</span>`;
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
          showToast('تمت الصفقة', `تم دفع ${res.bribeCost.toLocaleString()} EGP كرشوة وإسقاط جميع الملاحقات والإفراج الفوري!`, 'success');
          renderAll();
        } catch (err) {
          showToast('فشل الرشوة', err.message, 'error');
        }
      });
    }

    // Money Laundering Input Presets (Calculates from Dirty Cash)
    const launderInput = document.getElementById('laundering-amount-input');
    const setLaunderPct = (pct) => {
      const s = GameEngine.state;
      if (!s || !launderInput) return;
      const amt = Math.floor((s.dirtyCash || 0) * pct);
      launderInput.value = amt > 0 ? amt : '';
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
          launderInput.value = '';
          showToast('تم الغسيل المالي', `تم غسيل وتبييض ${res.amount.toLocaleString()} EGP وإيداع صافي ${res.cleanedAmount.toLocaleString()} EGP بحسابك البنكي (خصم ضريبة غسيل ${res.feeRate}% = ${res.fee.toLocaleString()} EGP).`, 'success');
          renderAll();
        } catch (err) {
          showToast('فشل الغسيل', err.message, 'error');
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
          input.value = '';
          showToast('بدء الاستثمار', `تم إيداع ${res.amount.toLocaleString()} EGP في "${res.plan.name}" بنجاح!`, 'success');
          renderAll();
        } catch (err) {
          showToast('فشل الاستثمار', err.message, 'error');
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
        vipBadge.innerHTML = `<i class="fa-solid fa-crown text-amber-400"></i><span>${window.currentLang === 'en' ? 'Active VIP Pass (+15% Luck)' : 'عضوية VIP نشطة (+15% حظ)'}</span>`;
        vipBadge.className = 'text-xs px-3 py-1 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border border-amber-500/40 rounded-full font-bold shadow-sm flex items-center gap-1.5 glow-gold';
      } else {
        vipBadge.innerHTML = `<i class="fa-solid fa-gem text-slate-400"></i><span>${window.currentLang === 'en' ? 'Regular Member (Buy VIP Pass in shop for luck boost)' : 'عضو عادي (شراء تذكرة VIP من المتجر لرفع الحظ)'}</span>`;
        vipBadge.className = 'text-xs px-3 py-1 bg-slate-800/80 text-slate-400 border border-slate-700/80 rounded-full font-bold flex items-center gap-1.5';
      }
    }
  }

  // --- Casino Game: Crash Multiplier (Classic Rocket Animation with Auto-Cashout) ---
  function runCrashBet() {
    const betInput = document.getElementById('crash-bet-input');
    const bet = parseInt(betInput.value);

    try {
      if (crashState === 'running') return;
      if (isNaN(bet) || bet <= 0) throw new Error(window.currentLang === 'en' ? "Please enter a valid bet amount." : "يرجى إدخال مبلغ رهان صحيح.");
      if (GameEngine.state.cash < bet) throw new Error(window.currentLang === 'en' ? "Your cash balance is insufficient for this bet." : "رصيدك النقدي لا يكفي لهذا الرهان.");

      playCasinoSound('tick');

      // Deduct cash immediately
      GameEngine.state.cash -= bet;
      crashBetAmount = bet;
      crashMultiplier = 1.0;
      crashState = 'running';

      // Predetermine crash point (VIP pass gives bonus endurance)
      const hasVIP = GameEngine.state.inventory && GameEngine.state.inventory.vip_casino_pass > 0;
      const instantCrashChance = hasVIP ? 0.02 : 0.05;

      if (Math.random() < instantCrashChance) {
        crashTarget = 1.0;
      } else {
        // Exponential distribution up to 15x
        crashTarget = parseFloat((1 + Math.pow(Math.random(), hasVIP ? 2.3 : 2.8) * 14).toFixed(2));
      }

      // Update Buttons & Visuals
      document.getElementById('btn-crash-start').classList.add('hidden');
      const cashoutBtn = document.getElementById('btn-crash-cashout');
      cashoutBtn.classList.remove('hidden');
      cashoutBtn.disabled = false;
      document.getElementById('crash-cashout-payout').textContent = bet.toLocaleString();

      const statusText = document.getElementById('crash-status-text');
      statusText.textContent = window.currentLang === 'en' ? 'Rocket rising...' : 'الصاروخ يرتفع...';
      statusText.className = 'text-[11px] text-yellow-400 font-bold bg-slate-900 px-2 py-0.5 rounded-lg border border-yellow-500/30 animate-pulse';

      // Reset Rocket SVG color
      const rocket = document.getElementById('crash-svg-rocket');
      if (rocket) rocket.setAttribute('fill', '#eab308');

      crashStartTime = Date.now();
      animateCrashGame();

    } catch (err) {
      showToast('خطأ رهان', err.message, 'error');
    }
  }

  function animateCrashGame() {
    if (crashState !== 'running') return;

    const elapsed = (Date.now() - crashStartTime) / 1000;
    crashMultiplier = parseFloat((Math.pow(1.14, elapsed * 3.2)).toFixed(2));

    const display = document.getElementById('crash-multiplier-display');
    if (display) display.textContent = `${crashMultiplier.toFixed(2)}x`;

    const curve = document.getElementById('crash-svg-curve');
    const rocket = document.getElementById('crash-svg-rocket');

    if (curve && rocket) {
      const x = Math.min(90, 10 + elapsed * 12);
      const y = Math.max(10, 80 - Math.pow(elapsed * 2.0, 1.6));
      curve.setAttribute('d', `M 10 80 Q 50 80 ${x} ${y}`);
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

    // Check if crash target hit
    if (crashMultiplier >= crashTarget) {
      triggerCrash();
      return;
    }

    crashAnimationId = requestAnimationFrame(animateCrashGame);
  }

  function triggerCrash() {
    cancelAnimationFrame(crashAnimationId);
    crashState = 'crashed';
    playCasinoSound('lose');

    const statusText = document.getElementById('crash-status-text');
    if (statusText) {
      statusText.textContent = window.currentLang === 'en' ? `Exploded at ${crashTarget.toFixed(2)}x !` : `انفجر عند ${crashTarget.toFixed(2)}x !`;
      statusText.className = 'text-[11px] text-rose-400 font-bold bg-rose-950/80 px-2 py-0.5 rounded-lg border border-rose-500/40 animate-pulse';
    }

    const rocket = document.getElementById('crash-svg-rocket');
    if (rocket) rocket.setAttribute('fill', '#f43f5e');

    document.getElementById('btn-crash-start').classList.remove('hidden');
    document.getElementById('btn-crash-cashout').classList.add('hidden');

    GameEngine.state.netWorth = GameEngine.calculateNetWorth();
    AppDB.savePlayerState(GameEngine.activeUsername, GameEngine.state);

    showToast('تحطم الصاروخ', `انفجر الصاروخ عند مضاعف ${crashTarget.toFixed(2)}x. خسرت رهانك -${crashBetAmount.toLocaleString()} EGP.`, 'error');
    renderAll();
  }

  function cashoutCrash() {
    if (crashState !== 'running') return;

    cancelAnimationFrame(crashAnimationId);
    crashState = 'cashed_out';

    const winAmount = Math.floor(crashBetAmount * crashMultiplier);
    GameEngine.state.cash += winAmount;

    playCasinoSound(crashMultiplier >= 5.0 ? 'jackpot' : 'win');

    const statusText = document.getElementById('crash-status-text');
    if (statusText) {
      statusText.textContent = window.currentLang === 'en' ? `Cashed out at ${crashMultiplier.toFixed(2)}x !` : `صُرفت الأرباح عند ${crashMultiplier.toFixed(2)}x !`;
      statusText.className = 'text-[11px] text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded-lg border border-emerald-500/40';
    }

    document.getElementById('btn-crash-start').classList.remove('hidden');
    document.getElementById('btn-crash-cashout').classList.add('hidden');

    GameEngine.state.netWorth = GameEngine.calculateNetWorth();
    AppDB.savePlayerState(GameEngine.activeUsername, GameEngine.state);

    showToast('صرف الأرباح بنجاح', `تم صرف الأرباح عند مضاعف ${crashMultiplier.toFixed(2)}x! ربحت +${(winAmount - crashBetAmount).toLocaleString()} EGP!`, 'success');
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
    const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    const lastUpdatedDate = new Date(meta.updatedAt || now);
    const lastUpdatedFormatted = lastUpdatedDate.toLocaleTimeString(window.currentLang === 'en' ? 'en-US' : 'ar-EG', {
      hour: '2-digit',
      minute: '2-digit'
    });

    ['ingame-lb-timer', 'start-lb-timer'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = timeFormatted;
    });

    ['ingame-lb-last-updated', 'start-lb-last-updated'].forEach(id => {
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
      list.innerHTML = `
        <tr>
          <td colspan="4" class="text-center py-8 text-slate-400">
            <div class="flex items-center justify-center gap-2">
              <span class="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></span>
              <span class="font-bold text-xs">${window.currentLang === 'en' ? 'Loading official hourly snapshot...' : 'جاري جلب الاعتماد الساعي الرسمي لعرش الأثرياء...'}</span>
            </div>
          </td>
        </tr>
      `;
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
      updateHourlyLeaderboardTimerUI();
      list.innerHTML = '';

      if (!players || players.length === 0) {
        list.innerHTML = `
          <tr>
            <td colspan="4" class="text-center py-8 text-slate-500 text-xs">
              ${window.currentLang === 'en' ? 'No registered accounts in the leaderboard yet.' : 'لا توجد حسابات مسجلة حالياً في قائمة المتصدرين.'}
            </td>
          </tr>
        `;
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
          p1Name.textContent = top1.username;
          p1Name.classList.add('cursor-pointer', 'hover:underline');
          p1Name.onclick = () => openPlayerProfileCard(top1.username);
        }
        if (p1Title) p1Title.textContent = top1.title || (window.currentLang === 'en' ? 'Money Emperor' : 'إمبراطور المال');
        if (p1Worth) p1Worth.textContent = `${Number(top1.netWorth || 0).toLocaleString()} EGP`;
        if (p1Avatar) p1Avatar.innerHTML = `<span class="text-sm sm:text-base font-black">${(top1.username || 'P').substring(0, 2).toUpperCase()}</span>`;
      }

      // Podium 2 (Silver - 2nd)
      if (top2) {
        const p2Name = document.getElementById('podium-name-2');
        const p2Title = document.getElementById('podium-title-2');
        const p2Worth = document.getElementById('podium-worth-2');
        const p2Avatar = document.getElementById('podium-avatar-2');
        if (p2Name) {
          p2Name.textContent = top2.username;
          p2Name.classList.add('cursor-pointer', 'hover:underline');
          p2Name.onclick = () => openPlayerProfileCard(top2.username);
        }
        if (p2Title) p2Title.textContent = top2.title || (window.currentLang === 'en' ? 'Business Baron' : 'بارون التجارة');
        if (p2Worth) p2Worth.textContent = `${Number(top2.netWorth || 0).toLocaleString()} EGP`;
        if (p2Avatar) p2Avatar.innerHTML = `<span class="text-xs sm:text-sm font-black">${(top2.username || 'P').substring(0, 2).toUpperCase()}</span>`;
      }

      // Podium 3 (Bronze - 3rd)
      if (top3) {
        const p3Name = document.getElementById('podium-name-3');
        const p3Title = document.getElementById('podium-title-3');
        const p3Worth = document.getElementById('podium-worth-3');
        const p3Avatar = document.getElementById('podium-avatar-3');
        if (p3Name) {
          p3Name.textContent = top3.username;
          p3Name.classList.add('cursor-pointer', 'hover:underline');
          p3Name.onclick = () => openPlayerProfileCard(top3.username);
        }
        if (p3Title) p3Title.textContent = top3.title || (window.currentLang === 'en' ? 'Senior Businessman' : 'رجل أعمال كبار');
        if (p3Worth) p3Worth.textContent = `${Number(top3.netWorth || 0).toLocaleString()} EGP`;
        if (p3Avatar) p3Avatar.innerHTML = `<span class="text-xs sm:text-sm font-black">${(top3.username || 'P').substring(0, 2).toUpperCase()}</span>`;
      }

      // Update Self Rank indicator
      const activeUser = GameEngine.activeUsername;
      const selfIndex = players.findIndex(p => p.username === activeUser);
      const selfRankEl = document.getElementById('self-rank-num');
      if (selfRankEl) {
        selfRankEl.textContent = selfIndex !== -1 
          ? (window.currentLang === 'en' ? `#${selfIndex + 1} of ${players.length}` : `#${selfIndex + 1} من ${players.length}`)
          : (window.currentLang === 'en' ? 'Outside Top 25' : 'خارج قائمة الـ 25');
      }

      // Render Table Rows
      players.forEach((player, idx) => {
        const isSelf = player.username === activeUser;
        const rank = idx + 1;
        const initials = (player.username || 'P').substring(0, 2).toUpperCase();

        const row = document.createElement('tr');
        row.className = `border-b border-slate-800/40 text-xs transition duration-200 ${isSelf
            ? 'bg-yellow-500/15 hover:bg-yellow-500/20 font-bold border-r-4 border-r-yellow-500 shadow-inner'
            : rank === 1 ? 'bg-gradient-to-r from-yellow-500/10 via-amber-950/20 to-transparent hover:bg-yellow-500/15'
              : rank === 2 ? 'bg-gradient-to-r from-slate-700/10 via-slate-800/20 to-transparent hover:bg-slate-800/30'
                : rank === 3 ? 'bg-gradient-to-r from-amber-900/10 via-amber-950/20 to-transparent hover:bg-amber-900/20'
                  : 'hover:bg-slate-900/50'
          }`;

        let rankBadge = '';
        if (rank === 1) {
          rankBadge = `<span class="w-8 h-8 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 text-slate-950 font-black flex items-center justify-center text-xs shadow-md glow-gold"><i class="fa-solid fa-crown text-[10px] ml-0.5"></i>1</span>`;
        } else if (rank === 2) {
          rankBadge = `<span class="w-8 h-8 rounded-xl bg-slate-700 border border-slate-400/60 text-slate-100 font-black flex items-center justify-center text-xs shadow"><i class="fa-solid fa-medal text-[10px] ml-0.5"></i>2</span>`;
        } else if (rank === 3) {
          rankBadge = `<span class="w-8 h-8 rounded-xl bg-amber-950 border border-amber-600/60 text-amber-400 font-black flex items-center justify-center text-xs shadow"><i class="fa-solid fa-award text-[10px] ml-0.5"></i>3</span>`;
        } else if (rank <= 10) {
          rankBadge = `<span class="w-7 h-7 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 font-bold flex items-center justify-center text-xs numbers-font">#${rank}</span>`;
        } else {
          rankBadge = `<span class="w-7 h-7 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-400 font-medium flex items-center justify-center text-[11px] numbers-font">#${rank}</span>`;
        }

        row.innerHTML = `
          <td class="py-3 pr-4 pl-2 text-right">
            ${rankBadge}
          </td>
          <td class="py-3 px-3">
            <div class="flex items-center gap-2">
              <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg ${rank === 1 ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 glow-gold' : 'bg-slate-800 border border-slate-700 text-slate-300'} flex items-center justify-center text-[10px] font-black numbers-font flex-shrink-0">
                ${initials}
              </div>
              <div class="min-w-0">
                <span class="font-black ${isSelf ? 'text-yellow-400 glow-gold' : rank === 1 ? 'text-yellow-300' : 'text-white'} text-xs sm:text-sm block truncate cursor-pointer hover:underline" onclick="window.UI.openPlayerProfileCard('${player.username}')">
                  ${player.username}
                </span>
                ${isSelf ? (window.currentLang === 'en' ? '<span class="text-[8.5px] px-1.5 py-0.2 bg-yellow-500/20 text-yellow-400 rounded font-black inline-block border border-yellow-500/30">You (Your Account)</span>' : '<span class="text-[8.5px] px-1.5 py-0.2 bg-yellow-500/20 text-yellow-400 rounded font-black inline-block border border-yellow-500/30">أنت (حسابك)</span>') : ''}
              </div>
            </div>
          </td>
          <td class="py-3 px-3 text-slate-400">
            <span class="px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-[9.5px] sm:text-[10.5px] font-bold text-slate-300 inline-block truncate max-w-[120px] sm:max-w-none">
              ${player.title || (window.currentLang === 'en' ? 'Investor' : 'مستثمر')}
            </span>
          </td>
          <td class="py-3 pl-4 pr-3 text-left">
            <span class="numbers-font font-black ${rank === 1 ? 'text-yellow-400 text-xs sm:text-sm glow-gold' : 'text-emerald-400 text-xs sm:text-sm'} whitespace-nowrap">
              ${Number(player.netWorth || 0).toLocaleString()} EGP
            </span>
          </td>
        `;
        list.appendChild(row);
      });

    } catch (err) {
      list.innerHTML = `
        <tr>
          <td colspan="4" class="text-center py-8 text-rose-400 text-xs">
            <i class="fa-solid fa-circle-exclamation text-base mb-1 block"></i>
            تعذر تحميل قائمة المتصدرين. تأكد من اتصالك بالإنترنت.
          </td>
        </tr>
      `;
    }
  }



  // Floating Passive indicators
  function showPassiveGainFloat(text) {
    const parent = document.getElementById('passive-float-spawn');
    if (!parent) return;

    const el = document.createElement('div');
    el.className = 'absolute text-emerald-400 font-bold text-sm numbers-font animate-float pointer-events-none glow-emerald';
    el.textContent = text;
    // Set random position inside spawn box
    el.style.left = `${Math.floor(Math.random() * 50) + 20}%`;
    el.style.top = `${Math.floor(Math.random() * 30) + 10}%`;

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
          showToast(data.title || '📢 إعلان إداري عاجل', data.message, 'info');
          playMenuSound('success');
        }
      }, (err) => console.error("Broadcast listen err: ", err));
    activeListeners.push(unsubBroadcast);

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
      }).catch((err) => console.warn("Tax config fetch err: ", err));

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
            boostLabel.textContent = `${window.serverBoostMultiplier.toFixed(1)}x ${window.serverBoostMultiplier > 1 ? '(Boost نشط! 🔥)' : '(اعتيادي)'}`;
            if (window.serverBoostMultiplier > 1) {
              boostLabel.className = 'numbers-font text-amber-400 font-black animate-pulse';
            } else {
              boostLabel.className = 'numbers-font text-white font-black';
            }
          }
          
          // Update Server Boost Card background style dynamically
          const boostCard = document.getElementById('adm-server-boost-card');
          if (boostCard) {
            if (window.serverBoostMultiplier > 1) {
              boostCard.className = 'glass-panel p-3.5 rounded-xl border border-amber-500/50 flex justify-between items-center bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.1)] text-right';
            } else {
              boostCard.className = 'glass-panel p-3.5 rounded-xl border border-slate-800 flex justify-between items-center bg-slate-900/30 text-right';
            }
          }
          
          updateStatsBarServerBoostIndicator();
        }
      }).catch((err) => console.warn("ServerConfig fetch err: ", err));

    // Public Chat listener removed to conserve Firebase read/write quota (replaced with Facebook Community)

    // 3. V2 Mailbox Listener
    const unsubMail = AppDB.listenToMailbox(username, mails => {
      renderMailbox(mails);
    });
    if (typeof unsubMail === 'function') activeListeners.push(unsubMail);

    // 4. V2 Live Auctions Listener
    const unsubAuctions = AppDB.listenToLiveAuctions(list => {
      renderLiveAuctions(list);
    });
    if (typeof unsubAuctions === 'function') activeListeners.push(unsubAuctions);

    // 5. V2 Corporations Listener
    const unsubCorporations = AppDB.listenToCorporations(list => {
      window.lastCorporationsCache = list;
      
      // Update the player's active corporation cache
      const curUser = GameEngine.activeUsername || (GameEngine.state && GameEngine.state.username);
      if (curUser) {
        const myCorp = list.find(c => c.members && c.members.includes(curUser));
        window.activeCorporationState = myCorp || null;
      } else {
        window.activeCorporationState = null;
      }
      
      // If currently on corporations tab, redraw it
      if (activeTab === 'corporations') {
        renderCorporationsTab();
      }
    });
    if (typeof unsubCorporations === 'function') activeListeners.push(unsubCorporations);





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
          showToast('مكافأة عامة', `استلمت مكافأة عامة بقيمة +${data.amount.toLocaleString()} EGP!`, 'success');
          renderAll();
        }
      }, (err) => console.error("Airdrop listen err: ", err));
    activeListeners.push(unsubAirdrop);

    // 5. Market Event (Single Fetch on load to conserve read quota)
    db.collection('globals').doc('market_event').get().then((doc) => {
      if (!doc.exists) return;
      const data = doc.data();
      if (!data || !data.timestamp) return;

      if (data.resetBaseline) {
        Object.keys(GameEngine.STOCKS).forEach(sym => {
          const base = GameEngine.STOCKS[sym].basePrice;
          GameEngine.stockPrices[sym] = [base];
        });
      } else if (data.directPrice && data.targetSymbol) {
        const sym = data.targetSymbol;
        if (GameEngine.stockPrices[sym]) {
          GameEngine.stockPrices[sym][GameEngine.stockPrices[sym].length - 1] = data.directPrice;
        }
      }

      const ticker = document.getElementById('stock-market-news-ticker');
      if (ticker && data.title) {
        ticker.textContent = data.title;
      }
    }).catch(err => console.warn('[UI] Market event fetch warning:', err));

    // 3. User document listener for ban & external edits
    let lastAdminActionTimestamp = Date.now();
    const unsubUser = db.collection('players').doc(username)
      .onSnapshot((doc) => {
        if (!doc.exists) return;
        if (doc.metadata && doc.metadata.hasPendingWrites) return;

        const data = doc.data();

        // Ban check
        if (data.isBanned) {
          unsubUser();
          handleBannedUser();
          return;
        }

        // Only process external admin modifications if explicitly timestamped
        if (data.adminModifiedTimestamp && data.adminModifiedTimestamp > lastAdminActionTimestamp) {
          lastAdminActionTimestamp = data.adminModifiedTimestamp;

          GameEngine.state.cash = typeof data.cash === 'number' ? data.cash : 0;
          GameEngine.state.bank = typeof data.bank === 'number' ? data.bank : 0;
          GameEngine.state.dirtyCash = typeof data.dirtyCash === 'number' ? data.dirtyCash : 0;
          GameEngine.state.netWorth = typeof data.netWorth === 'number' ? data.netWorth : 0;
          GameEngine.state.xp = typeof data.xp === 'number' ? data.xp : 0;
          GameEngine.state.jobId = data.jobId || 'worker';
          GameEngine.state.title = data.title || 'عامل مبتدئ';

          GameEngine.calculateTotalNetWorth();

          try {
            localStorage.setItem(`rasalmal_state_${GameEngine.activeUsername}`, JSON.stringify(GameEngine.state));
          } catch (e) { }

          showToast('إشعار النظام', 'تم تحديث أو تصفير بيانات حسابك من قبل الإدارة.', 'info');
          renderAll();
        }
      }, (err) => console.error("User doc listen err: ", err));
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
    GameEngine.state.jobId = 'worker';
    GameEngine.state.title = 'عامل مبتدئ';
    GameEngine.state.underworldRep = 0;
    GameEngine.state.heatLevel = 0;
    GameEngine.state.jailTimer = 0;
    GameEngine.state.afkManagerExpiresAt = 0;
    GameEngine.state.activeLoan = null;
    GameEngine.state.investments = [];
    GameEngine.state.businesses = {
      coffee: { level: 0, price: 22, workers: 0 },
      tech: { level: 0, price: 160, workers: 0 },
      logistics: { level: 0, price: 1100, workers: 0 },
      supermarket: { level: 0, price: 450, workers: 0 },
      solar_factory: { level: 0, price: 3200, workers: 0 },
      private_hospital: { level: 0, price: 11500, workers: 0 },
      media_studio: { level: 0, price: 28000, workers: 0 },
      private_bank: { level: 0, price: 95000, workers: 0 },
      oil_refinery: { level: 0, price: 310000, workers: 0 },
      space_tech: { level: 0, price: 1250000, workers: 0 }
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
      showToast('تسجيل الخروج', 'تم تسجيل خروجك بنجاح وحفظ بيانات المحفظة.', 'info');
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
        manualRefreshBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>جاري التحديث...</span>';
        try {
          if (typeof loadAdminPlayersDirectory === 'function') {
            await loadAdminPlayersDirectory(true, true);
          }
          if (typeof showToast === 'function') {
            showToast('تحديث الإدارة', 'تم تحديث كافة بيانات لوحة التحكم بنجاح! 🔄', 'success');
          }
        } catch (e) {
          console.error('[Admin] Manual refresh error:', e);
        } finally {
          manualRefreshBtn.disabled = false;
          manualRefreshBtn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> <span>تحديث البيانات</span>';
        }
      });
    }

    // Tabs logic - bind all 9 subtabs
    const tabs = ['stats', 'players', 'transfers', 'market', 'broadcast', 'auctions', 'giftcodes', 'system', 'corporations'];
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
          cpuEl.textContent = (0.5 + Math.random() * 2.3).toFixed(1) + '%';
        }
        
        // RAM simulation: fluctuates between 40 MB and 52 MB
        const ramEl = document.getElementById('adm-telemetry-ram');
        if (ramEl) {
          ramEl.textContent = Math.floor(40 + Math.random() * 12) + ' MB';
        }
        
        // Latency ping
        const latencyEl = document.getElementById('adm-telemetry-latency');
        if (latencyEl) {
          const t0 = Date.now();
          firebase.firestore().collection('globals').doc('serverConfig').get()
            .then(() => {
              const t1 = Date.now();
              latencyEl.textContent = (t1 - t0) + 'ms';
            })
            .catch(() => {
              latencyEl.textContent = Math.floor(30 + Math.random() * 20) + 'ms';
            });
        }
      }
    }, 3000);

    // ─────────────────────────────────────────────
    //  MODULE: PLAYERS DIRECTORY & MANAGEMENT
    // ─────────────────────────────────────────────
    let cachedPlayers = [];
    let selectedPlayer = null;
    let selectedPlayerState = null;
    let activeFilter = 'all';

    const searchInput = document.getElementById('admin-search-user');
    const searchBtn = document.getElementById('btn-admin-search');
    const refreshListBtn = document.getElementById('btn-admin-refresh-players-list');
    const playersTableBody = document.getElementById('admin-players-table-body');
    const resultCard = document.getElementById('admin-player-result');

    async function loadAdminPlayersDirectory(showToastNotice = false, forceRefresh = false) {
      if (!playersTableBody) return;
      playersTableBody.innerHTML = '<tr><td colspan="5" class="py-4 text-center text-slate-400">جاري فحص وتحديث بيانات اللاعبين...</td></tr>';
      try {
        cachedPlayers = await AppDB.adminGetAllPlayers(forceRefresh);
        renderPlayersTable();
        updateFilterCounts();
        if (showToastNotice) {
          const isCache = cachedPlayers.length > 0 && cachedPlayers.every(p => p.fromCache);
          const cacheMsg = isCache ? ' (بيانات الكاش المحلي)' : ' (مباشر من السيرفر 🟢)';
          showToast('قائمة اللاعبين', `تم جلب بيانات ${cachedPlayers.length} لاعب بنجاح${cacheMsg}.`, 'success');
        }
      } catch (err) {
        playersTableBody.innerHTML = `<tr><td colspan="5" class="py-4 text-center text-rose-400">تعذر تحميل القائمة: ${err.message}</td></tr>`;
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
          elTotal.textContent = `${serverTotal} لاعب مسجل (${countAll} مفهرس)`;
        } else {
          elTotal.textContent = `${countAll} لاعب مسجل`;
        }
      }
    }

    function renderPlayersTable() {
      if (!playersTableBody) return;
      const rawQuery = (searchInput ? searchInput.value.trim() : '');
      const query = rawQuery.toLowerCase();

      let filtered = cachedPlayers.filter(p => {
        const matchesQuery = !query || p.username.toLowerCase().includes(query) || (p.title && p.title.toLowerCase().includes(query));
        if (!matchesQuery) return false;

        if (activeFilter === 'jailed') return p.jailTimer > 0;
        if (activeFilter === 'banned') return p.isBanned;
        return true;
      });

      if (filtered.length === 0) {
        if (rawQuery) {
          playersTableBody.innerHTML = `
            <tr>
              <td colspan="5" class="py-6 text-center space-y-2">
                <div class="text-slate-400 text-xs">لم يتم العثور على اللاعب "${rawQuery}" في القائمة المفهرسة محلياً.</div>
                <button id="btn-ui-direct-cloud-lookup" class="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold rounded-lg text-xs transition inline-flex items-center gap-2 shadow-lg shadow-yellow-500/20">
                  <i class="fa-solid fa-cloud-arrow-down"></i>
                  <span>فحص وبحث مباشر بالاسم في السيرفر السحابي</span>
                </button>
              </td>
            </tr>
          `;
          const lookupBtn = document.getElementById('btn-ui-direct-cloud-lookup');
          if (lookupBtn) {
            lookupBtn.onclick = async () => {
              lookupBtn.disabled = true;
              lookupBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الاستعلام السحابي...';
              try {
                const fetchedDoc = await AppDB.adminGetPlayer(rawQuery);
                if (fetchedDoc) {
                  const existingIdx = cachedPlayers.findIndex(p => p.username.toLowerCase() === rawQuery.toLowerCase());
                  const playerObj = {
                    username: fetchedDoc.username || rawQuery,
                    netWorth: Number(fetchedDoc.netWorth || 0),
                    cash: Number(fetchedDoc.cash || 0),
                    bank: Number(fetchedDoc.bank || 0),
                    title: fetchedDoc.title || 'عامل مبتدئ',
                    jobId: fetchedDoc.jobId || 'unemployed',
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
                  showToast('تم العثور على الحساب', `تم جلب ملف اللاعب ${playerObj.username} مباشرة من السيرفر!`, 'success');
                } else {
                  showToast('غير موجود', `اسم المستخدم "${rawQuery}" غير مسجل في خوادم اللعبة.`, 'warning');
                  lookupBtn.disabled = false;
                  lookupBtn.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> غير مسجل بالسيرفر';
                }
              } catch (err) {
                showToast('خطأ استعلام', err.message, 'error');
                lookupBtn.disabled = false;
                lookupBtn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> إعادة المحاولة';
              }
            };
          }
        } else {
          playersTableBody.innerHTML = '<tr><td colspan="5" class="py-6 text-center text-slate-500">لا يوجد حسابات مطابقة لمعايير الفلترة الحالية.</td></tr>';
        }
        return;
      }

      playersTableBody.innerHTML = '';
      filtered.forEach(p => {
        const tr = document.createElement('tr');
        tr.className = `hover:bg-slate-800/60 transition cursor-pointer ${selectedPlayer === p.username ? 'bg-yellow-500/10 border-r-2 border-yellow-500' : ''}`;

        const isOnlineThreshold = 2 * 60 * 1000; // 2 minutes
        const isPlayerOnline = p.lastActiveTimestamp && (Date.now() - p.lastActiveTimestamp) < isOnlineThreshold;
        let statusBadge = isPlayerOnline
          ? '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">متصل 🟢</span>'
          : '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">غير نشط ⚫</span>';
        if (p.isBanned) {
          statusBadge = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">محظور 🚫</span>';
        } else if (p.jailTimer > 0) {
          statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">سجين (${p.jailTimer}ث)${isPlayerOnline ? ' 🟢' : ''}</span>`;
        } else if (p.isAdmin) {
          statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">الإدارة ⭐${isPlayerOnline ? ' 🟢' : ' ⚫'}</span>`;
        }

        tr.innerHTML = `
          <td class="p-2.5 flex items-center gap-2">
            <div class="w-6 h-6 rounded-full bg-slate-800 text-yellow-400 flex items-center justify-center font-bold text-[10px]">
              ${p.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <div class="font-bold text-white">${p.username} ${p.username === GameEngine.activeUsername ? '<span class="text-[9px] text-yellow-400">(أنت)</span>' : ''}</div>
              <div class="text-[10px] text-slate-400 font-sans">${p.title || 'عامل مبتدئ'}</div>
            </div>
          </td>
          <td class="p-2.5 text-center numbers-font font-bold text-yellow-400">${(p.netWorth || 0).toLocaleString()} EGP</td>
          <td class="p-2.5 text-center numbers-font font-bold text-emerald-400">${(p.cash || 0).toLocaleString()} EGP</td>
          <td class="p-2.5 text-center">${statusBadge}</td>
          <td class="p-2.5 text-left">
            <button data-user="${p.username}" class="btn-select-player px-2.5 py-1 bg-yellow-500/20 hover:bg-yellow-500 text-yellow-400 hover:text-slate-950 rounded text-[10px] font-bold transition">إدارة ⚡</button>
          </td>
        `;

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
        document.getElementById('admin-p-worth').textContent = `${(state.netWorth || 0).toLocaleString()} EGP`;
        document.getElementById('admin-p-cash').textContent = (state.cash || 0).toLocaleString();
        document.getElementById('admin-p-bank').textContent = (state.bank || 0).toLocaleString();
        const dirtyEl = document.getElementById('admin-p-dirty');
        if (dirtyEl) dirtyEl.textContent = (state.dirtyCash || 0).toLocaleString();
        document.getElementById('admin-p-title').textContent = state.title || 'عامل مبتدئ';

        // Format and render account creation date
        let createdStr = 'غير معروف';
        if (state.createdAt) {
          let date;
          if (typeof state.createdAt.toDate === 'function') {
            date = state.createdAt.toDate();
          } else if (state.createdAt.seconds) {
            date = new Date(state.createdAt.seconds * 1000);
          } else {
            date = new Date(state.createdAt);
          }
          if (date && !isNaN(date.getTime())) {
            createdStr = date.toLocaleDateString('ar-EG') + ' ' + date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
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
          const tickIncome = GameEngine.calculatePassiveIncomePerTick(true); // Exclude wealth tax for true gross
          const taxReport = GameEngine.calculateTaxReport();

          grossIncomePerSecond = Math.max(0, tickIncome / 3);
          taxPerSecond = (state.netWorth || 0) > 3000000 ? (taxReport.taxPerSecond / 3) : 0;
          netIncomePerSecond = Math.max(0, grossIncomePerSecond - taxPerSecond);
        } catch (err) {
          console.warn("Failed to simulate player flows:", err);
        } finally {
          GameEngine.state = originalState;
        }

        const grossFlowEl = document.getElementById('admin-p-flow-gross');
        if (grossFlowEl) grossFlowEl.textContent = `${grossIncomePerSecond.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} EGP/ث`;

        const taxFlowEl = document.getElementById('admin-p-flow-tax');
        if (taxFlowEl) taxFlowEl.textContent = `${taxPerSecond.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} EGP/ث`;

        const netFlowEl = document.getElementById('admin-p-flow-net');
        if (netFlowEl) netFlowEl.textContent = `${netIncomePerSecond.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} EGP/ث`;

        const roleBadge = document.getElementById('admin-p-badge-role');
        if (roleBadge) {
          roleBadge.textContent = state.isAdmin ? 'مدير النظام (Admin)' : 'حساب لاعب';
          roleBadge.className = state.isAdmin
            ? 'text-[10px] px-2 py-0.5 rounded font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
            : 'text-[10px] px-2 py-0.5 rounded font-bold bg-slate-800 text-slate-300';
        }

        const toggleRoleBtn = document.getElementById('btn-admin-toggle-role');
        const toggleRoleText = document.getElementById('admin-toggle-role-text');
        if (toggleRoleBtn && toggleRoleText) {
          if (state.isAdmin) {
            toggleRoleText.textContent = 'سحب صلاحية الإدارة (إلغاء أدمن) ⚠️';
            toggleRoleBtn.className = 'w-full py-2 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/40 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1.5';
          } else {
            toggleRoleText.textContent = 'نقل صلاحية الإدارة / تعيين كمسؤول (Make Admin) 👑';
            toggleRoleBtn.className = 'w-full py-2 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 rounded-lg text-[11px] font-black transition flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20';
          }
        }

        const statusBadge = document.getElementById('admin-p-badge-status');
        if (statusBadge) {
          const onlineThreshold = 2 * 60 * 1000; // 2 minutes
          const isOnline = state.lastActiveTimestamp && (Date.now() - state.lastActiveTimestamp) < onlineThreshold;
          const lastSeenText = state.lastActiveTimestamp ? new Date(state.lastActiveTimestamp).toLocaleTimeString('ar-EG') : 'غير معروف';
          if (state.isBanned) {
            statusBadge.textContent = 'محظور نهائياً 🚫';
            statusBadge.className = 'text-[10px] px-2 py-0.5 rounded font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30';
          } else if (state.jailTimer > 0) {
            statusBadge.textContent = `مسجون (${state.jailTimer} ثانية) ${isOnline ? '🟢 متصل' : '⚫ غير نشط'}`;
            statusBadge.className = 'text-[10px] px-2 py-0.5 rounded font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30';
          } else if (isOnline) {
            statusBadge.textContent = `متصل الآن 🟢 (آخر نشاط: ${lastSeenText})`;
            statusBadge.className = 'text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
          } else {
            statusBadge.textContent = `غير نشط ⚫ (آخر ظهور: ${lastSeenText})`;
            statusBadge.className = 'text-[10px] px-2 py-0.5 rounded font-bold bg-slate-600/20 text-slate-400 border border-slate-500/30';
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
          resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        renderPlayersTable();
        renderPlayerPossessions(state);
        loadAdminPlayerWorkspace(state);
        logAdminAction(`تم فتح ملف الحساب للاعب: ${username}`);
      } catch (err) {
        showToast('خطأ فحص اللاعب', err.message, 'error');
      }
    }

    // ==================== PLAYER POSSESSIONS & BACKUP EXPORT & GRANT ACTIONS ====================

    // RENDER PLAYER POSSESSIONS DIRECTORY
    function renderPlayerPossessions(state) {
      const container = document.getElementById('admin-p-possessions-container');
      if (!container) return;
      container.innerHTML = '';

      let hasItems = false;

      // 1. Current Job
      if (state.jobId || state.title) {
        hasItems = true;
        const jobDiv = document.createElement('div');
        jobDiv.className = 'flex justify-between items-center bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/80 hover:border-yellow-500/20 transition';
        jobDiv.innerHTML = `
          <div class="flex items-center gap-2">
            <span class="text-base">💼</span>
            <div>
              <div class="font-bold text-slate-200">الوظيفة الحالية</div>
              <div class="text-[10px] text-slate-400 font-sans">${state.title || 'عامل مبتدئ'}</div>
            </div>
          </div>
          <select class="admin-inline-job-select bg-slate-950 border border-slate-700 text-slate-300 p-1.5 rounded-md text-[10px] focus:outline-none focus:border-yellow-500">
            ${Object.keys(GameEngine.JOBS).map(jk => '<option value="' + jk + '" ' + (state.jobId === jk ? 'selected' : '') + '>' + GameEngine.JOBS[jk].name + '</option>').join('')}
          </select>
        `;
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
          bizDiv.className = 'flex justify-between items-center bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/80 hover:border-yellow-500/20 transition gap-2 mt-2';
          bizDiv.innerHTML = `
            <div class="flex items-center gap-2 flex-1 text-right">
              <span class="text-base">🏢</span>
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
            </div>
          `;

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
            if (confirm(`هل أنت متأكد من حذف مشروع "${bizName}" لللاعب؟`)) {
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
          assetDiv.className = 'flex justify-between items-center bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/80 hover:border-yellow-500/20 transition mt-2';
          assetDiv.innerHTML = `
            <div class="flex items-center gap-2 text-right">
              <span class="text-base">🏡</span>
              <div>
                <div class="font-bold text-slate-200">${assetName}</div>
                <div class="text-[10px] text-slate-400">العدد المملوك: <strong class="text-emerald-400 font-mono">${qty}</strong></div>
              </div>
            </div>
            <div class="flex items-center gap-1">
              <button class="btn-inline-ast-dec px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold">-</button>
              <button class="btn-inline-ast-inc px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold">+</button>
              <button class="btn-inline-ast-del ml-1 p-1.5 text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition" title="حذف الأصل"><i class="fa-solid fa-trash-can"></i></button>
            </div>
          `;

          assetDiv.querySelector('.btn-inline-ast-dec').addEventListener('click', async () => {
            state.assets[ak] = Math.max(0, qty - 1);
            await saveAndSyncPlayerPossessions();
          });
          assetDiv.querySelector('.btn-inline-ast-inc').addEventListener('click', async () => {
            state.assets[ak] = qty + 1;
            await saveAndSyncPlayerPossessions();
          });
          assetDiv.querySelector('.btn-inline-ast-del').addEventListener('click', async () => {
            if (confirm(`هل أنت متأكد من حذف عقارات "${assetName}" بالكامل لللاعب؟`)) {
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
          stockDiv.className = 'flex justify-between items-center bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/80 hover:border-yellow-500/20 transition gap-2 mt-2';
          stockDiv.innerHTML = `
            <div class="flex items-center gap-2 flex-1 text-right">
              <span class="text-base">📈</span>
              <div>
                <div class="font-bold text-slate-200">${sk} (${stockName})</div>
                <div class="text-[10px] text-slate-400">الأسهم: <span class="text-yellow-400 font-bold font-mono">${stockData.shares}</span> | متوسط الشراء: <span class="text-sky-400 font-bold font-mono">${stockData.avgPrice} EGP</span></div>
              </div>
            </div>
            <div class="flex items-center gap-1">
              <button class="btn-inline-stk-edit px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold">تعديل</button>
              <button class="btn-inline-stk-del p-1.5 text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition" title="حذف الأسهم"><i class="fa-solid fa-trash-can"></i></button>
            </div>
          `;

          stockDiv.querySelector('.btn-inline-stk-edit').addEventListener('click', async () => {
            const newShares = prompt(`أدخل عدد الأسهم الجديد لسهم (${sk}):`, stockData.shares);
            if (newShares === null) return;
            const newPrice = prompt(`أدخل متوسط سعر الشراء الجديد للسهم:`, stockData.avgPrice);
            if (newPrice === null) return;

            const sharesVal = parseInt(newShares) || 0;
            const priceVal = parseFloat(newPrice) || 0;

            if (sharesVal < 0 || priceVal < 0) {
              showToast('خطأ إدخال', 'يرجى إدخال قيم صحيحة للأسهم والأسعار.', 'error');
              return;
            }

            stockData.shares = sharesVal;
            stockData.avgPrice = priceVal;
            await saveAndSyncPlayerPossessions();
          });

          stockDiv.querySelector('.btn-inline-stk-del').addEventListener('click', async () => {
            if (confirm(`هل أنت متأكد من حذف أسهم "${sk}" لللاعب؟`)) {
              stockData.shares = 0;
              await saveAndSyncPlayerPossessions();
            }
          });

          container.appendChild(stockDiv);
        });
      }

      if (!hasItems) {
        container.innerHTML = `<p class="text-slate-500 text-[10px] text-center py-2">لا يوجد أملاك أو وظائف لعرضها حالياً لهذا اللاعب.</p>`;
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
          GameEngine.state.jobId = selectedPlayerState.jobId || 'worker';
          GameEngine.state.title = selectedPlayerState.title || 'عامل مبتدئ';
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
          const tickIncome = GameEngine.calculatePassiveIncomePerTick(true); // Exclude wealth tax for true gross
          const taxReport = GameEngine.calculateTaxReport();

          grossIncomePerSecond = Math.max(0, tickIncome / 3);
          taxPerSecond = (selectedPlayerState.netWorth || 0) > 3000000 ? (taxReport.taxPerSecond / 3) : 0;
          netIncomePerSecond = Math.max(0, grossIncomePerSecond - taxPerSecond);
        } catch (err) {
          console.warn("Failed to simulate player flows:", err);
        } finally {
          GameEngine.state = originalState;
        }

        const grossFlowEl = document.getElementById('admin-p-flow-gross');
        if (grossFlowEl) grossFlowEl.textContent = `${grossIncomePerSecond.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} EGP/ث`;

        const taxFlowEl = document.getElementById('admin-p-flow-tax');
        if (taxFlowEl) taxFlowEl.textContent = `${taxPerSecond.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} EGP/ث`;

        const netFlowEl = document.getElementById('admin-p-flow-net');
        if (netFlowEl) netFlowEl.textContent = `${netIncomePerSecond.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} EGP/ث`;

        // Update Admin UI fields
        document.getElementById('admin-p-worth').textContent = `${worth.toLocaleString()} EGP`;
        document.getElementById('admin-p-title').textContent = selectedPlayerState.title || 'عامل مبتدئ';

        // Re-render
        renderPlayerPossessions(selectedPlayerState);
        loadAdminPlayersDirectory(false);
        showToast('حفظ التعديلات', 'تم تحديث ممتلكات اللاعب بنجاح وحفظها.', 'success');
      } catch (err) {
        showToast('خطأ حفظ ممتلكات', err.message, 'error');
      }
    }

    // Dynamic Select Populate for Grant Tool
    function populateGrantItemSelect() {
      const typeSelect = document.getElementById('admin-grant-type');
      const itemSelect = document.getElementById('admin-grant-item-select');
      if (!typeSelect || !itemSelect) return;

      const type = typeSelect.value;
      itemSelect.innerHTML = '';

      // Toggle fields visibility
      document.getElementById('admin-grant-fields-job').classList.toggle('hidden', type !== 'job');
      document.getElementById('admin-grant-fields-business').classList.toggle('hidden', type !== 'business');
      document.getElementById('admin-grant-fields-asset').classList.toggle('hidden', type !== 'asset');
      document.getElementById('admin-grant-fields-stock').classList.toggle('hidden', type !== 'stock');

      let options = [];
      if (type === 'job') {
        Object.keys(GameEngine.JOBS).forEach(k => {
          options.push({ value: k, text: GameEngine.JOBS[k].name });
        });
      } else if (type === 'business') {
        Object.keys(GameEngine.BUSINESSES).forEach(k => {
          options.push({ value: k, text: GameEngine.BUSINESSES[k].name });
        });
      } else if (type === 'asset') {
        Object.keys(GameEngine.ASSETS).forEach(k => {
          options.push({ value: k, text: GameEngine.ASSETS[k].name });
        });
      } else if (type === 'stock') {
        Object.keys(GameEngine.STOCKS).forEach(k => {
          options.push({ value: k, text: `${k} (${GameEngine.STOCKS[k].name})` });
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
          showToast('إضافة ممتلكات', 'يرجى اختيار لاعب أولاً من القائمة.', 'error');
          return;
        }

        const type = document.getElementById('admin-grant-type').value;
        const itemKey = document.getElementById('admin-grant-item-select').value;
        if (!itemKey) return;

        if (type === 'job') {
          selectedPlayerState.jobId = itemKey;
          selectedPlayerState.title = document.getElementById('admin-grant-job-title').value.trim() || GameEngine.JOBS[itemKey].name;
        } else if (type === 'business') {
          const lvl = parseInt(document.getElementById('admin-grant-biz-level').value) || 0;
          const wrk = parseInt(document.getElementById('admin-grant-biz-workers').value) || 0;
          if (lvl < 0 || wrk < 0) {
            showToast('خطأ إدخال', 'يرجى إدخال أرقام صحيحة لمستوى المشروع وموظفيه.', 'error');
            return;
          }
          if (!selectedPlayerState.businesses) selectedPlayerState.businesses = {};
          const bizConfig = GameEngine.BUSINESSES[itemKey];
          const price = (selectedPlayerState.businesses[itemKey] && selectedPlayerState.businesses[itemKey].price) || (bizConfig ? bizConfig.optimumPrice : 10);
          selectedPlayerState.businesses[itemKey] = { level: lvl, workers: wrk, price: price };
        } else if (type === 'asset') {
          const qty = parseInt(document.getElementById('admin-grant-asset-qty').value) || 0;
          if (qty < 0) {
            showToast('خطأ إدخال', 'العدد يجب أن يكون صفراً أو أكبر.', 'error');
            return;
          }
          if (!selectedPlayerState.assets) selectedPlayerState.assets = {};
          selectedPlayerState.assets[itemKey] = qty;
        } else if (type === 'stock') {
          const shares = parseInt(document.getElementById('admin-grant-stock-shares').value) || 0;
          const price = parseFloat(document.getElementById('admin-grant-stock-price').value) || 0;
          if (shares < 0 || price < 0) {
            showToast('خطأ إدخال', 'الأسهم والأسعار يجب أن تكون أرقاماً موجبة.', 'error');
            return;
          }
          if (!selectedPlayerState.stocks) selectedPlayerState.stocks = {};
          selectedPlayerState.stocks[itemKey] = { shares: shares, avgPrice: price };
        }

        await saveAndSyncPlayerPossessions();
        showToast('إضافة ممتلكات', 'تم منح الممتلك المحدد لللاعب بنجاح.', 'success');
      });
    }

    // Download Backup Action
    const downloadBackupBtn = document.getElementById('btn-admin-download-backup');
    if (downloadBackupBtn) {
      downloadBackupBtn.addEventListener('click', () => {
        if (!selectedPlayer || !selectedPlayerState) {
          showToast('تحميل تقرير الحساب', 'يرجى اختيار لاعب أولاً.', 'error');
          return;
        }
        try {
          const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(selectedPlayerState, null, 2));
          const downloadAnchor = document.createElement('a');
          downloadAnchor.setAttribute("href", dataStr);
          downloadAnchor.setAttribute("download", `rasalmal_player_${selectedPlayer}_backup.json`);
          document.body.appendChild(downloadAnchor);
          downloadAnchor.click();
          downloadAnchor.remove();
          showToast('تحميل تقرير الحساب', `تم تحميل ملف بيانات حساب اللاعب ${selectedPlayer} بنجاح.`, 'success');
        } catch (err) {
          showToast('خطأ في التحميل', err.message, 'error');
        }
      });
    }

    // Filter Buttons
    const filterBtns = document.querySelectorAll('.admin-player-filter-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => {
          b.classList.remove('bg-yellow-500', 'text-slate-950');
          b.classList.add('bg-slate-800', 'text-slate-300');
        });
        btn.classList.remove('bg-slate-800', 'text-slate-300');
        btn.classList.add('bg-yellow-500', 'text-slate-950');
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
          showToast('بحث اللاعبين', 'يرجى إدخال اسم المستخدم للبحث.', 'warning');
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
        if (targetType === 'cash') {
          const c = document.getElementById('admin-input-cash');
          if (c) c.value = 0;
        } else if (targetType === 'bank') {
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
          showToast('تعديل الرصيد', 'يرجى اختيار لاعب أولاً من القائمة.', 'error');
          return;
        }
        const newCash = Number(document.getElementById('admin-input-cash').value);
        const newBank = Number(document.getElementById('admin-input-bank').value);

        if (isNaN(newCash) || isNaN(newBank) || newCash < 0 || newBank < 0) {
          showToast('خطأ مدخلات', 'يرجى إدخال مبالغ صحيحة وموجبة.', 'error');
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
          document.getElementById('admin-p-worth').textContent = `${worth.toLocaleString()} EGP`;

          showToast('تم الحفظ بنجاح', `تم تحديث رصيد اللاعب ${selectedPlayer} بنجاح (كاش: ${newCash.toLocaleString()}، بنك: ${newBank.toLocaleString()}).`, 'success');
          logAdminAction(`تعديل رصيد اللاعب ${selectedPlayer} إلى كاش: ${newCash.toLocaleString()} ج.م، بنك: ${newBank.toLocaleString()} ج.م`);

          loadAdminPlayersDirectory(false);
        } catch (err) {
          showToast('فشل تعديل الرصيد', err.message, 'error');
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
          showToast('تعديل الأملاك', 'يرجى اختيار لاعب أولاً من القائمة.', 'error');
          return;
        }
        const bizKey = document.getElementById('admin-input-biz-type').value;
        const level = parseInt(document.getElementById('admin-input-biz-level').value) || 0;
        const workers = parseInt(document.getElementById('admin-input-biz-workers').value) || 0;

        if (isNaN(level) || level < 0 || isNaN(workers) || workers < 0) {
          showToast('خطأ مدخلات', 'يرجى إدخال قيم صحيحة للمستوى والموظفين.', 'error');
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
          updateBizBtn.innerHTML = 'جاري الحفظ والتزامن...';

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

          document.getElementById('admin-p-worth').textContent = `${worth.toLocaleString()} EGP`;
          showToast('تحديث الأملاك', `تم تحديث أملاك اللاعب (${bizConfig ? bizConfig.name : bizKey}) بنجاح إلى مستوى ${level} وعدد موظفين ${workers}.`, 'success');
          logAdminAction(`تعديل أملاك اللاعب ${selectedPlayer}: ${bizKey} -> مستوى ${level}، موظفين ${workers}`);
          loadAdminPlayersDirectory(false);
        } catch (err) {
          showToast('خطأ في الحفظ', err.message, 'error');
        } finally {
          updateBizBtn.disabled = false;
          updateBizBtn.innerHTML = '<i class="fa-solid fa-building-circle-check"></i> <span>حفظ وتطبيق الأملاك فوراً</span>';
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
          showToast('عفو قانوني', `تم الإفراج عن اللاعب ${selectedPlayer} وإلغاء عقوبة السجن.`, 'success');
          logAdminAction(`عفو وإفراج قانوني عن اللاعب: ${selectedPlayer}`);
          selectPlayerForModeration(selectedPlayer);
        } catch (err) {
          showToast('خطأ إشرافي', err.message, 'error');
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
          showToast('عقوبة السجن', `تم إيداع اللاعب ${selectedPlayer} في السجن لمدة 5 دقائق.`, 'warning');
          logAdminAction(`إيداع اللاعب ${selectedPlayer} في السجن لمدة 300 ثانية`);
          selectPlayerForModeration(selectedPlayer);
        } catch (err) {
          showToast('خطأ إشرافي', err.message, 'error');
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
          showToast('حظر الحساب', `تم حظر حساب اللاعب ${selectedPlayer} نهائياً.`, 'success');
          logAdminAction(`حظر نهائي لحساب اللاعب: ${selectedPlayer}`);
          selectPlayerForModeration(selectedPlayer);
        } catch (err) {
          showToast('خطأ حظر', err.message, 'error');
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
          showToast('فك الحظر', `تم رفع الحظر عن حساب اللاعب ${selectedPlayer} بنجاح.`, 'success');
          logAdminAction(`رفع الحظر وإعادة تنشيط حساب اللاعب: ${selectedPlayer}`);
          selectPlayerForModeration(selectedPlayer);
        } catch (err) {
          showToast('خطأ فك الحظر', err.message, 'error');
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
          if (newPin !== null) showToast('تغيير PIN', 'يجب أن يتكون الرقم السري من 3 خانات على الأقل.', 'error');
          return;
        }
        try {
          await AppDB.adminChangePlayerPin(selectedPlayer, newPin.trim());
          showToast('تغيير PIN', `تم تعيين الرقم السري الجديد للاعب ${selectedPlayer} بنجاح.`, 'success');
          logAdminAction(`تغيير الرقم السري لحساب اللاعب: ${selectedPlayer}`);
        } catch (err) {
          showToast('خطأ تغيير PIN', err.message, 'error');
        }
      });
    }

    // Toggle / Transfer Admin Role Action
    const toggleAdminRoleBtn = document.getElementById('btn-admin-toggle-role');
    if (toggleAdminRoleBtn) {
      toggleAdminRoleBtn.addEventListener('click', async () => {
        if (!selectedPlayer || !selectedPlayerState) {
          showToast('إدارة الصلاحيات', 'يرجى اختيار لاعب أولاً من القائمة.', 'error');
          return;
        }

        const isCurrentlyAdmin = Boolean(selectedPlayerState.isAdmin);
        const targetUser = selectedPlayer;

        let confirmMsg = '';
        if (isCurrentlyAdmin) {
          confirmMsg = `⚠️ تحذير: هل أنت متأكد من سحب صلاحيات الإدارة من اللاعب "${targetUser}" وتحويل حسابه إلى حساب لاعب عادي؟`;
        } else {
          confirmMsg = `👑 تأكيد ترقية مسؤول:\nهل أنت متأكد من منح صلاحيات الإدارة الكاملة (Admin) للاعب "${targetUser}"؟\nسيتمكن هذا الحساب من الدخول للوحة التحكم وإدارة كافة مفاصل اللعبة واللاعبين.`;
        }

        if (!confirm(confirmMsg)) return;

        try {
          toggleAdminRoleBtn.disabled = true;
          toggleAdminRoleBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري تحديث الصلاحية...';

          const newAdminStatus = !isCurrentlyAdmin;
          await AppDB.adminSetPlayerAdminStatus(targetUser, newAdminStatus);

          selectedPlayerState.isAdmin = newAdminStatus;
          if (targetUser === GameEngine.activeUsername && GameEngine.state) {
            GameEngine.state.isAdmin = newAdminStatus;
          }

          showToast('صلاحيات الإدارة', newAdminStatus ? `تم تعيين اللاعب ${targetUser} كمسؤول (Admin) بنجاح! 👑` : `تم سحب صلاحيات الإدارة من اللاعب ${targetUser}.`, 'success');
          logAdminAction(`${newAdminStatus ? 'ترقية وتعيين مسؤول جديد (Admin)' : 'سحب صلاحية الإدارة من'}: ${targetUser}`);

          selectPlayerForModeration(targetUser);
          loadAdminPlayersDirectory(false);
        } catch (err) {
          showToast('خطأ تعديل الصلاحية', err.message, 'error');
        } finally {
          toggleAdminRoleBtn.disabled = false;
          if (selectedPlayerState) {
            if (selectedPlayerState.isAdmin) {
              toggleAdminRoleBtn.innerHTML = '<i class="fa-solid fa-user-shield text-xs"></i> <span>سحب صلاحية الإدارة (إلغاء أدمن) ⚠️</span>';
              toggleAdminRoleBtn.className = 'w-full py-2 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/40 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1.5';
            } else {
              toggleAdminRoleBtn.innerHTML = '<i class="fa-solid fa-crown text-xs"></i> <span>نقل صلاحية الإدارة لهذا الحساب (Make Admin) 👑</span>';
              toggleAdminRoleBtn.className = 'w-full py-2 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 rounded-lg text-[11px] font-black transition flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20';
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
        const confirmMsg = `تحذير قاطع: هل أنت متأكد من تصفير حساب اللاعب "${selectedPlayer}" بالكامل من كل شيء؟\nسيتم تصفير الكاش والبنك والأموال المشبوهة، ومسح كافة الأصول والشركات والأسهم والاستثمارات والمخزون ونقاط الخبرة والرتبة والملاحقات (تصفير شامل 0 EGP).`;
        if (!confirm(confirmMsg)) return;

        try {
          const freshData = await AppDB.adminResetPlayer(selectedPlayer);

          // If active user is the reset user, sync immediately
          if (selectedPlayer === GameEngine.activeUsername) {
            applyCompleteZeroStateToGameEngine(selectedPlayer);
            renderAll();
          }

          showToast('تصفير الحساب', `تم تصفير حساب اللاعب "${selectedPlayer}" بالكامل من كل شيء بنجاح (0 EGP).`, 'success');
          logAdminAction(`تصفير شامل ونهائي لكافة أرصدة وممتلكات حساب اللاعب: ${selectedPlayer}`);
          selectPlayerForModeration(selectedPlayer);
          loadAdminPlayersDirectory(false);
        } catch (err) {
          showToast('خطأ تصفير الحساب', err.message, 'error');
        }
      });
    }

    // DELETE SPECIFIC PLAYER ACCOUNT
    const deletePlayerAccountBtn = document.getElementById('btn-admin-delete-player-account');
    if (deletePlayerAccountBtn) {
      deletePlayerAccountBtn.addEventListener('click', async () => {
        if (!selectedPlayer) return;
        if (!confirm(`⚠️ تحذير نهائي: هل أنت متأكد من حذف وثيقة وحساب اللاعب "${selectedPlayer}" نهائياً من الخوادم؟`)) return;

        try {
          await AppDB.adminDeletePlayer(selectedPlayer);
          showToast('حذف الحساب', `تم حذف حساب اللاعب ${selectedPlayer} نهائياً من قاعدة البيانات.`, 'success');
          logAdminAction(`حذف نهائي لوثيقة حساب اللاعب: ${selectedPlayer}`);

          if (resultCard) resultCard.classList.add('hidden');
          selectedPlayer = null;
          selectedPlayerState = null;
          loadAdminPlayersDirectory(false);
        } catch (err) {
          showToast('خطأ حذف الحساب', err.message, 'error');
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
    let currentLogFilter = 'all';

    function renderPlayerLogFeed(pState) {
      if (!logFeed) return;
      const logs = (pState && pState.activityLog) || [];
      const filtered = logs.filter(l => currentLogFilter === 'all' || l.category === currentLogFilter);

      if (filtered.length === 0) {
        logFeed.innerHTML = `
          <div class="p-6 text-center text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800">
            <i class="fa-solid fa-clipboard-list text-2xl mb-2 text-slate-600 block"></i>
            <span>لا توجد عمليات مسجلة لهذا اللاعب في هذا التصنيف حتى الآن.</span>
          </div>
        `;
        return;
      }

      logFeed.innerHTML = '';
      filtered.forEach(item => {
        const div = document.createElement('div');
        div.className = 'p-2.5 bg-slate-900/70 hover:bg-slate-900 border border-slate-800/80 rounded-xl flex items-center justify-between gap-2 transition';

        let icon = '<i class="fa-solid fa-circle-info text-sky-400"></i>';
        let badgeColor = 'bg-sky-500/10 text-sky-400 border-sky-500/20';

        if (item.category === 'business') {
          icon = '<i class="fa-solid fa-briefcase text-emerald-400"></i>';
          badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
        } else if (item.category === 'stock') {
          icon = '<i class="fa-solid fa-chart-line text-yellow-400"></i>';
          badgeColor = 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
        } else if (item.category === 'investment') {
          icon = '<i class="fa-solid fa-vault text-amber-400"></i>';
          badgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
        } else if (item.category === 'casino') {
          icon = '<i class="fa-solid fa-dice text-purple-400"></i>';
          badgeColor = 'bg-purple-500/10 text-purple-400 border-purple-500/20';
        } else if (item.category === 'blackmarket') {
          icon = '<i class="fa-solid fa-skull-crossbones text-rose-400"></i>';
          badgeColor = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
        } else if (item.category === 'banking') {
          icon = '<i class="fa-solid fa-building-columns text-teal-400"></i>';
          badgeColor = 'bg-teal-500/10 text-teal-400 border-teal-500/20';
        } else if (item.category === 'store') {
          icon = '<i class="fa-solid fa-bag-shopping text-cyan-400"></i>';
          badgeColor = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
        }

        const dateStr = item.timestamp ? new Date(item.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--';

        div.innerHTML = `
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
          </div>
        `;
        logFeed.appendChild(div);
      });
    }

    if (inspectLogsBtn && logModal) {
      inspectLogsBtn.addEventListener('click', async () => {
        if (!selectedPlayer) return;
        try {
          const pState = await AppDB.adminGetPlayer(selectedPlayer);
          selectedPlayerState = pState;
          document.getElementById('adm-log-modal-username').textContent = `@${selectedPlayer}`;
          document.getElementById('adm-log-stat-worth').textContent = `${(pState.netWorth || 0).toLocaleString()} EGP`;
          document.getElementById('adm-log-stat-cash').textContent = `${((pState.cash || 0) + (pState.bank || 0)).toLocaleString()} EGP`;
          document.getElementById('adm-log-stat-heat').textContent = `${pState.heatLevel || 0} / 5`;
          document.getElementById('adm-log-stat-jail').textContent = (pState.jailTimer > 0) ? `مسجون (${pState.jailTimer}ث)` : 'حر طليق';

          currentLogFilter = 'all';
          renderPlayerLogFeed(pState);
          logModal.classList.remove('hidden');
        } catch (e) {
          showToast('سجل النشاط', e.message, 'error');
        }
      });
    }

    // --- Comprehensive Forensic & Security Audit Engine ---
    function performAccountAudit(p) {
      const findings = [];
      let score = 100;

      const cash = Number(p.cash || 0);
      const bank = Number(p.bank || 0);
      const totalLiquid = cash + bank;
      const dirty = Number(p.dirtyCash || 0);
      const rep = Number(p.underworldRep || 0);
      const loan = Number(p.bankLoan || 0);
      const recordedWorth = Number(p.netWorth || 0);
      const xp = Number(p.xp || 0);
      const careerLevel = Number(p.careerLevel || 0);

      // 1. EXACT BUSINESS VALUE & CASHFLOW CALCULATION
      let totalBizValue = 0;
      let totalBizLevels = 0;
      let totalBizIncomePerSec = 0;
      let activeBizCount = 0;
      const bizData = p.businesses || {};

      const BIZ_DEFS = {
        coffee: { name: 'عربة قهوة مختصة', baseCost: 1500, baseIncome: 30 },
        supermarket: { name: 'سوبر ماركت', baseCost: 25000, baseIncome: 250 },
        tech: { name: 'شركة برمجيات', baseCost: 180000, baseIncome: 1200 },
        logistics: { name: 'شركة لوجستيات', baseCost: 850000, baseIncome: 4500 },
        solar_factory: { name: 'محطة طاقة شمسية', baseCost: 3500000, baseIncome: 18000 },
        private_hospital: { name: 'مستشفى خاص', baseCost: 15000000, baseIncome: 75000 },
        media_studio: { name: 'ستوديو إعلامي', baseCost: 65000000, baseIncome: 300000 },
        private_bank: { name: 'بنك استثماري', baseCost: 250000000, baseIncome: 1200000 },
        oil_refinery: { name: 'مصفاة بترول', baseCost: 1000000000, baseIncome: 4500000 },
        space_tech: { name: 'شركة استكشاف الفضاء', baseCost: 5000000000, baseIncome: 20000000 }
      };

      Object.keys(bizData).forEach(bKey => {
        const b = bizData[bKey];
        if (b && typeof b === 'object' && b.level > 0) {
          activeBizCount++;
          totalBizLevels += b.level;
          const def = BIZ_DEFS[bKey] || { name: bKey, baseCost: 50000, baseIncome: 500 };
          const estCost = def.baseCost * (1 + (b.level * (b.level + 1)) / 4);
          totalBizValue += estCost;
          const workers = Number(b.workers || 0);
          const income = def.baseIncome * b.level * (1 + workers * 0.1);
          totalBizIncomePerSec += income;
        }
      });

      const totalBizIncomePerMin = Math.floor(totalBizIncomePerSec * 60);

      // 2. ASSETS & PROPERTIES VALUE
      let totalAssetsValue = 0;
      const properties = p.properties || p.realEstate || {};
      const vehicles = p.vehicles || p.cars || {};
      const luxDefs = {
        bicycle: 500, scooter: 4000, sedan: 35000, luxury_suv: 120000, sports_car: 450000, supercar: 1800000, hypercar: 6000000, yacht: 25000000, private_jet: 120000000,
        studio_rent: 0, small_apartment: 45000, modern_flat: 150000, duplex_roof: 600000, suburban_villa: 2200000, luxury_mansion: 8500000, beach_palace: 35000000, private_island: 250000000
      };
      Object.keys(properties).forEach(k => { if (properties[k]) totalAssetsValue += (luxDefs[k] || 100000); });
      Object.keys(vehicles).forEach(k => { if (vehicles[k]) totalAssetsValue += (luxDefs[k] || 50000); });

      // 3. STOCKS PORTFOLIO VALUE
      let totalStocksValue = 0;
      let totalStocksCount = 0;
      const stocks = p.stocks || {};
      Object.keys(stocks).forEach(sym => {
        const s = stocks[sym];
        if (s && s.shares > 0) {
          totalStocksCount += s.shares;
          const price = Number(s.currentPrice || s.buyPrice || s.avgPrice || 100);
          totalStocksValue += s.shares * price;
        }
      });

      // 4. INVENTORY & STORE ITEMS
      let totalItemsValue = 0;
      const inv = p.inventory || p.storeItems || {};
      const itemDefs = {
        gold_pen: 5000, premium_lawyer: 25000, energy_drink: 1500, tax_shield: 100000, market_scanner: 50000, vip_casino_pass: 250000, quantum_cpu: 1000000, diamond_card: 5000000, cronos_gear: 25000000
      };
      Object.keys(inv).forEach(k => { if (inv[k]) totalItemsValue += (itemDefs[k] || 10000); });

      // 5. CALCULATED NET WORTH & VARIANCE
      const calculatedWorth = Math.max(0, Math.floor(totalLiquid + totalBizValue + totalAssetsValue + totalStocksValue + totalItemsValue - loan));
      const worthVariance = recordedWorth - calculatedWorth;
      const varianceAbs = Math.abs(worthVariance);
      const variancePct = calculatedWorth > 0 ? ((varianceAbs / calculatedWorth) * 100) : 0;

      // VECTOR 1: EXACT MATHEMATICAL NET WORTH AUDIT
      if (varianceAbs > 5000000 && variancePct > 20) {
        findings.push({
          vector: 'wealth',
          type: 'danger',
          badge: 'خطر تلاعب 🔴',
          title: 'فارق شاسع وغير مبرر في صافي الثروة (Net Worth Discrepancy)',
          metrics: `المسجل: ${recordedWorth.toLocaleString()} EGP | المحسوب فعلياً: ${calculatedWorth.toLocaleString()} EGP | الفارق: ${worthVariance > 0 ? '+' : ''}${worthVariance.toLocaleString()} EGP (${variancePct.toFixed(1)}%)`,
          desc: `يوجد فارق ضخم بنسبة (${variancePct.toFixed(1)}%) بين صافي الثروة المسجل وقيمة الأصول والسيولة الفعلية المحسوبة. يشير إلى حقن مباشر في متغير netWorth دون امتلاك أصول حقيقية.`,
          recommendation: 'استخدم زر "إعادة معايرة وضبط صافي الثروة" لمطابقة الثروة مع الأصول الفعلية.'
        });
        score -= 35;
      } else if (varianceAbs > 500000 && variancePct > 5) {
        findings.push({
          vector: 'wealth',
          type: 'warning',
          badge: 'تنبيه 🟡',
          title: 'فارق طفيف في معادلة صافي الثروة',
          metrics: `المسجل: ${recordedWorth.toLocaleString()} EGP | المحسوب: ${calculatedWorth.toLocaleString()} EGP | الفارق: ${worthVariance > 0 ? '+' : ''}${worthVariance.toLocaleString()} EGP`,
          desc: 'فارق ناتج عن تذبذب أسعار البورصة أو تأخر تحديث قيمة المشاريع التراكمية.',
          recommendation: 'يُفضل إجراء معايرة حسابية دورية لضمان الدقة.'
        });
        score -= 10;
      } else {
        findings.push({
          vector: 'wealth',
          type: 'success',
          badge: 'سليم 🟢',
          title: 'مطابقة صافي الثروة سليمة رياضياً 100%',
          metrics: `المسجل (${recordedWorth.toLocaleString()} EGP) مطابق للأصول والأرصدة المحسوبة (${calculatedWorth.toLocaleString()} EGP).`,
          desc: 'كافة الأصول والمشاريع والسيولة والأسهم متوافقة بالكامل مع معادلة صافي الثروة المعتمدة.',
          recommendation: 'الحساب سليم رياضياً ولا يتطلب أي تدخل.'
        });
      }

      // VECTOR 2: BUSINESS & CASHFLOW ANALYSIS
      if (totalLiquid > 50000000 && activeBizCount === 0 && careerLevel < 5) {
        findings.push({
          vector: 'businesses',
          type: 'danger',
          badge: 'خطر تلاعب 🔴',
          title: 'تضخم السيولة النقدية مع انعدام المشاريع والوظيفة',
          metrics: `السيولة: ${totalLiquid.toLocaleString()} EGP | المشاريع: 0 | الرتبة: ${careerLevel}`,
          desc: 'اللاعب يمتلك عشرات الملايين دون وجود أي ماكينة إنتاج نقدي (مشاريع تجارية أو وظيفة قيادية). شبهة قوية لحقن الكاش أو استلام تحويل غير شرعي.',
          recommendation: 'فحص سجل التحويلات الواردة لحساب هذا اللاعب.'
        });
        score -= 30;
      } else if (totalBizIncomePerMin > 0) {
        findings.push({
          vector: 'businesses',
          type: 'success',
          badge: 'سليم 🟢',
          title: 'إمبراطورية المشاريع والتدفق النقدي نشطة وقانونية',
          metrics: `${activeBizCount} مشروع نشط بمستوى إجمالي ${totalBizLevels} | الدخل: +${totalBizIncomePerMin.toLocaleString()} EGP/دقيقة`,
          desc: `تمتلك الحسابات مصادر إنتاج حقيقية تولد دخلاً تشغيلياً يبرر تراكم الثروة والسيولة.`,
          recommendation: 'المشاريع تعمل بانتظام دون شذوذ في معدلات الدخل.'
        });
      } else {
        findings.push({
          vector: 'businesses',
          type: 'warning',
          badge: 'تنبيه 🟡',
          title: 'حساب مبتدئ بدون مشاريع تجارية نشطة',
          metrics: `عدد المشاريع: 0 | الدخل التلقائي: 0 EGP/د`,
          desc: 'اللاعب لا يمتلك أي مشاريع تجارية حتى الآن ويعتمد فقط على الراتب والوظيفة.',
          recommendation: 'طبيعي للاعبين الجدد في بدايات اللعبة.'
        });
      }

      // VECTOR 3: STOCK MARKET TRADING & PORTFOLIO
      if (totalStocksValue > (recordedWorth * 1.5) && totalStocksValue > 10000000) {
        findings.push({
          vector: 'stocks',
          type: 'warning',
          badge: 'تنبيه 🟡',
          title: 'تضخم مفرط في محفظة الأسهم والبورصة',
          metrics: `قيمة محفظة الأسهم: ${totalStocksValue.toLocaleString()} EGP | إجمالي الأسهم: ${totalStocksCount.toLocaleString()} سهم`,
          desc: 'قيمة الأسهم المملوكة تتجاوز بشكل غير معتاد رأس مال الحساب المسجل.',
          recommendation: 'مراجعة صفقات البيع والشراء الأخيرة في البورصة.'
        });
        score -= 15;
      } else if (totalStocksCount > 0) {
        findings.push({
          vector: 'stocks',
          type: 'success',
          badge: 'سليم 🟢',
          title: 'محفظة تداول الأسهم متزنة وطبيعية',
          metrics: `إجمالي الأسهم: ${totalStocksCount.toLocaleString()} سهم بقيمة ${totalStocksValue.toLocaleString()} EGP عبر ${Object.keys(stocks).length} شركات`,
          desc: 'أحجام التداول وقيمة الأسهم المحتفظ بها تتناسب مع السيولة ورأس المال.',
          recommendation: 'لا توجد شبهات تداول وهمي أو تعديل كميات الأسهم.'
        });
      } else {
        findings.push({
          vector: 'stocks',
          type: 'success',
          badge: 'سليم 🟢',
          title: 'لا توجد تداولات أسهم مسجلة',
          metrics: 'محفظة البورصة فارغة حالياً',
          desc: 'اللاعب لم يقم بشراء أسهم في سوق البورصة.',
          recommendation: 'سليم تماماً.'
        });
      }

      // VECTOR 4: CAREER PROGRESSION & XP INTEGRITY
      const requiredXpPerLevel = [0, 50, 150, 400, 1000, 2500, 6000, 15000, 35000, 100000];
      const reqXp = requiredXpPerLevel[Math.min(careerLevel, requiredXpPerLevel.length - 1)] || 0;
      if (careerLevel >= 5 && xp < (reqXp * 0.4)) {
        findings.push({
          vector: 'career',
          type: 'danger',
          badge: 'خطر تلاعب 🔴',
          title: 'ترقية وظيفية غير شرعية وتجاوز متطلبات الخبرة',
          metrics: `الرتبة الحالية: ${careerLevel} | الخبرة: ${xp.toLocaleString()} XP (المطلوب نظامياً: ${reqXp.toLocaleString()} XP)`,
          desc: 'تم ترقية الرتبة الوظيفية دون جمع نقاط الخبرة والعمل الكافية. تلاعب مباشر بمتغير careerLevel.',
          recommendation: 'إعادة ضبط رتبة المسار الوظيفي لتتوافق مع نقاط الـ XP.'
        });
        score -= 25;
      } else {
        findings.push({
          vector: 'career',
          type: 'success',
          badge: 'سليم 🟢',
          title: 'المسار المهني ونقاط الخبرة متطابقة نظامياً',
          metrics: `الرتبة: ${careerLevel} | الخبرة: ${xp.toLocaleString()} XP | المسمى: ${p.title || 'عامل مبتدئ'}`,
          desc: 'الرتبة الوظيفية متوافقة بالكامل مع سجل الإنجاز وساعات العمل المنجزة.',
          recommendation: 'تكامل المسار المهني سليم 100%.'
        });
      }

      // VECTOR 5: UNDERWORLD, SMUGGLING & DIRTY CASH
      if (dirty > 10000000 && rep < 30) {
        findings.push({
          vector: 'underworld',
          type: 'danger',
          badge: 'خطر تلاعب 🔴',
          title: 'حقن كاش قذر وتضخم أموال السوق السوداء',
          metrics: `كاش قذر: ${dirty.toLocaleString()} EGP | سمعة السوق السوداء: ${rep} Rep`,
          desc: 'أموال تهريب مشبوهة تفوق 10 مليون بدون تنفيذ عمليات تهريب كافية لرفع السمعة.',
          recommendation: 'استخدم زر "تصفير الكاش القذر والـ Heat" لإزالة الأموال الملوثة.'
        });
        score -= 25;
      } else if (dirty > 0 || (p.heatLevel || 0) > 0) {
        findings.push({
          vector: 'underworld',
          type: 'warning',
          badge: 'تنبيه 🟡',
          title: 'نشاط في السوق السوداء ومستوى ملاحقة أمني',
          metrics: `كاش قذر: ${dirty.toLocaleString()} EGP | Heat: ${p.heatLevel || 0}/5 | حالة السجن: ${p.jailTimer > 0 ? 'مسجون' : 'حر طليق'}`,
          desc: 'اللاعب يمارس أنشطة تهريب طبيعية ولكن عليه رصيد كاش قذر ومستوى ملاحقة يتطلب غسيل أموال.',
          recommendation: 'مراقبة صفقات غسيل الأموال في الكازينو ومكاتب الصرافة.'
        });
        score -= 10;
      } else {
        findings.push({
          vector: 'underworld',
          type: 'success',
          badge: 'سليم 🟢',
          title: 'السجل الجنائي والأموال نظيفة بالكامل 100%',
          metrics: `كاش قذر: 0 EGP | Heat: 0/5 | السمعة: ${rep}`,
          desc: 'لا توجد أي أموال قذرة معلقة أو سجل ملاحقة شرطية نشط.',
          recommendation: 'الحساب نظيف وخالٍ من مخالفات السوق السوداء.'
        });
      }

      // VECTOR 6: CASINO & GAMBLING AUDIT
      const casinoStats = p.casinoStats || {};
      const casinoWins = Number(casinoStats.totalWon || 0);
      const casinoBets = Number(casinoStats.totalBets || 0);
      if (casinoWins > 50000000 && casinoBets < 10) {
        findings.push({
          vector: 'casino',
          type: 'danger',
          badge: 'خطر تلاعب 🔴',
          title: 'شبهة استغلال ثغرة الكازينو (Exploit / Win Streaks)',
          metrics: `أرباح الكازينو: ${casinoWins.toLocaleString()} EGP عبر ${casinoBets} مراهنة فقط`,
          desc: 'معدل أرباح كازينو مستحيل إحصائياً يشير إلى تلاعب بالنتائج المحلية أو ثغرة برمجية.',
          recommendation: 'خصم أرباح الكازينو غير المبررة.'
        });
        score -= 30;
      } else {
        findings.push({
          vector: 'casino',
          type: 'success',
          badge: 'سليم 🟢',
          title: 'إحصائيات الكازينو والمراهنات طبيعية',
          metrics: `إجمالي المراهنات: ${casinoBets} | إجمالي الأرباح: ${casinoWins.toLocaleString()} EGP`,
          desc: 'لا توجد أنماط فوز شاذة أو استخدام أدوات تكرار غير مصرح بها.',
          recommendation: 'نشاط الكازينو ضمن المعدلات الإحصائية المعتادة.'
        });
      }

      // VECTOR 7: BANKING, LOANS & CREDIT RISK
      const debtRatio = calculatedWorth > 0 ? ((loan / calculatedWorth) * 100) : 0;
      if (loan > 20000000 && totalLiquid > (loan * 3)) {
        findings.push({
          vector: 'loans',
          type: 'warning',
          badge: 'تنبيه 🟡',
          title: 'تجميد القروض البنكية والتهرب من السداد',
          metrics: `قرض بنكي معلق: ${loan.toLocaleString()} EGP | السيولة المتوفرة: ${totalLiquid.toLocaleString()} EGP`,
          desc: 'يمتلك اللاعب سيولة ضخمة كافية لسداد ديونه بالكامل ولم يقم بالسداد.',
          recommendation: 'خصم قيمة القرض تلقائياً من رصيد البنك.'
        });
        score -= 10;
      } else if (debtRatio > 80 && loan > 1000000) {
        findings.push({
          vector: 'loans',
          type: 'warning',
          badge: 'تنبيه 🟡',
          title: 'مخاطر تعثر مالي وارتفاع نسبة المديونية (High Leverage)',
          metrics: `نسبة الدين إلى الأصول: ${debtRatio.toFixed(1)}% | القرض: ${loan.toLocaleString()} EGP`,
          desc: 'الديون البنكية تبتلع معظم ثروة اللاعب مما يعرضه للإفلاس ومصادرة الأصول.',
          recommendation: 'فرض قيود ائتمانية على الحساب.'
        });
        score -= 15;
      } else {
        findings.push({
          vector: 'loans',
          type: 'success',
          badge: 'سليم 🟢',
          title: 'الجدارة الائتمانية وسجل القروض البنكية ممتاز',
          metrics: `القروض المعلقة: ${loan.toLocaleString()} EGP | نسبة الدين: ${debtRatio.toFixed(1)}%`,
          desc: 'سجل سداد القروض منتظم ولا توجد ديون معدومة أو مخاطر إفلاس.',
          recommendation: 'الحالة الائتمانية ممتازة.'
        });
      }

      // FINAL SCORE & CLASSIFICATION
      score = Math.max(0, Math.min(100, score));
      let status = 'آمن وموثوق 🟢';
      let badgeClass = 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';

      if (score < 40) {
        status = 'حساب مخترق / متلاعب به بشدة 🔴';
        badgeClass = 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
      } else if (score < 70) {
        status = 'شبهة اختلال مالي وشذوذ رقمي 🟠';
        badgeClass = 'bg-orange-500/20 text-orange-400 border border-orange-500/30';
      } else if (score < 90) {
        status = 'تحت الملاحظة وتدقيق دوري 🟡';
        badgeClass = 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
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
        const targetUser = (selectedPlayer || document.getElementById('admin-p-username')?.textContent || '').replace(/^@/, '').trim();
        if (!targetUser || targetUser === '...' || targetUser === '') {
          showToast('فحص الأمان', 'يرجى تحديد واختيار لاعب أولاً.', 'warning');
          return;
        }
        try {
          fraudCheckBtn.disabled = true;
          const pState = await AppDB.adminGetPlayer(targetUser);
          if (!pState) throw new Error("تعذر جلب بيانات اللاعب.");

          const report = performAccountAudit(pState);

          document.getElementById('audit-target-username').textContent = `@${targetUser}`;
          
          const safetyBadge = document.getElementById('audit-safety-badge');
          if (safetyBadge) {
            safetyBadge.textContent = `${report.status} (درجة النزاهة: ${report.score}%)`;
            safetyBadge.className = `px-2.5 py-1 rounded-lg font-bold text-xs ${report.badgeClass}`;
          }

          const reportBody = document.getElementById('audit-report-body');
          if (reportBody) {
            reportBody.innerHTML = report.findings.map(f => {
              let icon = '🟢';
              let color = 'text-emerald-400';
              let bg = 'bg-emerald-950/20 border-emerald-500/20';
              if (f.type === 'warning') {
                icon = '🟡';
                color = 'text-yellow-400';
                bg = 'bg-yellow-950/20 border-yellow-500/20';
              } else if (f.type === 'danger') {
                icon = '🔴';
                color = 'text-rose-400';
                bg = 'bg-rose-950/30 border-rose-500/30';
              }
              return `<div class="p-3 rounded-xl border ${bg} space-y-1">
                <div class="flex items-center gap-1.5 font-bold ${color}">
                  <span>${icon}</span>
                  <span>${f.title}</span>
                </div>
                <p class="text-[11px] text-slate-300 leading-relaxed">${f.desc}</p>
              </div>`;
            }).join('');
          }

          auditModal.classList.remove('hidden');

        } catch (e) {
          showToast('خطأ فحص الأمان', e.message, 'error');
        } finally {
          fraudCheckBtn.disabled = false;
        }
      });
    }

    const hideAuditModal = () => {
      if (typeof playCasinoSound === 'function') playCasinoSound('click');
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
          b.className = 'btn-log-filter px-3 py-1 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-lg font-bold transition';
        });
        btn.className = 'btn-log-filter px-3 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-lg font-bold transition';
        currentLogFilter = btn.getAttribute('data-log-filter') || 'all';
        if (selectedPlayerState) renderPlayerLogFeed(selectedPlayerState);
      });
    });

    // ─────────────────────────────────────────────
    //  MODULE: MARKET CONTROL & DIRECT PRICING
    // ─────────────────────────────────────────────
    function renderAdminStockPrices() {
      const symbols = ['COMI', 'EAST', 'ETEL', 'FWRY', 'CASH', 'BITC', 'GOLD', 'AIX'];
      symbols.forEach(sym => {
        const priceEl = document.getElementById(`adm-stock-price-${sym}`);
        if (priceEl && GameEngine.stockPrices[sym]) {
          const p = GameEngine.stockPrices[sym][GameEngine.stockPrices[sym].length - 1];
          priceEl.textContent = `${p.toLocaleString()} EGP`;
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

        let rawTitle = (titleInput ? titleInput.value.trim() : '');
        const targetSymbol = symbolSelect ? symbolSelect.value : 'ALL';
        const direction = directionSelect ? directionSelect.value : 'up';
        const pctVal = pctInput ? Math.max(1, Math.min(500, parseFloat(pctInput.value) || 25)) : 25;
        const multiplier = direction === 'up' ? (1 + pctVal / 100) : Math.max(0.05, 1 - pctVal / 100);
        const isUp = direction === 'up';

        // Auto-generate title if empty
        if (!rawTitle) {
          if (targetSymbol === 'ALL') {
            rawTitle = isUp
              ? `انتعاش عام وموجة صعود قياسية لكافة الأسهم (+${pctVal}%)`
              : `تصحيح هبوطي وموجة بيع وضغط على كافة الأسهم (-${pctVal}%)`;
          } else {
            const stockName = GameEngine.STOCKS[targetSymbol]?.name || targetSymbol;
            rawTitle = isUp
              ? `أرباح قياسية وإقبال استثماري يرفع سهم ${stockName} (+${pctVal}%)`
              : `ضغوط بيعية وتراجع في أداء سهم ${stockName} (-${pctVal}%)`;
          }
        }
        const icon = isUp ? '📈' : '📉';
        const formattedTicker = `${icon} عاجل من البورصة: ${rawTitle}`;

        const targets = {};
        if (targetSymbol === 'ALL') {
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
              logAdminAction(`إطلاق خبر بورصة مخصص: "${rawTitle}" [${targetSymbol} | ${isUp ? '+' : '-'}${pctVal}%]`);
            }).catch(() => { });
          } catch (e) { }
        } else {
          showToast('إطلاق الخبر', 'يجب الاتصال بقاعدة البيانات لنشر أحداث البورصة.', 'error');
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
            title: 'صناديق استثمارية سيادية تبدأ الشراء المباشر للبيتكوين!',
            symbol: 'BITC',
            dir: 'up',
            pct: 50
          },
          gold_rally: {
            title: 'إقبال استثماري عالمي للتحوط بسبائك الذهب عيار 24!',
            symbol: 'GOLD',
            dir: 'up',
            pct: 35
          },
          tech_boom: {
            title: 'إطلاق نموذج ذكاء اصطناعي خارق يحقق أرباحاً قياسية لشركات التقنية!',
            symbol: 'AIX',
            dir: 'up',
            pct: 35
          },
          cbe_rate_hike: {
            title: 'البنك المركزي يرفع الفائدة 200 نقطة لدعم القطاع المصرفي!',
            symbol: 'COMI',
            dir: 'up',
            pct: 30
          },
          telecom_expansion: {
            title: 'المصرية للاتصالات تفوز بعقد حصري لتمرير كابلات البيانات البحرية ورخصة 5G!',
            symbol: 'ETEL',
            dir: 'up',
            pct: 35
          },
          tobacco_monopoly: {
            title: 'توقيع عقد تصدير احتكاري ضخم لمنتجات الشرقية للدخان بالشرق الأوسط!',
            symbol: 'EAST',
            dir: 'up',
            pct: 40
          },
          rate_cut_rally: {
            title: 'البنك المركزي يخفض الفائدة لدعم حركة التجارة وصعود كافة الأسهم!',
            symbol: 'ALL',
            dir: 'up',
            pct: 25
          },
          crypto_crash: {
            title: 'حظر تداول العملات المشفرة في بعض البنوك المركزية يضغط على البيتكوين!',
            symbol: 'BITC',
            dir: 'down',
            pct: 35
          },
          tech_hack_scandal: {
            title: 'تسريب وتوقف خدمات الدفع الإلكتروني يتسبب بموجة بيع على سهم فوري!',
            symbol: 'FWRY',
            dir: 'down',
            pct: 30
          },
          oil_scandal: {
            title: 'تأخر شحنات المواد الخام يؤدي لضغوط بيعية على سهم الشرقية للدخان!',
            symbol: 'EAST',
            dir: 'down',
            pct: 25
          },
          market_crash: {
            title: 'موجة بيع جني أرباح مكثفة تهبط بأسهم البورصة وتصحيح هبوطي عام!',
            symbol: 'ALL',
            dir: 'down',
            pct: 20
          }
        };

        const tpl = presetTemplates[val];
        if (tpl) {
          if (titleInput) titleInput.value = tpl.title;
          if (symbolSelect) symbolSelect.value = tpl.symbol;
          if (directionSelect) directionSelect.value = tpl.dir;
          if (pctInput) pctInput.value = tpl.pct;
          showToast('نموذج جاهز', `تم اختيار نموذج "${tpl.title.substring(0, 28)}..." وتعبئة الحقول.`, 'info');
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
          showToast('تعديل السهم', 'يرجى إدخال سعر صحيح أكبر من صفر.', 'error');
          return;
        }

        if (AppDB.isFirebaseReady) {
          firebase.firestore().collection('globals').doc('market_event').set({
            title: `تدخل إداري مباشر: تم تعديل سعر سهم (${sym}) إلى ${newPrice.toLocaleString()} ج.م`,
            desc: `تم تعديل سعر سهم (${sym}) إلى ${newPrice.toLocaleString()} ج.م`,
            targetSymbol: sym,
            directPrice: newPrice,
            timestamp: Date.now()
          }).then(() => {
            inp.value = '';
            logAdminAction(`تعديل مباشر لسعر سهم ${sym} -> ${newPrice.toLocaleString()} EGP`);
          }).catch(err => showToast('خطأ في الاتصال', err.message, 'error'));
        } else {
          showToast('تعديل السعر', 'يجب الاتصال بقاعدة البيانات لتعديل أسعار الأسهم.', 'error');
        }
      });
    });

    // Reset Market to Baseline
    const resetMarketBaselineBtn = document.getElementById('btn-admin-reset-market-baseline');
    if (resetMarketBaselineBtn) {
      resetMarketBaselineBtn.addEventListener('click', () => {
        if (AppDB.isFirebaseReady) {
          firebase.firestore().collection('globals').doc('market_event').set({
            title: 'إعادة ضبط البورصة',
            desc: 'تم إعادة أسعار جميع الأسهم إلى القيمة الأساسية.',
            resetBaseline: true,
            timestamp: Date.now()
          }).then(() => {
            logAdminAction('إعادة ضبط أسعار كافة الأسهم في البورصة للقيمة الأساسية');
          }).catch(err => showToast('خطأ في الاتصال', err.message, 'error'));
        } else {
          showToast('إعادة ضبط البورصة', 'يجب الاتصال بقاعدة البيانات لإعادة ضبط البورصة.', 'error');
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
            title: '🚀 طفرة تقنية وانتعاش الذكاء الاصطناعي',
            desc: 'ارتفعت أرباح قطاع التكنولوجيا وأسهم AIX و FWRY و CASH نتيجة استثمارات قياسية!',
            targetStocks: ['AIX', 'FWRY', 'CASH'],
            multiplier: 1.35,
            toastType: 'success'
          },
          crypto_frenzy: {
            title: '🚀 صعود تاريخي وانفجار سعر البيتكوين',
            desc: 'صناديق استثمارية سيادية عملاقة تبدأ في الشراء المباشر للبيتكوين (+50%)!',
            targetStocks: ['BITC'],
            multiplier: 1.50,
            toastType: 'success'
          },
          gold_rally: {
            title: '🥇 إقبال قياسي وطفرة في أسعار الذهب',
            desc: 'توترات اقتصادية عالمية تدفع المستثمرين للتحوط بسبائك الذهب 24k (+35%)!',
            targetStocks: ['GOLD'],
            multiplier: 1.35,
            toastType: 'success'
          },
          cbe_rate_hike: {
            title: '🏛️ قرار المركزي: رفع الفائدة 200 نقطة',
            desc: 'البنك المركزي يرفع الفائدة! ارتفاع قوي لسهم CIB وانتكاسة خفيفة باقي الأسهم.',
            targetStocks: ['COMI'],
            multiplier: 1.30,
            negativeTargets: ['EAST', 'FWRY'],
            negativeMultiplier: 0.88,
            toastType: 'warning'
          },
          telecom_expansion: {
            title: '📶 رخصة 5G للمصرية للاتصالات',
            desc: 'حصول المصرية للاتصالات على رخصة الجيل الخامس وتوسعة الكابلات البحرية (+35%)!',
            targetStocks: ['ETEL'],
            multiplier: 1.35,
            toastType: 'success'
          },
          tobacco_monopoly: {
            title: '🚬 اتفاقية احتكار وتصدير للشرقية للدخان',
            desc: 'توقع عقد احتكاري ضخم لتصدير المنتجات للشرق الأوسط يطير بالسهم فوق 40%!',
            targetStocks: ['EAST'],
            multiplier: 1.40,
            toastType: 'success'
          },
          crypto_crash: {
            title: '📉 ضغوط تنظيمية وهبوط حاد للبيتكوين',
            desc: 'حظر تداول العملات المشفرة في بعض البنوك المركزية يضغط على البيتكوين (-35%)!',
            targetStocks: ['BITC'],
            multiplier: 0.65,
            toastType: 'error'
          },
          tech_hack_scandal: {
            title: '⚠️ ثغرة وأزمة حماية لشركة فوري',
            desc: 'تسريب وتوقف خدمات الدفع الإلكتروني يتسبب بموجة بيع مكثفة ومخاوف استثمارية!',
            targetStocks: ['FWRY'],
            multiplier: 0.70,
            toastType: 'error'
          },
          rate_cut_rally: {
            title: '📈 خفض الفائدة وانتعاش حركة الاستثمار',
            desc: 'البنك المركزي يخفض الفائدة لدعم حركة التجارة والإنتاج! صعود متزامن لكل الأسهم (+25%).',
            targetStocks: ['COMI', 'FWRY', 'CASH', 'EAST', 'ETEL', 'BITC', 'GOLD', 'AIX'],
            multiplier: 1.25,
            toastType: 'success'
          },
          oil_scandal: {
            title: '🚢 أزمة سلاسل الإمداد والشحن',
            desc: 'تأخر شحنات التبغ والمواد الخام يؤدي لربكة ومبيعات مكثفة على سهم الشرقية للدخان!',
            targetStocks: ['EAST'],
            multiplier: 0.75,
            toastType: 'error'
          },
          market_crash: {
            title: '💥 ذعر اقتصادي وتصحيح هابط للبورصة',
            desc: 'موجة بيع جني أرباح مكثفة تهبط بجميع أسهم البورصة وتصحيح هبوطي عام (-20%)!',
            targetStocks: ['COMI', 'FWRY', 'CASH', 'EAST', 'ETEL', 'BITC', 'GOLD', 'AIX'],
            multiplier: 0.80,
            toastType: 'error'
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
          }).catch(err => showToast('خطأ في الاتصال', err.message, 'error'));
        } else {
          showToast('افتعال الحدث', 'يجب الاتصال بقاعدة البيانات لفرض الأحداث.', 'error');
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
          showToast('بث الإدارة', 'يرجى كتابة نص الرسالة أولاً.', 'error');
          return;
        }
        try {
          await AppDB.sendBroadcast(msg);
          showToast('نجاح البث', 'تم إرسال البث لجميع المشتركين بنجاح.', 'success');
          document.getElementById('admin-broadcast-msg').value = '';
          logAdminAction(`إرسال إشعار عام: "${msg}"`);
        } catch (err) {
          showToast('فشل البث', err.message, 'error');
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
        const target = (document.getElementById('admin-airdrop-target')?.value || 'ALL').trim();

        if (isNaN(amount) || amount <= 0) {
          showToast('مكافأة الإدارة', 'يرجى إدخال مبلغ صحيح أكبر من صفر.', 'error');
          return;
        }
        try {
          await AppDB.sendAirdrop(amount, target);
          showToast('نجاح التوزيع', `تم توزيع المكافأة (+${amount.toLocaleString()} EGP) للمستهدفين (${target}) بنجاح.`, 'success');
          document.getElementById('admin-airdrop-amount').value = '';
          logAdminAction(`توزيع مكافأة مالية: +${amount.toLocaleString()} EGP -> ${target}`);
        } catch (err) {
          showToast('فشل التوزيع', err.message, 'error');
        }
      });
    }

    // ─────────────────────────────────────────────
    //  MODULE: SYSTEM & DANGER ZONE
    // ─────────────────────────────────────────────
    const maintToggleBtn = document.getElementById('btn-admin-toggle-maintenance');
    if (maintToggleBtn && !maintToggleBtn.dataset.bound) {
      maintToggleBtn.dataset.bound = 'true';
      AppDB.getMaintenanceStatus().then(st => {
        updateMaintenanceUIState(st && st.enabled);
      });

      maintToggleBtn.addEventListener('click', async () => {
        const currentSt = await AppDB.getMaintenanceStatus();
        const nextState = !Boolean(currentSt && currentSt.enabled);

        const confirmMsg = nextState
          ? "هل أنت متأكد من رغبتك في إغلاق اللعبة وتفعيل وضع الصيانة لجميع اللاعبين؟"
          : "هل تريد إنهاء وضع الصيانة وإتاحة اللعبة للجميع مجدداً؟";

        if (!confirm(confirmMsg)) return;

        try {
          await AppDB.setMaintenanceMode(nextState);
          updateMaintenanceUIState(nextState);
          if (nextState) {
            showToast('وضع الصيانة نشط', 'تم إغلاق الخوادم وتفعيل وضع الصيانة.', 'warning');
            logAdminAction('تفعيل وضع الصيانة الشامل وإغلاق الخوادم');
          } else {
            showToast('إنهاء الصيانة', 'تم إنهاء وضع الصيانة وفتح الخوادم للجميع.', 'success');
            logAdminAction('إلغاء وضع الصيانة وإعادة فتح الخوادم');
          }
        } catch (err) {
          showToast('فشل وضع الصيانة', err.message, 'error');
        }
      });
    }

    // RESET ALL PLAYERS' ECONOMY
    const resetAllEconomyBtn = document.getElementById('btn-admin-reset-all-economy');
    if (resetAllEconomyBtn) {
      resetAllEconomyBtn.addEventListener('click', async () => {
        const confirmMsg = "⚠️ تحذير خطير: هل أنت متأكد من تصفير أرصدة وممتلكات المنظومة لكافة اللاعبين المسجلين؟\nسيتم تصفير كاش وبنك وأصول وأسهم وشركات ومخزون كافة الحسابات بالكامل مع الإبقاء على الحسابات وأرقامها السرية.";
        if (!confirm(confirmMsg)) return;

        try {
          const count = await AppDB.adminResetAllPlayers();

          if (GameEngine.activeUsername) {
            applyCompleteZeroStateToGameEngine(GameEngine.activeUsername);
            renderAll();
          }

          showToast('تصفير أرصدة المنظومة', `تم تصفير حسابات وأرصدة ${count} لاعب في المنظومة بالكامل بنجاح.`, 'success');
          logAdminAction(`تصفير شامل لأرصدة المنظومة — تم تصفير ${count} حساب لاعب بالكامل`);
          loadAdminPlayersDirectory(false);
          renderAdminAnalyticsDashboard();
        } catch (err) {
          showToast('خطأ تصفير المنظومة', err.message, 'error');
        }
      });
    }

    // WIPE ALL PLAYERS DATA (FULL DATABASE WIPE)
    const wipeLeaderboardBtn = document.getElementById('btn-admin-wipe-leaderboard');
    if (wipeLeaderboardBtn) {
      wipeLeaderboardBtn.addEventListener('click', async () => {
        const confirmMsg = "⚠️ تحذير نهائي وقاطع: هل أنت متأكد من حذف كافة حسابات اللاعبين نهائياً من قاعدة البيانات عدا حساب الأدمن الرئيسي؟\nهذا الإجراء لا يمكن التراجع عنه!";
        if (!confirm(confirmMsg)) return;

        try {
          const count = await AppDB.adminWipeLeaderboard();
          showToast('مسح الحسابات', `تم حذف ${count} حساب لاعب نهائياً ومسح قائمة المتصدرين.`, 'success');
          logAdminAction(`مسح وتطهير شامل لقاعدة البيانات — تم حذف ${count} حساب`);
          loadAdminPlayersDirectory(false);
          renderAll();
        } catch (err) {
          showToast('خطأ مسح الحسابات', err.message, 'error');
        }
      });
    }

    // REBUILD CENTRALIZED LEADERBOARD (UNIFY TOP 25 WORLDWIDE)
    const rebuildLeaderboardBtn = document.getElementById('btn-admin-rebuild-leaderboard');
    if (rebuildLeaderboardBtn) {
      rebuildLeaderboardBtn.addEventListener('click', async () => {
        try {
          rebuildLeaderboardBtn.disabled = true;
          rebuildLeaderboardBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الفرز والمزامنة...';
          const topList = await AppDB.adminRebuildLeaderboard();
          showToast('توحيد المتصدرين', `تم فرز وتوحيد ليدربورد الأثرياء بنجاح (${topList.length} لاعب في القمة). سيظهر نفس الترتيب لجميع اللاعبين فوراً!`, 'success');
          logAdminAction(`إعادة فرز وتوحيد ليدربورد المتصدرين سحابياً (${topList.length} لاعب)`);
        } catch (err) {
          showToast('خطأ المزامنة', err.message, 'error');
        } finally {
          rebuildLeaderboardBtn.disabled = false;
          rebuildLeaderboardBtn.innerHTML = '<i class="fa-solid fa-crown"></i> <span>فرز وتوحيد عرش الأثرياء الآن</span>';
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
          showToast('تفريغ السجل', `تم مسح ${count} حركة تحويل مالي من السجل.`, 'success');
          logAdminAction(`تفريغ وتنظيف سجل التحويلات المالية (${count} عملية)`);
          renderAdminTransfersMonitor();
        } catch (err) {
          showToast('خطأ تفريغ السجل', err.message, 'error');
        }
      });
    }

    // Refresh Transfers Audit Button
    const refreshTransfersBtn = document.getElementById('btn-admin-refresh-transfers');
    if (refreshTransfersBtn) {
      refreshTransfersBtn.addEventListener('click', () => {
        renderAdminTransfersMonitor();
        showToast('تحديث التحويلات', 'تم جلب أحدث سجلات التحويلات المالية.', 'success');
      });
    }

    // Refresh Stats Button
    const refreshStatsBtn = document.getElementById('btn-admin-refresh-stats');
    if (refreshStatsBtn) {
      refreshStatsBtn.addEventListener('click', () => {
        renderAdminAnalyticsDashboard();
        showToast('تحديث الإحصائيات', 'تم تحديث لوحة الإحصائيات الحية بنجاح.', 'success');
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
      ['adm-tax-multiplier', 'adm-tax-multiplier-mkt'].forEach(id => {
        const el = document.getElementById(id);
        if (el && document.activeElement !== el) el.value = cfg.rateMultiplier;
      });
      ['adm-tax-silver', 'adm-tax-silver-mkt'].forEach(id => {
        const el = document.getElementById(id);
        if (el && document.activeElement !== el) el.value = cfg.silverRate;
      });
      ['adm-tax-major', 'adm-tax-major-mkt'].forEach(id => {
        const el = document.getElementById(id);
        if (el && document.activeElement !== el) el.value = cfg.majorRate;
      });
      ['adm-tax-whale', 'adm-tax-whale-mkt'].forEach(id => {
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
        showToast('خطأ إدخال', 'يرجى التأكد من إدخال قيم صحيحة للضرائب وموجبة.', 'error');
        return;
      }

      try {
        if (btnEl) {
          btnEl.disabled = true;
          btnEl.textContent = 'جاري الحفظ والتعميم...';
        }

        const cfg = { rateMultiplier, silverRate, majorRate, whaleRate };
        await AppDB.adminSaveTaxConfig(cfg);
        syncTaxInputs(cfg);

        showToast('تم الحفظ', 'تم تحديث ونشر السياسة الضريبية الجديدة لجميع اللاعبين بنجاح.', 'success');
        logAdminAction(`تعديل الضرائب: مضاعف ${rateMultiplier}x | فضية ${silverRate} | كبار ${majorRate} | حيتان ${whaleRate}`);
      } catch (err) {
        showToast('فشل حفظ الضرائب', err.message, 'error');
      } finally {
        if (btnEl) {
          btnEl.disabled = false;
          btnEl.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> <span>تحديث السياسة الضريبية فوراً</span>';
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
          showToast('خطأ إعدادات', 'يرجى إدخال قيم صحيحة وموجبة للسعر والمدة.', 'error');
          return;
        }

        try {
          saveItemConfigBtn.disabled = true;
          saveItemConfigBtn.textContent = 'جاري حفظ التعديلات...';

          await AppDB.adminSaveItemConfig(itemId, cost, durationSec);

          await GameEngine.syncItemsConfig();

          showToast('تحديث الإعدادات', `تم حفظ وتعميم إعدادات الأداة بنجاح! السعر: ${cost.toLocaleString()} ج.م، المدة: ${durationSec} ثانية.`, 'success');
          logAdminAction(`تحديث إعدادات الأداة (${itemId}): سعر ${cost.toLocaleString()} ج.م، مدة ${durationSec}ث`);
          renderAll();
        } catch (err) {
          showToast('فشل حفظ الإعدادات', err.message, 'error');
        } finally {
          saveItemConfigBtn.disabled = false;
          saveItemConfigBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> <span>حفظ وتعميم إعدادات الأداة فوراً</span>';
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
          showToast('خطأ إعدادات', 'يرجى إدخال قيم صحيحة وموجبة للاسم، السعر، والكمية.', 'error');
          return;
        }

        try {
          btnCreateAuction.disabled = true;
          btnCreateAuction.textContent = 'جاري نشر المزاد...';

          await AppDB.adminCreateAuctionItem(name, desc, price, qty);

          showToast('تم النشر', `تم طرح الغرض "${name}" بنجاح في صفحة المزادات.`, 'success');
          logAdminAction(`طرح غرض في المزاد: ${name} (سعر ${price.toLocaleString()} ج.م، كمية ${qty})`);

          // Clear inputs
          document.getElementById('admin-auction-name').value = '';
          document.getElementById('admin-auction-desc').value = '';
          document.getElementById('admin-auction-price').value = '';
          document.getElementById('admin-auction-qty').value = '';

          // Re-render
          fetchAndRenderAdminAuctions();
        } catch (err) {
          showToast('فشل إنشاء المزاد', err.message, 'error');
        } finally {
          btnCreateAuction.disabled = false;
          btnCreateAuction.innerHTML = '<i class="fa-solid fa-plus"></i> <span>طرح الغرض للبيع فوراً في المزادات</span>';
        }
      });
    }

    // Admin Gift Codes Select Change Listener
    const giftRewardTypeSelect = document.getElementById('admin-gift-reward-type');
    if (giftRewardTypeSelect) {
      giftRewardTypeSelect.addEventListener('change', () => {
        const type = giftRewardTypeSelect.value;
        document.getElementById('admin-gift-box-cash').classList.toggle('hidden', type !== 'cash');
        document.getElementById('admin-gift-box-business').classList.toggle('hidden', type !== 'business');
        document.getElementById('admin-gift-box-item').classList.toggle('hidden', type !== 'item');
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
          showToast('خطأ إدخال', 'يرجى إدخال رمز كود الهدية.', 'error');
          return;
        }

        const details = {};
        if (type === 'cash') {
          const amt = Number(document.getElementById('admin-gift-cash-amount').value);
          if (isNaN(amt) || amt <= 0) {
            showToast('خطأ إدخال', 'يرجى إدخال مبلغ مالي صحيح وموجب.', 'error');
            return;
          }
          details.amount = amt;
        } else if (type === 'business') {
          const bId = document.getElementById('admin-gift-business-id').value;
          const lvl = Number(document.getElementById('admin-gift-business-lvl').value);
          const workers = Number(document.getElementById('admin-gift-business-workers').value);
          if (isNaN(lvl) || lvl <= 0 || isNaN(workers) || workers < 0) {
            showToast('خطأ إدخال', 'يرجى إدخال مستوى وعدد عمال صحيحين.', 'error');
            return;
          }
          details.businessId = bId;
          details.level = lvl;
          details.workers = workers;
        } else if (type === 'item') {
          const itemId = document.getElementById('admin-gift-item-id').value;
          details.itemId = itemId;
        }

        try {
          btnCreateGiftCode.disabled = true;
          btnCreateGiftCode.textContent = 'جاري توليد الكود...';

          await AppDB.adminCreateGiftCode(code, type, details, maxUses);

          showToast('تم إنشاء الكود', `تم نشر كود الهدية "${code.toUpperCase()}" بنجاح في المنظومة.`, 'success');
          logAdminAction(`إنشاء كود الهدية: ${code.toUpperCase()} (النوع: ${type})`);

          // Clear inputs
          document.getElementById('admin-gift-code').value = '';
          document.getElementById('admin-gift-max-uses').value = '0';
          document.getElementById('admin-gift-cash-amount').value = '';

          fetchAndRenderAdminGiftCodes();
        } catch (err) {
          showToast('فشل الإنشاء', err.message, 'error');
        } finally {
          btnCreateGiftCode.disabled = false;
          btnCreateGiftCode.innerHTML = '<i class="fa-solid fa-plus"></i> <span>توليد ونشر كود الهدية فوراً</span>';
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
        let badgeHtml = '';
        if (stats.isFromCache || stats.quotaExceeded) {
          badgeHtml = ` <span class="text-[10px] px-1.5 py-0.5 rounded font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30" title="تم قراءة بعض البيانات من الكاش المحلي نظراً لبلوغ سقف كوتة Firebase المجانية">كاش 🟡</span>`;
        } else {
          badgeHtml = ` <span class="text-[10px] px-1.5 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" title="بيانات حية مباشرة من السيرفر السحابي">حي 🟢</span>`;
        }
        elP.innerHTML = `${(stats.totalPlayers || 0).toLocaleString()}${badgeHtml}`;
      }
      if (elC) elC.textContent = `${(stats.totalCash || 0).toLocaleString()} EGP`;
      if (elB) elB.textContent = `${(stats.totalBank || 0).toLocaleString()} EGP`;
      if (elNW) elNW.textContent = `${(stats.totalNetWorth || 0).toLocaleString()} EGP`;
      if (elJ) elJ.textContent = (stats.jailedCount || 0).toLocaleString();
      if (elBan) elBan.textContent = (stats.bannedCount || 0).toLocaleString();

      // Show Quota Notice Banner if quota is exceeded
      let quotaBanner = document.getElementById('adm-ui-quota-notice-banner');
      const statsContainer = document.getElementById('admin-subpanel-stats');
      if (stats.quotaExceeded) {
        if (!quotaBanner && statsContainer) {
          quotaBanner = document.createElement('div');
          quotaBanner.id = 'adm-ui-quota-notice-banner';
          quotaBanner.className = 'p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-start gap-2.5 shadow-lg';
          quotaBanner.innerHTML = `
            <i class="fa-solid fa-triangle-exclamation text-amber-400 text-sm mt-0.5 shrink-0"></i>
            <div>
              <strong class="block font-bold text-amber-300 mb-0.5">تنبيه سقف كوتة القراءات السحابية (Firebase Quota 429)</strong>
              <span class="text-[11px] text-amber-300/80 leading-relaxed">
                مشروع Firebase استنفد الحد الأقصى اليومي للقراءات المجانية (Resource Exhausted). الإحصائيات معروضة استناداً إلى العدادات التراكمية والكاش المحلي، وستعود المزامنة السحابية الكاملة للعمل تلقائياً فور تجدد الكوتة اليومية من Google.
              </span>
            </div>
          `;
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

        wealthDistContainer.innerHTML = `
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
          </div>
        `;
      }

      // 2. Render Top 5 Richest comparison
      const topRichestContainer = document.getElementById('adm-top-richest-container');
      if (topRichestContainer && stats.topRichest) {
        const top5 = stats.topRichest;
        const maxWorth = top5.length > 0 ? (top5[0].netWorth || 1) : 1;

        topRichestContainer.innerHTML = '';
        if (top5.length === 0) {
          topRichestContainer.innerHTML = '<div class="text-[11px] text-slate-500 text-center py-4">لا توجد بيانات متاحة حالياً.</div>';
        } else {
          top5.forEach((p, idx) => {
            const widthPct = Math.max(8, Math.min(100, (p.netWorth / maxWorth) * 100));
            const bar = document.createElement('div');
            bar.className = 'space-y-1';
            bar.innerHTML = `
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
              </div>
            `;
            topRichestContainer.appendChild(bar);
          });
        }
      }

      // 3. Render Suspicious Accounts
      const suspiciousTbody = document.getElementById('adm-suspicious-accounts-tbody');
      if (suspiciousTbody) {
        const suspects = stats.suspiciousPlayers || [];
        suspiciousTbody.innerHTML = '';

        if (suspects.length === 0) {
          suspiciousTbody.innerHTML = `
            <tr>
              <td colspan="5" class="py-6 text-center text-slate-500">لا توجد حسابات مشبوهة مرصودة حالياً. السيرفر آمن تماماً!</td>
            </tr>
          `;
        } else {
          suspects.forEach(p => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-slate-900 border-b border-slate-800/40 transition duration-150';
            tr.innerHTML = `
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
              </td>
            `;
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
    tbody.innerHTML = '<tr><td colspan="5" class="py-4 text-center text-slate-400">جاري تحميل سجل التحويلات...</td></tr>';

    try {
      const transfers = await AppDB.adminGetTransfers();
      if (!transfers || transfers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="py-6 text-center text-slate-500">لا يوجد عمليات تحويل مالية مسجلة حالياً.</td></tr>';
        return;
      }

      tbody.innerHTML = '';
      transfers.forEach(trf => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-850 transition';
        const dateStr = new Date(trf.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        tr.innerHTML = `
          <td class="p-2.5 font-bold text-white">${trf.sender}</td>
          <td class="p-2.5 font-bold text-yellow-400">${trf.recipient}</td>
          <td class="p-2.5 text-center numbers-font font-bold text-emerald-400">+${(trf.amount || 0).toLocaleString()} EGP</td>
          <td class="p-2.5 text-center numbers-font text-slate-400 text-[11px]">${dateStr}</td>
          <td class="p-2.5 text-left"><span class="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-bold text-[10px]">${trf.status || 'مكتملة'}</span></td>
        `;
        tbody.appendChild(tr);
      });
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="5" class="py-4 text-center text-rose-400">فشل تحميل سجل التحويلات: ${e.message}</td></tr>`;
    }
  }

  let adminCorpsUnsubscribe = null;

  function renderAdminCorporationsPanel() {
    const tbody = document.getElementById('admin-corporations-list');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="6" class="py-4 text-center text-slate-500">جاري تحميل الشركات...</td></tr>';

    if (adminCorpsUnsubscribe) {
      adminCorpsUnsubscribe();
      adminCorpsUnsubscribe = null;
    }

    adminCorpsUnsubscribe = AppDB.listenToCorporations(corps => {
      tbody.innerHTML = '';
      if (!corps || corps.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="py-4 text-center text-slate-500">لا توجد شركات مشتركة مسجلة حالياً.</td></tr>';
        return;
      }

      corps.forEach(corp => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-850 transition border-b border-slate-800/40';

        const projKeys = Object.keys(corp.projects || {}).filter(k => corp.projects[k] === true);
        const projNames = projKeys.map(k => {
          const p = GameEngine.CORP_PROJECTS[k];
          return p ? p.name : k;
        }).join('، ') || 'لا توجد مشاريع';

        tr.innerHTML = `
          <td class="p-2.5 font-bold text-white">
            <div>${corp.name}</div>
            <div class="text-[10px] text-slate-500 font-normal">${corp.desc || 'لا يوجد وصف'}</div>
          </td>
          <td class="p-2.5 font-bold text-slate-300">${corp.founder}</td>
          <td class="p-2.5 text-center font-mono text-emerald-400 font-bold">${(corp.treasury || 0).toLocaleString()} EGP</td>
          <td class="p-2.5 text-center font-mono text-slate-300 font-bold">${(corp.members || []).length} عضو</td>
          <td class="p-2.5 text-center text-slate-400 max-w-[200px] truncate" title="${projNames}">${projNames}</td>
          <td class="p-2.5 text-left space-x-1 space-x-reverse">
            <button data-id="${corp.id}" data-name="${corp.name}" class="btn-admin-edit-corp-treasury py-1 px-2.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/20 rounded font-bold transition text-[10px]">تعديل الخزينة</button>
            <button data-id="${corp.id}" data-name="${corp.name}" class="btn-admin-delete-corp py-1 px-2.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/20 rounded font-bold transition text-[10px]">تفكيك</button>
          </td>
        `;

        // Bind Edit Treasury Button
        const btnEdit = tr.querySelector('.btn-admin-edit-corp-treasury');
        btnEdit.addEventListener('click', async () => {
          const corpId = btnEdit.dataset.id;
          const corpName = btnEdit.dataset.name;
          const currentTreasury = corp.treasury || 0;
          const val = prompt(`أدخل الرصيد الجديد لخزينة شركة "${corpName}":`, currentTreasury);
          if (val === null || val.trim() === '') return;
          try {
            await AppDB.adminEditCorporationTreasury(corpId, val);
            showToast('تعديل الخزينة', `تم تعديل رصيد خزينة شركة ${corpName} بنجاح.`, 'success');
            logAdminAction(`تعديل خزينة الشركة المشتركة: ${corpName}`);
          } catch (e) {
            showToast('خطأ تعديل الخزينة', e.message, 'error');
          }
        });

        // Bind Delete Button
        const btnDel = tr.querySelector('.btn-admin-delete-corp');
        btnDel.addEventListener('click', async () => {
          const corpId = btnDel.dataset.id;
          const corpName = btnDel.dataset.name;
          if (!confirm(`هل أنت متأكد تماماً من تفكيك وحذف شركة "${corpName}" نهائياً من قاعدة البيانات؟\nلا يمكن استرجاع هذا الإجراء.`)) return;
          try {
            await AppDB.adminDeleteCorporation(corpId);
            showToast('تفكيك شركة', `تم تفكيك وحذف شركة ${corpName} بنجاح.`, 'success');
            logAdminAction(`تفكيك وحذف الشركة المشتركة: ${corpName}`);
          } catch (e) {
            showToast('خطأ تفكيك شركة', e.message, 'error');
          }
        });

        tbody.appendChild(tr);
      });
    });
  }

  function switchAdminTab(tabId) {
    const subtabs = ['stats', 'players', 'transfers', 'market', 'broadcast', 'auctions', 'giftcodes', 'system', 'corporations'];
    subtabs.forEach(t => {
      const btn = document.getElementById(`tab-admin-${t}`);
      const panel = document.getElementById(`admin-subpanel-${t}`);
      if (!btn || !panel) return;
      if (t === tabId) {
        btn.classList.add('border-yellow-500/40', 'bg-yellow-500/10', 'text-yellow-400', 'active-admin-tab', 'active-admin-sidebar-btn');
        btn.classList.remove('border-transparent', 'text-slate-400', 'hover:bg-slate-900/60');
        panel.classList.remove('hidden');
      } else {
        btn.classList.remove('border-yellow-500/40', 'bg-yellow-500/10', 'text-yellow-400', 'active-admin-tab', 'active-admin-sidebar-btn');
        btn.classList.add('border-transparent', 'text-slate-400');
        panel.classList.add('hidden');
      }
    });

    // Auto-collapse mobile sidebar on tab change
    const sidebar = document.getElementById('admin-sidebar');
    if (sidebar && window.innerWidth < 768) {
      sidebar.classList.add('hidden');
    }

    if (tabId === 'stats') {
      renderAdminAnalyticsDashboard();
    } else if (tabId === 'players') {
      if (window._adminReloadPlayers) window._adminReloadPlayers(false);
    } else if (tabId === 'transfers') {
      renderAdminTransfersMonitor();
    } else if (tabId === 'market') {
      if (window._adminRenderStockPrices) window._adminRenderStockPrices();
    } else if (tabId === 'auctions') {
      fetchAndRenderAdminAuctions();
    } else if (tabId === 'giftcodes') {
      fetchAndRenderAdminGiftCodes();
    } else if (tabId === 'corporations') {
      renderAdminCorporationsPanel();
    } else if (tabId === 'system') {
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
        valText.textContent = `${mult.toFixed(1)}x أرباح وخبرة مضاعفة!`;
      } else {
        banner.classList.add('hidden');
      }
    }
  }

  function toggleAdminSidebarAction() {
    const sidebar = document.getElementById('admin-sidebar');
    if (sidebar) {
      if (sidebar.classList.contains('hidden')) {
        sidebar.classList.remove('hidden');
        sidebar.className = 'w-64 border-l border-slate-900 bg-slate-900/90 backdrop-blur-xl flex flex-col justify-between shrink-0 transition-all duration-300 fixed md:relative right-0 top-16 bottom-0 z-[510] md:flex';
      } else {
        sidebar.classList.add('hidden');
      }
    }
  }

  async function toggleServerBoostAction() {
    const currentBoost = window.serverBoostMultiplier || 1.0;
    const newBoost = currentBoost > 1.0 ? 1.0 : 2.0;
    const toggleBtn = document.getElementById('btn-adm-toggle-boost');
    
    try {
      if (toggleBtn) {
        toggleBtn.disabled = true;
        toggleBtn.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i>';
      }
      
      await AppDB.adminSaveServerConfig({
        boostMultiplier: newBoost
      });
      
      showToast('مضاعف السيرفر', newBoost > 1.0 ? 'تم تفعيل وضع مضاعف الأرباح والخبرة 2x للجميع! 🔥' : 'تم إيقاف مضاعف السيرفر والعودة للوضع الاعتيادي.', 'success');
      logAdminAction(`تحديث مضاعف السيرفر: تم تعيين المضاعف على ${newBoost.toFixed(1)}x`);
      
      await AppDB.sendBroadcast(
        newBoost > 1.0 ? '🔥 تفعيل مضاعف السيرفر (Server Boost)!' : 'ℹ️ انتهاء مضاعف السيرفر (Server Boost)',
        newBoost > 1.0 ? 'قام الأدمن بتفعيل وضع مضاعف الأرباح والخبرة (Double XP & Cash) لجميع اللاعبين حياً!' : 'انتهى وضع مضاعف الأرباح والخبرة وعاد السيرفر للمعدل الطبيعي.'
      );
      
    } catch (err) {
      showToast('خطأ في تغيير المضاعف', err.message, 'error');
    } finally {
      if (toggleBtn) {
        toggleBtn.disabled = false;
        toggleBtn.innerHTML = '<i class="fa-solid fa-bolt text-sm"></i>';
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
        logBox.innerHTML = '';
      }
      const entry = document.createElement('div');
      entry.className = 'border-b border-slate-900/60 pb-1 mb-1';
      entry.innerHTML = `<span class="text-yellow-500 font-bold ml-1 font-mono">[${time}]</span> ${msg}`;
      logBox.insertBefore(entry, logBox.firstChild);
    });
  }

  // ─────────────────────────────────────────────
  //  TRANSFER REQUESTS — UI Rendering & State
  // ─────────────────────────────────────────────
  let lastRequestsFetchTime = 0;
  let cachedIncomingRequests = [];
  let cachedSentRequests = [];
  let requestsTabActive = 'incoming';

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

    const pendingIncomingCount = cachedIncomingRequests.filter(r => r.status === 'pending' && (now - r.timestamp <= twentyFourHours)).length;
    const pendingSentCount = cachedSentRequests.filter(r => r.status === 'pending' && (now - r.timestamp <= twentyFourHours)).length;

    if (countIncomingEl) countIncomingEl.textContent = pendingIncomingCount;
    if (countSentEl) countSentEl.textContent = pendingSentCount;

    // Render Incoming Requests
    if (cachedIncomingRequests.length === 0) {
      incomingList.innerHTML = `<div class="text-center text-slate-500 text-xs py-8">لا يوجد طلبات واردة حالياً.</div>`;
    } else {
      incomingList.innerHTML = '';
      cachedIncomingRequests.forEach(r => {
        const age = now - r.timestamp;
        const isExpired = r.status === 'pending' && age > twentyFourHours;
        const remainingMs = twentyFourHours - age;

        let statusText = '';
        let statusClass = '';
        let actionButtons = '';

        if (r.status === 'accepted') {
          statusText = 'تم القبول والتحويل ✔️';
          statusClass = 'text-emerald-400 font-bold';
        } else if (r.status === 'rejected') {
          statusText = 'تم الرفض ❌';
          statusClass = 'text-rose-400 font-bold';
        } else if (isExpired) {
          statusText = 'منتهي الصلاحية (24س) ⚠️';
          statusClass = 'text-slate-500 font-bold';
        } else {
          const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
          const remainingMins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
          statusText = `معلق - متبقي ${remainingHours}س و ${remainingMins}د`;
          statusClass = 'text-yellow-400 font-bold';

          actionButtons = `
            <div class="flex gap-1.5 mt-2">
              <button data-id="${r.id}" class="btn-req-accept flex-grow py-1 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black rounded text-[10px] transition">قبول ودفع</button>
              <button data-id="${r.id}" class="btn-req-reject flex-grow py-1 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/20 rounded text-[10px] transition">رفض</button>
            </div>
          `;
        }

        const div = document.createElement('div');
        div.className = 'glass-panel p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between text-xs mb-2';
        div.innerHTML = `
          <div class="flex justify-between items-center mb-1">
            <span class="font-bold text-white">المرسل: ${r.sender}</span>
            <span class="numbers-font text-yellow-500 font-bold text-sm">${r.amount.toLocaleString()} EGP</span>
          </div>
          <div class="flex justify-between items-center text-[10px] text-slate-400">
            <span>الحالة: <span class="${statusClass}">${statusText}</span></span>
            <span class="numbers-font">${new Date(r.timestamp).toLocaleTimeString('ar-EG')}</span>
          </div>
          ${actionButtons}
        `;

        const acceptBtn = div.querySelector('.btn-req-accept');
        const rejectBtn = div.querySelector('.btn-req-reject');
        if (acceptBtn) {
          acceptBtn.addEventListener('click', async () => {
            try {
              acceptBtn.disabled = true;
              if (rejectBtn) rejectBtn.disabled = true;
              acceptBtn.textContent = 'جاري المعالجة...';

              await AppDB.acceptTransferRequest(r.id, username);
              showToast('موافقة الطلب', `تم قبول طلب التحويل ودفع ${r.amount.toLocaleString()} EGP بنجاح!`, 'success');

              const updatedState = await AppDB.getPlayerState(username);
              if (updatedState) {
                GameEngine.state.cash = updatedState.cash;
                GameEngine.state.bank = updatedState.bank;
                GameEngine.state.netWorth = updatedState.netWorth;
              }
              await fetchAndRenderTransferRequests(true);
              renderAll();
            } catch (err) {
              showToast('خطأ في قبول الطلب', err.message, 'error');
              acceptBtn.disabled = false;
              if (rejectBtn) rejectBtn.disabled = false;
              acceptBtn.textContent = 'قبول ودفع';
            }
          });
        }
        if (rejectBtn) {
          rejectBtn.addEventListener('click', async () => {
            try {
              if (acceptBtn) acceptBtn.disabled = true;
              rejectBtn.disabled = true;
              rejectBtn.textContent = 'جاري الرفض...';

              await AppDB.rejectTransferRequest(r.id, username);
              showToast('رفض الطلب', 'تم رفض طلب التحويل بنجاح.', 'info');

              await fetchAndRenderTransferRequests(true);
            } catch (err) {
              showToast('خطأ في رفض الطلب', err.message, 'error');
              if (acceptBtn) acceptBtn.disabled = false;
              rejectBtn.disabled = false;
              rejectBtn.textContent = 'رفض';
            }
          });
        }

        incomingList.appendChild(div);
      });
    }

    // Render Sent Requests
    if (cachedSentRequests.length === 0) {
      sentList.innerHTML = `<div class="text-center text-slate-500 text-xs py-8">لا يوجد طلبات مرسلة حالياً.</div>`;
    } else {
      sentList.innerHTML = '';
      cachedSentRequests.forEach(r => {
        const age = now - r.timestamp;
        const isExpired = r.status === 'pending' && age > twentyFourHours;
        const remainingMs = twentyFourHours - age;

        let statusText = '';
        let statusClass = '';

        if (r.status === 'accepted') {
          statusText = 'تم القبول والتحويل ✔️';
          statusClass = 'text-emerald-400 font-bold';
        } else if (r.status === 'rejected') {
          statusText = 'تم الرفض ❌';
          statusClass = 'text-rose-400 font-bold';
        } else if (isExpired) {
          statusText = 'منتهي الصلاحية ⚠️';
          statusClass = 'text-slate-500 font-bold';
        } else {
          const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
          const remainingMins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
          statusText = `معلق - متبقي ${remainingHours}س و ${remainingMins}د`;
          statusClass = 'text-yellow-400 font-bold';
        }

        const div = document.createElement('div');
        div.className = 'glass-panel p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between text-xs mb-2';
        div.innerHTML = `
          <div class="flex justify-between items-center mb-1">
            <span class="font-bold text-white">المستلم: ${r.recipient}</span>
            <span class="numbers-font text-yellow-500 font-bold text-sm">${r.amount.toLocaleString()} EGP</span>
          </div>
          <div class="flex justify-between items-center text-[10px] text-slate-400">
            <span>الحالة: <span class="${statusClass}">${statusText}</span></span>
            <span class="numbers-font">${new Date(r.timestamp).toLocaleTimeString('ar-EG')}</span>
          </div>
        `;
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

    shelf.innerHTML = `<div class="col-span-full text-center text-slate-500 text-xs py-12 flex flex-col items-center justify-center gap-2">
      <i class="fa-solid fa-spinner animate-spin text-amber-500 text-lg"></i>
      <span>جاري تحميل الصفقات المعروضة من السيرفر...</span>
    </div>`;

    try {
      const items = await AppDB.getAuctionItems();
      renderAuctionsShelfDOM(items);
    } catch (e) {
      shelf.innerHTML = `<div class="col-span-full text-center text-rose-400 text-xs py-12">فشل تحميل صفقات المزادات: ${e.message}</div>`;
    }

    renderPlayerCollectiblesDOM();
  }

  function renderAuctionsShelfDOM(items) {
    const shelf = document.getElementById('auctions-shelf');
    if (!shelf) return;

    if (!items || items.length === 0) {
      shelf.innerHTML = `<div class="col-span-full text-center text-slate-500 text-xs py-12">لا توجد مزادات أو صفقات نشطة حالياً.</div>`;
      return;
    }

    shelf.innerHTML = '';
    items.forEach(item => {
      const totalQty = Number(item.quantity || 0);
      const sold = Number(item.soldCount || 0);
      const remaining = Math.max(0, totalQty - sold);

      const isSoldOut = remaining <= 0;
      let btnHtml = '';

      if (isSoldOut) {
        btnHtml = `<button disabled class="w-full py-2 bg-slate-800 text-slate-500 font-bold rounded-lg text-xs cursor-not-allowed">نفذت الكمية ❌</button>`;
      } else {
        btnHtml = `<button data-id="${item.id}" class="btn-buy-auction-item w-full py-2 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-black rounded-lg text-xs transition duration-200 shadow-md">شراء الآن 💰</button>`;
      }

      const card = document.createElement('div');
      card.className = 'glass-panel p-4.5 rounded-xl border border-slate-800 flex flex-col justify-between space-y-3 relative overflow-hidden';
      if (isSoldOut) card.classList.add('opacity-60');

      card.innerHTML = `
        <div>
          <div class="flex justify-between items-start gap-2 mb-1.5">
            <h4 class="text-xs font-black text-white">${item.name}</h4>
            <span class="text-[10px] px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/25 rounded font-bold whitespace-nowrap">صفقة نادرة</span>
          </div>
          <p class="text-[10px] text-slate-400 leading-relaxed">${item.description || 'لا يوجد وصف متوفر.'}</p>
        </div>

        <div class="space-y-2 border-t border-slate-800/40 pt-2.5">
          <div class="flex justify-between items-center text-[10px]">
            <span class="text-slate-500">سعر الشراء الفوري</span>
            <span class="numbers-font text-yellow-500 font-black text-sm">${item.price.toLocaleString()} EGP</span>
          </div>
          <div class="flex justify-between items-center text-[10px]">
            <span class="text-slate-500">الكمية المتبقية</span>
            <span class="font-bold text-slate-300">${isSoldOut ? 'انتهى المعروض' : `${remaining} / ${totalQty} قطعة`}</span>
          </div>
        </div>

        ${btnHtml}
      `;

      const buyBtn = card.querySelector('.btn-buy-auction-item');
      if (buyBtn) {
        buyBtn.addEventListener('click', async () => {
          try {
            buyBtn.disabled = true;
            buyBtn.textContent = 'جاري الشراء...';

            const result = await AppDB.purchaseAuctionItem(item.id, GameEngine.activeUsername);

            showToast('تم الشراء بنجاح', `تهانينا! قمت بشراء "${result.name}" بسعر ${result.price.toLocaleString()} ج.م. تم إضافته لمقتنياتك النادرة.`, 'success');
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
            showToast('فشل الشراء', err.message, 'error');
            buyBtn.disabled = false;
            buyBtn.textContent = 'شراء الآن 💰';
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
      container.innerHTML = `<div class="col-span-full text-center text-slate-500 text-xs py-8">لم تقم بشراء أي مقتنيات نادرة من المزادات حتى الآن.</div>`;
      return;
    }

    container.innerHTML = '';
    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'glass-panel p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/[0.02] flex flex-col justify-between space-y-2';

      const timeStr = new Date(item.timestamp).toLocaleDateString('ar-EG', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      card.innerHTML = `
        <div>
          <div class="flex justify-between items-center mb-1">
            <span class="font-black text-amber-400 text-xs flex items-center gap-1.5">
              <i class="fa-solid fa-gem text-[10px]"></i>
              <span>${item.name}</span>
            </span>
            <span class="numbers-font text-[10px] text-slate-500 font-bold">${item.price.toLocaleString()} ج.م</span>
          </div>
          <p class="text-[10px] text-slate-400">${item.description || 'لا يوجد وصف متوفر.'}</p>
        </div>
        <div class="text-[9px] text-slate-500 text-left border-t border-slate-800/40 pt-1.5 mt-1 font-mono">
          تملكها منذ: ${timeStr}
        </div>
      `;
      container.appendChild(card);
    });
  }

  function renderAuctionsTab() {
    const aucCashEl = document.getElementById('auction-player-cash');
    if (aucCashEl && GameEngine.state) {
      aucCashEl.textContent = `${GameEngine.state.cash.toLocaleString()} EGP`;
    }
    renderPlayerCollectiblesDOM();
  }

  async function fetchAndRenderAdminAuctions() {
    const tbody = document.getElementById('admin-auctions-list');
    if (!tbody) return;

    try {
      const items = await AppDB.getAuctionItems();
      if (items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-slate-500">لا توجد أغراض معروضة في المزادات حالياً.</td></tr>`;
        return;
      }

      tbody.innerHTML = '';
      items.forEach(item => {
        const tr = document.createElement('tr');
        tr.className = 'border-b border-slate-800/60 hover:bg-slate-900/30 text-xs';

        const total = Number(item.quantity || 0);
        const sold = Number(item.soldCount || 0);
        const remaining = Math.max(0, total - sold);

        tr.innerHTML = `
          <td class="py-2.5 font-bold text-white">${item.name}</td>
          <td class="py-2.5 text-slate-400 max-w-[200px] truncate">${item.description || '-'}</td>
          <td class="py-2.5 text-center font-bold text-yellow-500 font-mono">${item.price.toLocaleString()} ج.م</td>
          <td class="py-2.5 text-center font-bold font-mono text-slate-300">${sold} مبيعة / ${remaining} متبقي (${total} إجمالي)</td>
          <td class="py-2.5 text-left">
            <button data-id="${item.id}" class="btn-admin-delete-auction py-1 px-3 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/20 rounded font-bold transition text-[10px]">حذف المعروض</button>
          </td>
        `;

        const deleteBtn = tr.querySelector('.btn-admin-delete-auction');
        if (deleteBtn) {
          deleteBtn.addEventListener('click', async () => {
            if (!confirm(`هل أنت متأكد من حذف الغرض "${item.name}" من المزادات؟`)) return;
            try {
              deleteBtn.disabled = true;
              deleteBtn.textContent = 'جاري الحذف...';
              await AppDB.adminDeleteAuctionItem(item.id);
              showToast('تم الحذف', 'تم حذف غرض المزاد بنجاح.', 'info');
              logAdminAction(`حذف غرض المزاد: ${item.name}`);
              fetchAndRenderAdminAuctions();
            } catch (err) {
              showToast('فشل الحذف', err.message, 'error');
              deleteBtn.disabled = false;
              deleteBtn.textContent = 'حذف المعروض';
            }
          });
        }

        tbody.appendChild(tr);
      });
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="5" class="py-4 text-center text-rose-400">فشل تحميل قائمة المزادات الإدارية: ${e.message}</td></tr>`;
    }
  }

  async function fetchAndRenderAdminGiftCodes() {
    const tbody = document.getElementById('admin-giftcodes-list');
    if (!tbody) return;

    try {
      const codes = await AppDB.adminGetGiftCodes();
      if (codes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-slate-500">لا توجد أكواد هدايا نشطة حالياً.</td></tr>`;
        return;
      }

      tbody.innerHTML = '';
      codes.forEach(code => {
        const tr = document.createElement('tr');
        tr.className = 'border-b border-slate-800/60 hover:bg-slate-900/30 text-xs';

        let rewardDesc = '';
        if (code.rewardType === 'cash') {
          rewardDesc = `${Number(code.rewardDetails.amount || 0).toLocaleString()} ج.م`;
        } else if (code.rewardType === 'business') {
          const businessNames = {
            coffee: 'عربة قهوة مختصة',
            supermarket: 'سوبر ماركت',
            tech: 'شركة برمجيات وتطبيقات',
            logistics: 'شركة شحن ولوجستيات',
            solar_factory: 'محطة طاقة شمسية',
            private_hospital: 'مستشفى خاص',
            media_studio: 'ستوديو إنتاج إعلامي',
            private_bank: 'بنك استثماري خاص',
            oil_refinery: 'مصفاة بترول وتكرير',
            space_tech: 'شركة استكشاف الفضاء'
          };
          const bName = businessNames[code.rewardDetails.businessId] || code.rewardDetails.businessId;
          rewardDesc = `${bName} (مستوى ${code.rewardDetails.level} | عمال ${code.rewardDetails.workers})`;
        } else if (code.rewardType === 'item') {
          const itemNames = {
            gold_pen: 'القلم الذهبي للمدراء',
            premium_lawyer: 'توكيل محامٍ دولي',
            energy_drink: 'مشروب الطاقة والتركيز',
            tax_shield: 'درع الإعفاء الضريبي',
            market_scanner: 'ماسح البورصة والتداول',
            vip_casino_pass: 'بطاقة VIP للكازينو',
            quantum_cpu: 'معالج الحوسبة الكمومية',
            diamond_card: 'عضوية النادي الماسي',
            cronos_gear: 'ساعة الكرونوس'
          };
          const itName = itemNames[code.rewardDetails.itemId] || code.rewardDetails.itemId;
          rewardDesc = itName;
        }

        const maxStr = code.maxUses > 0 ? `${code.maxUses}` : '♾️';
        const usageText = `${code.usedCount || 0} / ${maxStr}`;

        tr.innerHTML = `
          <td class="py-2.5 font-black text-emerald-400 font-mono">${code.id}</td>
          <td class="py-2.5 text-slate-300 font-bold">${code.rewardType === 'cash' ? 'مالي 💰' : code.rewardType === 'business' ? 'أملاك/شركة 🏢' : 'أداة 🎒'}</td>
          <td class="py-2.5 text-center text-slate-400 font-bold">${rewardDesc}</td>
          <td class="py-2.5 text-center font-bold font-mono text-slate-300">${usageText}</td>
          <td class="py-2.5 text-left">
            <button data-id="${code.id}" class="btn-admin-delete-giftcode py-1 px-3 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/20 rounded font-bold transition text-[10px]">حذف الكود</button>
          </td>
        `;

        const deleteBtn = tr.querySelector('.btn-admin-delete-giftcode');
        if (deleteBtn) {
          deleteBtn.addEventListener('click', async () => {
            if (!confirm(`هل أنت متأكد من حذف كود الهدية "${code.id}"؟`)) return;
            try {
              deleteBtn.disabled = true;
              deleteBtn.textContent = 'جاري الحذف...';
              await AppDB.adminDeleteGiftCode(code.id);
              showToast('تم الحذف', 'تم حذف كود الهدية بنجاح.', 'info');
              logAdminAction(`حذف كود الهدية: ${code.id}`);
              fetchAndRenderAdminGiftCodes();
            } catch (err) {
              showToast('فشل الحذف', err.message, 'error');
              deleteBtn.disabled = false;
              deleteBtn.textContent = 'حذف الكود';
            }
          });
        }

        tbody.appendChild(tr);
      });
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="5" class="py-4 text-center text-rose-400">فشل تحميل الأكواد: ${e.message}</td></tr>`;
    }
  }

  // ─────────────────────────────────────────────
  //  V2 variables & handlers
  // ─────────────────────────────────────────────
  let lastChatSent = 0;
  let currentActiveDMUser = '';
  let mailboxActiveTab = 'inbox';
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
          unreadDot.textContent = '0';
        }
        if (chatDrawer.classList.contains('chat-drawer-open')) {
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
        charCounter.textContent = `${chatInput.value.length} / 200`;
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

        const username = GameEngine.activeUsername || (GameEngine.state && GameEngine.state.username) || 'لاعب';
        const userTitle = (GameEngine.state && GameEngine.state.title) || 'عامل مبتدئ';

        try {
          chatSendBtn.disabled = true;
          chatInput.value = '';
          if (charCounter) charCounter.textContent = '0 / 200';
          lastChatSent = Date.now();
          await AppDB.sendChatMessage(username, userTitle, text);
        } catch (err) {
          showToast('خطأ إرسال', err.message, 'error');
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
        if (e.key === 'Enter') {
          e.preventDefault();
          doSendChat();
        }
      });
    }

    const adminSendMsgBtn = document.getElementById('btn-admin-send-monitoring-msg');
    if (adminSendMsgBtn) {
      adminSendMsgBtn.addEventListener('click', async () => {
        try {
          adminSendMsgBtn.disabled = true;
          const msg = "⚠️ تنبيه من الإدارة: الإدارة تراقب الشات حالياً. يرجى الالتزام بالقوانين.";
          await AppDB.sendChatMessage("الإدارة", "رسمي", msg);
          showToast('تم الإرسال', 'تم إرسال تنبيه مراقبة الشات بنجاح.', 'success');
        } catch (err) {
          showToast('خطأ إرسال', err.message, 'error');
        } finally {
          adminSendMsgBtn.disabled = false;
        }
      });
    }

    const btnMailbox = document.getElementById('btn-open-mailbox');
    const btnMailboxMobile = document.getElementById('btn-open-mailbox-mobile');
    const btnCloseMailbox = document.getElementById('btn-close-mailbox-modal');
    const mailboxModal = document.getElementById('mailbox-modal');

    if (btnMailbox && mailboxModal) {
      btnMailbox.addEventListener('click', () => {
        mailboxModal.classList.remove('hidden');
        switchMailboxTab('inbox');
      });
    }
    if (btnMailboxMobile && mailboxModal) {
      btnMailboxMobile.addEventListener('click', () => {
        mailboxModal.classList.remove('hidden');
        switchMailboxTab('inbox');
      });
    }
    if (btnCloseMailbox && mailboxModal) {
      btnCloseMailbox.addEventListener('click', () => {
        mailboxModal.classList.add('hidden');
      });
    }

    const btnMailTabInbox = document.getElementById('btn-mail-tab-inbox');
    if (btnMailTabInbox) {
      btnMailTabInbox.addEventListener('click', () => {
        const inboxPanel = document.getElementById('mailbox-inbox-panel');
        if (inboxPanel) inboxPanel.classList.remove('hidden');
      });
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
          await AppDB.sendMail(GameEngine.state.username, target, 'friend_request', {});
          showToast('طلب صداقة', `تم إرسال طلب صداقة إلى ${target} بنجاح!`, 'success');
        } catch (err) {
          showToast('خطأ طلب صداقة', err.message, 'error');
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
          btnProfileBlock.innerHTML = '<i class="fa-solid fa-ban"></i> <span>حظر اللاعب</span>';
          showToast('إلغاء حظر', `تم إلغاء حظر اللاعب ${target}.`, 'info');
        } else {
          GameEngine.state.blockedUsers.push(target);
          btnProfileBlock.innerHTML = '<i class="fa-solid fa-ban"></i> <span class="text-rose-500">إلغاء الحظر</span>';
          showToast('حظر اللاعب', `تم حظر اللاعب ${target}. لن تظهر رسائله في الشات العام.`, 'warning');
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
        const salary = parseInt(salaryInput.value || '0');

        if (!businessId || !role || salary <= 0) {
          showToast('خطأ إدخال', 'يرجى ملء جميع حقول عقد التوظيف براتب صحيح أكبر من الصفر.', 'error');
          return;
        }

        try {
          const bizName = GameEngine.state.businesses[businessId].name || businessId;
          await AppDB.sendMail(GameEngine.state.username, target, 'job_offer', {
            businessId,
            businessName: bizName,
            role,
            salary
          });
          document.getElementById('job-offer-form-modal').classList.add('hidden');
          showToast('عقد توظيف', `تم إرسال عرض العمل إلى ${target} بنجاح!`, 'success');
        } catch (err) {
          showToast('خطأ عقد التوظيف', err.message, 'error');
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
        const sharePct = parseInt(shareInput.value || '0');

        if (!businessId || sharePct <= 0 || sharePct >= 100) {
          showToast('خطأ إدخال', 'يرجى إدخال نسبة مئوية صحيحة بين 1% و 99%.', 'error');
          return;
        }

        try {
          const bizName = GameEngine.state.businesses[businessId].name || businessId;
          await AppDB.sendMail(GameEngine.state.username, target, 'partnership_invite', {
            businessId,
            businessName: bizName,
            sharePct: sharePct / 100
          });
          document.getElementById('partnership-form-modal').classList.add('hidden');
          showToast('دعوة شراكة', `تم إرسال دعوة الشراكة الاستثمارية إلى ${target} بنجاح!`, 'success');
        } catch (err) {
          showToast('خطأ الشراكة', err.message, 'error');
        }
      });
    }

    const submitRiddleBtn = document.getElementById('btn-submit-riddle');
    if (submitRiddleBtn) {
      submitRiddleBtn.addEventListener('click', () => {
        const answerInput = document.getElementById('riddle-answer-input');
        const typedVal = parseInt(answerInput.value || '');
        if (typedVal === window.activeRiddleAnswer) {
          GameEngine.state.lastPuzzleSolved = Date.now();
          AppDB.savePlayerState(GameEngine.activeUsername, GameEngine.state);
          document.getElementById('riddle-verification-modal').classList.add('hidden');
          showToast('تم التحقق بنجاح! 🎉', 'لقد أثبت وجودك البشري، تم صرف راتبك وتنشيط بونوص الشركة +30% لـ 24 ساعة القادمة.', 'success');
          renderAll();
        } else {
          showToast('إجابة خاطئة ❌', 'المعادلة الرياضية خاطئة، يرجى المحاولة والتركيز ثانية.', 'error');
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
          showToast('خطأ اختيار', 'يرجى اختيار نسخة احتياطية أولاً.', 'error');
          return;
        }
        const bState = await AppDB.getPlayerBackupState(targetUser, selectedDate);
        if (bState) {
          const blob = new Blob([JSON.stringify(bState, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `backup_${targetUser}_${selectedDate}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          showToast('تم التنزيل', 'تم تحميل ملف النسخة الاحتياطية بنجاح.', 'success');
        }
      });
    }

    if (adminRestoreSelectedBtn) {
      adminRestoreSelectedBtn.addEventListener('click', async () => {
        const targetUser = document.getElementById('admin-p-username').textContent;
        const selectedDate = adminBackupsSelect.value;
        if (!selectedDate) {
          showToast('خطأ اختيار', 'يرجى اختيار تاريخ للنسخة الاحتياطية.', 'error');
          return;
        }
        if (confirm(`هل أنت متأكد من رغبتك في استعادة حساب اللاعب ${targetUser} إلى نسخة تاريخ ${selectedDate}؟ سيتم محو البيانات الحالية.`)) {
          const bState = await AppDB.getPlayerBackupState(targetUser, selectedDate);
          if (bState) {
            await AppDB.adminRestorePlayerFromState(targetUser, bState);
            showToast('تم الاسترجاع', `تمت استعادة حساب اللاعب ${targetUser} بنجاح من قاعدة البيانات.`, 'success');
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
                showToast('تنبيه عدم مطابقة', `اسم اللاعب في ملف الاحتياطي (${parsed.username}) لا يطابق اللاعب الذي تقوم بفحصه حالياً (${targetUser})!`, 'warning');
              }
              selectedRestoreFileContent = parsed;
              document.getElementById('restore-file-name-label').textContent = file.name;
              uploadRestoreBtn.disabled = false;
            } catch (err) {
              showToast('خطأ قراءة ملف', 'الملف الاحتياطي غير صالح أو معطوب.', 'error');
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
            showToast('استيراد ناجح! 🎉', `تم رفع الملف الخارجي واستعادة الحساب بالكامل لـ ${targetUser}.`, 'success');
            selectedRestoreFileContent = null;
            document.getElementById('restore-file-name-label').textContent = 'اختر ملف JSON الاحتياطي...';
            uploadRestoreBtn.disabled = true;
            fileInput.value = '';

            const updatedState = await AppDB.getPlayerState(targetUser);
            if (updatedState) loadAdminPlayerWorkspace(updatedState);
          } catch (err) {
            showToast('فشل الاستعادة', err.message, 'error');
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
        const basePrice = parseInt(priceInput.value || '0');
        const condType = condTypeSelect.value;
        const condVal = parseInt(condValInput.value || '0');

        if (!name || basePrice <= 0 || condVal <= 0) {
          showToast('خطأ إدخال', 'يرجى ملء جميع تفاصيل المزاد الحي الجديد بقيم صحيحة.', 'error');
          return;
        }

        try {
          adminCreateLiveAuctionBtn.disabled = true;
          let startVal = condVal;
          if (condType === 'time') {
            startVal = Date.now() + (condVal * 60 * 1000);
          }

          await AppDB.adminCreateLiveAuction(type, 'live_' + Math.random().toString(36).substr(2, 9), name, basePrice, condType, startVal);
          showToast('تم إطلاق المزاد الحي', `تم إدراج المزاد الحي (${name}) في السيرفر بنجاح وهو بانتظار المسجلين.`, 'success');

          nameInput.value = '';
          priceInput.value = '';
          condValInput.value = '';
        } catch (err) {
          showToast('فشل المزاد', err.message, 'error');
        } finally {
          adminCreateLiveAuctionBtn.disabled = false;
        }
      });
    }
  }

  function renderChatMessages(msgs) {
    const container = document.getElementById('chat-messages-container');
    if (!container) return;

    container.innerHTML = '';

    if (!msgs || msgs.length === 0) {
      container.innerHTML = '<div class="text-center text-slate-500 text-xs py-8">لا توجد رسائل سابقة. كن أول من يكتب! 💬</div>';
      return;
    }

    const curUser = GameEngine.activeUsername || (GameEngine.state && GameEngine.state.username);
    const blocked = (GameEngine.state && GameEngine.state.blockedUsers) || [];

    msgs.forEach(msg => {
      if (blocked.includes(msg.sender)) return;

      const isSystem = msg.sender === 'الإدارة';
      const isMe = !isSystem && curUser && msg.sender === curUser;
      
      let bubbleClass = isMe ? 'chat-bubble-sent' : 'chat-bubble-received';
      let alignClass = isMe ? 'text-left flex flex-col items-end' : 'text-right flex flex-col items-start';
      
      if (isSystem) {
        bubbleClass = 'bg-red-950/40 border border-red-500/30 text-red-200 w-full text-center py-2 px-3 rounded-xl shadow-lg shadow-red-950/20';
        alignClass = 'text-center flex flex-col items-center w-full';
      }

      const timeStr = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

      const msgDiv = document.createElement('div');
      msgDiv.className = `w-full flex flex-col ${alignClass}`;
      
      const safeSender = String(msg.sender || 'لاعب').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
      const safeTitle = String(msg.senderTitle || 'مبتدئ').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
      const safeMsg = String(msg.message || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

      if (isSystem) {
        msgDiv.innerHTML = `
          <div class="flex items-center gap-1 mb-1 justify-center">
            <span class="text-[9px] text-slate-500 font-bold">${timeStr}</span>
            <span class="text-[10px] font-black text-red-400"><i class="fa-solid fa-shield-halved text-[9px] mr-1"></i>${safeSender}</span>
            <span class="text-[8px] px-1 bg-red-950 border border-red-800 rounded-md text-red-300 font-bold">${safeTitle}</span>
          </div>
          <div class="chat-message-bubble ${bubbleClass}">
            ${safeMsg}
          </div>
        `;
      } else {
        msgDiv.innerHTML = `
          <div class="flex items-center gap-1.5 mb-0.5">
            <span class="text-[9px] text-slate-500 font-bold">${timeStr}</span>
            <span class="text-[10px] font-bold text-yellow-400 cursor-pointer hover:underline" onclick="window.UI.openPlayerProfileCard('${safeSender}')">${safeSender}</span>
            <span class="text-[8px] px-1 bg-slate-900 border border-slate-800 rounded-md text-slate-400">${safeTitle}</span>
          </div>
          <div class="chat-message-bubble ${bubbleClass}">
            ${safeMsg}
          </div>
        `;
      }
      container.appendChild(msgDiv);
    });

    container.scrollTop = container.scrollHeight;
  }

  function renderMailbox(mails) {
    window.lastMailsCache = mails;
    const inboxPanel = document.getElementById('mailbox-inbox-panel');
    const unreadBadge = document.getElementById('mailbox-unread-badge');
    const unreadBadgeMobile = document.getElementById('mailbox-unread-badge-mobile');

    if (!inboxPanel) return;
    inboxPanel.innerHTML = '';

    let pendingCount = 0;
    const requests = mails.filter(m => m.type !== 'dm');

    processInboxSystemMessages(mails);

    if (requests.length === 0) {
      inboxPanel.innerHTML = '<div class="text-center text-slate-500 text-xs py-12">لا توجد رسائل أو طلبات جديدة في صندوقك.</div>';
    } else {
      requests.forEach(mail => {
        if (mail.status === 'pending') pendingCount++;

        const mailDiv = document.createElement('div');
        mailDiv.className = `p-4 rounded-xl border ${mail.status === 'pending' ? 'bg-slate-900/60 border-emerald-500/20' : 'bg-slate-900/20 border-slate-800'} text-xs text-slate-300 space-y-3`;

        let contentHtml = '';
        let actionsHtml = '';

        if (mail.type === 'friend_request') {
          contentHtml = `يريد اللاعب <strong class="text-white cursor-pointer hover:underline" onclick="window.UI.openPlayerProfileCard('${mail.sender}')">${mail.sender}</strong> إضافتك كصديق في اللعبة.`;
          if (mail.status === 'pending') {
            actionsHtml = `
              <div class="flex gap-2">
                <button onclick="window.UI.handleMailAction('${mail.id}', 'friend_accept')" class="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg font-black transition">قبول الصداقة</button>
                <button onclick="window.UI.handleMailAction('${mail.id}', 'reject')" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg transition">رفض</button>
              </div>
            `;
          } else {
            actionsHtml = `<span class="text-[10px] text-slate-500 font-bold">${mail.status === 'accepted' ? 'تم قبول الصداقة ✅' : 'تم الرفض ❌'}</span>`;
          }
        } else if (mail.type === 'job_offer') {
          contentHtml = `يعرض عليك اللاعب <strong class="text-white cursor-pointer hover:underline" onclick="window.UI.openPlayerProfileCard('${mail.sender}')">${mail.sender}</strong> العمل كمساعد في شركته: (<span class="text-sky-400 font-bold">${mail.payload.businessName}</span>) براتب دوري قدره <strong class="text-yellow-500 numbers-font font-bold">${mail.payload.salary} EGP</strong> لكل ثانية عمل.`;
          if (mail.status === 'pending') {
            actionsHtml = `
              <div class="flex gap-2">
                <button onclick="window.UI.handleMailAction('${mail.id}', 'job_accept')" class="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg font-black transition">قبول عقد العمل</button>
                <button onclick="window.UI.handleMailAction('${mail.id}', 'reject')" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg transition">رفض</button>
              </div>
            `;
          } else {
            actionsHtml = `<span class="text-[10px] text-slate-500 font-bold">${mail.status === 'accepted' ? 'تم قبول عقد العمل ✅' : 'تم الرفض ❌'}</span>`;
          }
        } else if (mail.type === 'partnership_invite') {
          const pct = Math.round(mail.payload.sharePct * 100);
          contentHtml = `يدعوك اللاعب <strong class="text-white cursor-pointer hover:underline" onclick="window.UI.openPlayerProfileCard('${mail.sender}')">${mail.sender}</strong> لتكون شريكاً استثمارياً مساهماً في شركته: (<span class="text-emerald-400 font-bold">${mail.payload.businessName}</span>) مقابل نسبة توزيع أرباح قدرها <strong class="text-emerald-400 font-bold">${pct}%</strong> من صافي العائد.`;
          if (mail.status === 'pending') {
            actionsHtml = `
              <div class="flex gap-2">
                <button onclick="window.UI.handleMailAction('${mail.id}', 'partnership_accept')" class="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg font-black transition">قبول الشراكة</button>
                <button onclick="window.UI.handleMailAction('${mail.id}', 'reject')" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg transition">رفض</button>
              </div>
            `;
          } else {
            actionsHtml = `<span class="text-[10px] text-slate-500 font-bold">${mail.status === 'accepted' ? 'تم قبول الشراكة ✅' : 'تم الرفض ❌'}</span>`;
          }
        }

        mailDiv.innerHTML = `
          <div class="flex justify-between items-center border-b border-slate-800/80 pb-2">
            <span class="text-[10px] text-slate-500 font-bold">${new Date(mail.timestamp).toLocaleString()}</span>
            <span class="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[9px] text-slate-400">${mail.type === 'friend_request' ? 'طلب صداقة' : mail.type === 'job_offer' ? 'عقد عمل' : 'دعوة شراكة'}</span>
          </div>
          <div>${contentHtml}</div>
          <div class="flex justify-between items-center pt-1">
            ${actionsHtml}
            <button onclick="window.UI.deleteMail('${mail.id}')" class="text-[10px] text-rose-400 hover:underline"><i class="fa-solid fa-trash mr-1"></i> حذف الرسالة</button>
          </div>
        `;
        inboxPanel.appendChild(mailDiv);
      });
    }

    if (unreadBadge) {
      unreadBadge.textContent = pendingCount;
      unreadBadge.classList.toggle('hidden', pendingCount === 0);
    }
    if (unreadBadgeMobile) {
      unreadBadgeMobile.textContent = pendingCount;
      unreadBadgeMobile.classList.toggle('hidden', pendingCount === 0);
    }

    renderDMsConversationList(mails);
  }

  function renderDMsConversationList(mails) {
    const container = document.getElementById('dm-friends-list');
    if (!container) return;
    container.innerHTML = '';

    const chats = {};
    const dms = mails.filter(m => m.type === 'dm');

    if (GameEngine.state.friends) {
      GameEngine.state.friends.forEach(f => {
        chats[f] = { username: f, lastMsg: 'اضغط لبدء المحادثة الخاصة...', timestamp: 0 };
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
      container.innerHTML = '<div class="text-[10px] text-slate-500 text-center py-6">قم بإضافة أصدقاء لبدء دردشة خاصة.</div>';
    } else {
      list.forEach(c => {
        const item = document.createElement('div');
        item.className = `p-2.5 rounded-lg border ${currentActiveDMUser === c.username ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-900/40 border-slate-900'} cursor-pointer hover:bg-slate-800/40 transition`;
        item.innerHTML = `
          <div class="flex justify-between items-center mb-0.5">
            <span class="font-bold text-white text-xs truncate">${c.username}</span>
          </div>
          <p class="text-[9px] text-slate-400 truncate">${c.lastMsg}</p>
        `;
        item.addEventListener('click', () => openPrivateChat(c.username));
        container.appendChild(item);
      });
    }
  }

  function openPrivateChat() {}
  function switchMailboxTab() {}

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
        showToast('خطأ بروفايل', 'الملف التعريفي للاعب غير موجود.', 'error');
        return;
      }

      document.getElementById('profile-card-username').textContent = pState.username;
      document.getElementById('profile-card-title').textContent = pState.title || 'عامل مبتدئ';
      document.getElementById('profile-card-networth').textContent = `${(pState.netWorth || 0).toLocaleString()} EGP`;
      document.getElementById('profile-card-reputation').textContent = `${(pState.underworldRep || 0).toLocaleString()} ⭐`;
      document.getElementById('profile-card-createdat').textContent = pState.createdAt ? new Date(pState.createdAt).toLocaleDateString() : 'غير معروف';

      const jobConfig = GameEngine.JOBS && GameEngine.JOBS[pState.jobId];
      const jobName = jobConfig ? jobConfig.name : (pState.jobId || 'عامل باليومية');
      document.getElementById('profile-card-job').textContent = jobName;

      // Populate Season Honors & Badges
      const badgesListEl = document.getElementById('profile-card-badges-list');
      if (badgesListEl) {
        badgesListEl.innerHTML = '';
        const titleStr = pState.title || '';
        const hasDiamond = pState.s1Badge === 'diamond' || titleStr.includes('مستثمر ألماسي') || titleStr.includes('ألماسي');
        const hasGold = pState.s1Badge === 'gold' || titleStr.includes('مستثمر ذهبي') || titleStr.includes('ذهبي');
        const hasBronze = pState.s1Badge === 'bronze' || titleStr.includes('مستثمر برونزي') || titleStr.includes('برونزي');
        const hasVeteran = pState.s1Veteran || pState.s1Badge === 'veteran' || titleStr.includes('مستثمر مخضرم') || titleStr.includes('مخضرم');

        let badgeCount = 0;

        if (hasDiamond) {
          badgeCount++;
          const dBadge = document.createElement('div');
          dBadge.className = 'flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-950/80 border-2 border-cyan-400 text-cyan-300 text-xs font-black shadow-md shadow-cyan-950/60';
          dBadge.innerHTML = '<i class="fa-solid fa-gem text-cyan-300 text-sm"></i><span>وسام مستثمر ألماسي (بطل S1 #1)</span>';
          badgesListEl.appendChild(dBadge);
        }

        if (hasGold) {
          badgeCount++;
          const gBadge = document.createElement('div');
          gBadge.className = 'flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-950/80 border-2 border-yellow-400 text-yellow-300 text-xs font-black shadow-md shadow-amber-950/60';
          gBadge.innerHTML = '<i class="fa-solid fa-crown text-yellow-300 text-sm"></i><span>وسام مستثمر ذهبي (وصيف S1 #2)</span>';
          badgesListEl.appendChild(gBadge);
        }

        if (hasBronze) {
          badgeCount++;
          const bBadge = document.createElement('div');
          bBadge.className = 'flex items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-950/80 border-2 border-orange-500 text-amber-300 text-xs font-black shadow-md shadow-orange-950/60';
          bBadge.innerHTML = '<i class="fa-solid fa-award text-amber-300 text-sm"></i><span>وسام مستثمر برونزي (برونزية S1 #3)</span>';
          badgesListEl.appendChild(bBadge);
        }

        if (hasVeteran) {
          badgeCount++;
          const vBadge = document.createElement('div');
          vBadge.className = 'flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-950/80 border-2 border-purple-400 text-purple-300 text-xs font-black shadow-md shadow-purple-950/60';
          vBadge.innerHTML = '<i class="fa-solid fa-certificate text-purple-300 text-sm"></i><span>وسام مستثمر مخضرم S1 (نخبة التوب 25)</span>';
          badgesListEl.appendChild(vBadge);
        }

        if (badgeCount === 0) {
          badgesListEl.innerHTML = '<div class="text-[11px] text-slate-500 py-1 flex items-center gap-1.5"><i class="fa-solid fa-circle-info text-[10px]"></i><span>لم يحصل هذا الحساب على أوسمة مواسم حتى الآن. شارك في الموسم الثاني للمنافسة!</span></div>';
        }

        // Dynamic Avatar styling according to honors
        const avatarBox = document.getElementById('profile-card-avatar-box');
        const avatarIcon = document.getElementById('profile-card-avatar-icon');
        if (avatarBox && avatarIcon) {
          if (hasDiamond) {
            avatarBox.className = 'w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 via-sky-500 to-blue-600 border-2 border-cyan-200 flex items-center justify-center text-slate-950 shadow-lg shadow-cyan-500/40 shrink-0';
            avatarIcon.className = 'fa-solid fa-gem text-2xl';
          } else if (hasGold) {
            avatarBox.className = 'w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-600 border-2 border-yellow-200 flex items-center justify-center text-slate-950 shadow-lg shadow-yellow-500/40 shrink-0';
            avatarIcon.className = 'fa-solid fa-crown text-2xl';
          } else if (hasBronze) {
            avatarBox.className = 'w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-600 via-orange-600 to-amber-800 border-2 border-amber-400 flex items-center justify-center text-amber-100 shadow-lg shadow-orange-900/40 shrink-0';
            avatarIcon.className = 'fa-solid fa-award text-2xl';
          } else if (hasVeteran) {
            avatarBox.className = 'w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 via-indigo-600 to-purple-800 border-2 border-purple-400 flex items-center justify-center text-purple-100 shadow-lg shadow-purple-900/40 shrink-0';
            avatarIcon.className = 'fa-solid fa-certificate text-2xl';
          } else {
            avatarBox.className = 'w-14 h-14 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400 shrink-0';
            avatarIcon.className = 'fa-solid fa-user text-2xl';
          }
        }
      }

      const summaryContainer = document.getElementById('profile-card-assets-summary');
      summaryContainer.innerHTML = '';

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
      p1.className = 'mb-2';
      p1.innerHTML = `<span class="text-slate-400">🏢 المشاريع التجارية:</span><div class="pl-2 mt-1 text-white font-bold">${bizList.length > 0 ? bizList.map(b => `• ${b}`).join('<br>') : 'لا توجد مشاريع نشطة'}</div>`;
      summaryContainer.appendChild(p1);

      const p2 = document.createElement('div');
      p2.innerHTML = `<span class="text-slate-400">🏡 العقارات والأصول:</span><div class="pl-2 mt-1 text-white font-bold">${assetList.length > 0 ? assetList.map(a => `• ${a}`).join('<br>') : 'لا توجد عقارات مملوكة'}</div>`;
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
            btnAddFriend.innerHTML = '<i class="fa-solid fa-check"></i> <span>صديق بالفعل</span>';
          } else {
            btnAddFriend.disabled = false;
            btnAddFriend.innerHTML = '<i class="fa-solid fa-user-plus"></i> <span>إضافة صديق</span>';
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
            btnProfileBlock.innerHTML = '<i class="fa-solid fa-ban"></i> <span class="text-rose-500">إلغاء الحظر</span>';
          } else {
            btnProfileBlock.innerHTML = '<i class="fa-solid fa-ban"></i> <span>حظر اللاعب</span>';
          }
        }
      }

      const isOnline = pState.lastSeen && (Date.now() - pState.lastSeen < 120000);
      const onlineBadge = document.getElementById('profile-card-online-badge');
      if (onlineBadge) {
        if (isOnline) {
          onlineBadge.textContent = 'متصل الآن 🟢';
          onlineBadge.className = 'px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/20 text-emerald-400 text-[9px]';
        } else {
          onlineBadge.textContent = 'غير متصل ⚪';
          onlineBadge.className = 'px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 text-[9px] border border-slate-800';
        }
      }

      document.getElementById('player-profile-modal').classList.remove('hidden');

      if (!isMe && typeof firebase !== 'undefined' && AppDB.isFirebaseReady) {
        firebase.firestore().collection('players').doc(username).get()
          .then(doc => {
            if (doc.exists) {
              window.employeesCache[username] = doc.data();
            }
          }).catch(() => {});
      }
    } catch (err) {
      showToast('خطأ بروفايل', err.message, 'error');
    }
  }

  async function handleMailAction(mailId, action) {
    try {
      const mailDoc = (window.lastMailsCache || []).find(m => m.id === mailId);
      if (!mailDoc) return;

      if (action === 'friend_accept') {
        GameEngine.state.friends = GameEngine.state.friends || [];
        if (!GameEngine.state.friends.includes(mailDoc.sender)) {
          GameEngine.state.friends.push(mailDoc.sender);
        }
        await AppDB.savePlayerState(GameEngine.activeUsername, GameEngine.state);
        await AppDB.updateMailStatus(mailId, 'accepted');
        showToast('تم قبول الصداقة', `أنت واللاعب ${mailDoc.sender} أصدقاء الآن! 🎉`, 'success');

        await AppDB.sendMail(GameEngine.state.username, mailDoc.sender, 'dm', { message: 'مرحباً بك! لقد قبلت طلب الصداقة، يمكننا الآن التنسيق في الصفقات والشراكات.' });
      } else if (action === 'job_accept') {
        GameEngine.state.hiredJob = {
          employer: mailDoc.sender,
          businessId: mailDoc.payload.businessId,
          businessName: mailDoc.payload.businessName,
          role: mailDoc.payload.role,
          salary: mailDoc.payload.salary
        };
        GameEngine.state.lastPuzzleSolved = Date.now();

        await AppDB.savePlayerState(GameEngine.activeUsername, GameEngine.state);
        await AppDB.updateMailStatus(mailId, 'accepted');
        showToast('تم التوظيف! 💼', `لقد التحقت بالعمل لدى ${mailDoc.sender} براتب ثنائي قدره ${mailDoc.payload.salary} EGP!`, 'success');

        await AppDB.sendMail(GameEngine.state.username, mailDoc.sender, 'dm', { message: `مرحباً! لقد قبلت عرض التوظيف في شركتك (${mailDoc.payload.businessName}). بدأت في حل المهام الآن.` });

        await AppDB.sendMail(GameEngine.state.username, mailDoc.sender, 'system_add_employee', {
          employee: GameEngine.state.username,
          businessId: mailDoc.payload.businessId,
          role: mailDoc.payload.role,
          salary: mailDoc.payload.salary
        });
      } else if (action === 'partnership_accept') {
        GameEngine.state.partnerships = GameEngine.state.partnerships || [];
        GameEngine.state.partnerships.push({
          employer: mailDoc.sender,
          businessId: mailDoc.payload.businessId,
          businessName: mailDoc.payload.businessName,
          sharePct: mailDoc.payload.sharePct
        });
        await AppDB.savePlayerState(GameEngine.activeUsername, GameEngine.state);
        await AppDB.updateMailStatus(mailId, 'accepted');
        showToast('شراكة معتمدة! 🤝', `أصبحت شريكاً رسمياً بنسبة ${Math.round(mailDoc.payload.sharePct * 100)}% من عوائد المشروع!`, 'success');

        await AppDB.sendMail(GameEngine.state.username, mailDoc.sender, 'dm', { message: `مرحباً شريكي! لقد قبلت دعوة الشراكة الاستثمارية في المشروع. لنعمل على تنمية الأرباح.` });

        await AppDB.sendMail(GameEngine.state.username, mailDoc.sender, 'system_add_partner', {
          partner: GameEngine.state.username,
          businessId: mailDoc.payload.businessId,
          sharePct: mailDoc.payload.sharePct
        });
      } else if (action === 'reject') {
        await AppDB.updateMailStatus(mailId, 'rejected');
        showToast('تم الرفض', 'تم رفض الطلب بنجاح.', 'info');
      }
      renderAll();
    } catch (err) {
      showToast('فشل العملية', err.message, 'error');
    }
  }

  function deleteMail(mailId) {
    if (confirm('هل أنت متأكد من رغبتك في حذف هذه الرسالة نهائياً؟')) {
      AppDB.deleteMail(mailId);
      showToast('حذف الرسالة', 'تم مسح الرسالة من صندوق الوارد.', 'info');
    }
  }

  function openJobOfferForm(username) {
    const select = document.getElementById('job-offer-business-select');
    if (!select) return;

    select.innerHTML = '';
    let hasBiz = false;

    if (GameEngine.state.businesses) {
      Object.keys(GameEngine.state.businesses).forEach(k => {
        const biz = GameEngine.state.businesses[k];
        if (biz.level > 0) {
          hasBiz = true;
          const opt = document.createElement('option');
          opt.value = k;
          opt.textContent = `${biz.name || k} (المستوى ${biz.level})`;
          select.appendChild(opt);
        }
      });
    }

    if (!hasBiz) {
      showToast('لا تملك شركات', 'يجب أن تملك مشروعاً تجارياً واحداً على الأقل لتوظيف لاعبين آخرين.', 'error');
      return;
    }

    document.getElementById('job-offer-target-username').value = username;
    document.getElementById('job-offer-form-modal').classList.remove('hidden');
    document.getElementById('player-profile-modal').classList.add('hidden');
  }

  function openPartnershipForm(username) {
    const select = document.getElementById('partnership-business-select');
    if (!select) return;

    select.innerHTML = '';
    let hasBiz = false;

    if (GameEngine.state.businesses) {
      Object.keys(GameEngine.state.businesses).forEach(k => {
        const biz = GameEngine.state.businesses[k];
        if (biz.level > 0) {
          hasBiz = true;
          const opt = document.createElement('option');
          opt.value = k;
          opt.textContent = `${biz.name || k} (المستوى ${biz.level})`;
          select.appendChild(opt);
        }
      });
    }

    if (!hasBiz) {
      showToast('لا تملك شركات', 'يجب أن تملك مشروعاً تجارياً واحداً على الأقل لإرسال دعوات الشراكة.', 'error');
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

      document.getElementById('riddle-equation-text').textContent = `${numA} + ${numB} = ?`;
      document.getElementById('riddle-answer-input').value = '';
      document.getElementById('riddle-verification-modal').classList.remove('hidden');
    }
  }

  async function checkAndStartAuction(auc) {
    if (auc.status !== 'pending') return;
    let shouldStart = false;
    const condVal = Number(auc.startConditionValue) || 0;
    if (auc.startConditionType === 'players') {
      const regCount = auc.registeredPlayers ? auc.registeredPlayers.length : 0;
      if (regCount >= condVal && condVal > 0) {
        shouldStart = true;
      }
    } else if (auc.startConditionType === 'time') {
      if (Date.now() >= condVal && condVal > 0) {
        shouldStart = true;
      }
    }

    if (shouldStart) {
      if (window.activeAuctionStartLock && window.activeAuctionStartLock[auc.id]) return;
      if (!window.activeAuctionStartLock) window.activeAuctionStartLock = {};
      window.activeAuctionStartLock[auc.id] = true;

      try {
        if (typeof firebase !== 'undefined' && AppDB.isFirebaseReady) {
          const db = firebase.firestore();
          await db.collection('liveAuctions').doc(auc.id).update({
            status: 'active',
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

    shelf.innerHTML = '';
    const active = list.filter(auc => auc.status !== 'ended');

    if (active.length === 0) {
      shelf.innerHTML = `<div class="col-span-full text-center text-slate-500 text-xs py-8">${window.currentLang === 'en' ? 'No live auctions currently available. Please wait for the admin to launch one.' : 'لا توجد مزادات حية متاحة حالياً. يرجى الانتظار لطرح مزاد جديد من قبل الإدارة.'}</div>`;
      return;
    }

    active.forEach(auc => {
      const card = document.createElement('div');
      card.className = 'p-5 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4 flex flex-col justify-between';

      const isRegistered = auc.registeredPlayers && auc.registeredPlayers.includes(GameEngine.state.username);

      let badgeHtml = '';
      let actionBtnHtml = '';
      let timerHtml = '';

      const translatedItemName = window.currentLang === 'en' ? (translationDict[auc.itemName] || auc.itemName) : auc.itemName;

      if (auc.status === 'pending') {
        badgeHtml = `<span class="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] text-slate-400">${window.currentLang === 'en' ? 'Registration Phase' : 'مرحلة التسجيل'}</span>`;

        let condText = '';
        if (auc.startConditionType === 'players') {
          condText = window.currentLang === 'en'
            ? `Auction starts once <strong>${auc.startConditionValue} players</strong> register (Registered: ${auc.registeredPlayers ? auc.registeredPlayers.length : 0})`
            : `يبدأ المزاد بمجرد تسجيل <strong>${auc.startConditionValue} لاعبين</strong> (المسجلون الآن: ${auc.registeredPlayers ? auc.registeredPlayers.length : 0})`;
        } else {
          const diff = Math.max(0, Math.ceil((auc.startConditionValue - Date.now()) / 60000));
          condText = window.currentLang === 'en'
            ? `Auction starts automatically in <strong>${diff} minutes</strong>`
            : `يبدأ المزاد تلقائياً بعد مرور <strong>${diff} دقيقة</strong>`;
        }

        actionBtnHtml = isRegistered
          ? `<button class="w-full py-2 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl text-xs font-bold" disabled>${window.currentLang === 'en' ? 'You are registered ✅' : 'أنت مسجل في المزاد بالفعل ✅'}</button>`
          : `<button onclick="window.UI.registerForAuction('${auc.id}')" class="w-full py-2 bg-yellow-500 hover:bg-yellow-400 text-slate-950 rounded-xl text-xs font-black transition">${window.currentLang === 'en' ? 'Register for Auction' : 'تسجيل للمشاركة في المزاد'}</button>`;

        timerHtml = `<div class="text-[10px] text-slate-400 text-center">${condText}</div>`;
      } else if (auc.status === 'active') {
        badgeHtml = `<span class="px-2 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/20 text-[10px] text-yellow-400 font-bold animate-pulse">${window.currentLang === 'en' ? 'Active Live Bidding 🔥' : 'مزايدة نشطة حية 🔥'}</span>`;

        const remSecs = Math.max(0, Math.ceil((auc.timerResetTimestamp - Date.now()) / 1000));

        if (remSecs === 0 && auc.timerResetTimestamp > 0) {
          triggerEndAuction(auc.id);
        }

        timerHtml = `
          <div class="flex justify-between items-center bg-slate-950/80 p-2.5 rounded-xl border border-slate-900">
            <span class="text-[10px] text-slate-400">${window.currentLang === 'en' ? 'Time Remaining:' : 'الوقت المتبقي للمزايدة:'}</span>
            <span class="numbers-font font-black text-rose-500 text-base animate-pulse">${remSecs} ${window.currentLang === 'en' ? 'seconds' : 'ثانية'}</span>
          </div>
        `;

        if (!isRegistered) {
          actionBtnHtml = `<button class="w-full py-2 bg-slate-900 border border-slate-800 text-slate-500 rounded-xl text-xs font-bold" disabled>${window.currentLang === 'en' ? 'Not pre-registered' : 'لم تقم بالتسجيل المسبق'}</button>`;
        } else {
          const nextMinBid = Math.floor(auc.currentBid * 1.05);
          const savedVal = savedInputs[auc.id];
          const valToUse = savedVal !== undefined ? savedVal : nextMinBid;
          actionBtnHtml = `
            <div class="flex gap-2">
              <input type="number" id="bid-input-${auc.id}" min="${nextMinBid}" value="${valToUse}" class="w-2/3 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-black text-white text-center">
              <button onclick="window.UI.placeAuctionBid('${auc.id}')" class="flex-1 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 rounded-xl text-xs font-black transition">${window.currentLang === 'en' ? 'Bid' : 'زايد'}</button>
            </div>
          `;
        }
      }

      card.innerHTML = `
        <div class="flex justify-between items-start border-b border-slate-800 pb-3">
          <div>
            <h4 class="font-black text-white text-sm">${translatedItemName}</h4>
            <span class="text-[10px] text-slate-400">${auc.itemType === 'property' ? (window.currentLang === 'en' ? 'Financial Property' : 'عقار مالي') : auc.itemType === 'business' ? (window.currentLang === 'en' ? 'Commercial Business' : 'مشروع تجاري') : (window.currentLang === 'en' ? 'Collectible Item' : 'غرض مقتنيات')}</span>
          </div>
          ${badgeHtml}
        </div>
        <div class="grid grid-cols-2 gap-3 py-2 text-xs">
          <div class="p-2 bg-slate-950/40 rounded-xl border border-slate-900">
            <span class="text-[9px] text-slate-400 block mb-0.5">${window.currentLang === 'en' ? 'Base Price:' : 'السعر الابتدائي:'}</span>
            <span class="numbers-font font-bold text-slate-300">${auc.basePrice.toLocaleString()} EGP</span>
          </div>
          <div class="p-2 bg-slate-950/40 rounded-xl border border-slate-900">
            <span class="text-[9px] text-slate-400 block mb-0.5">${window.currentLang === 'en' ? 'Highest Bid:' : 'أعلى عرض حالي:'}</span>
            <span class="numbers-font font-black text-yellow-500">${auc.currentBid.toLocaleString()} EGP</span>
          </div>
        </div>
        <div class="text-[10px] text-slate-400">
          <span>${window.currentLang === 'en' ? 'Current Highest Bidder:' : 'أعلى مزايد الآن:'} <strong class="text-white">${auc.highestBidder || (window.currentLang === 'en' ? 'None' : 'لا يوجد')}</strong></span>
        </div>
        ${timerHtml}
        ${actionBtnHtml}
      `;
      shelf.appendChild(card);
    });
  }

  async function registerForAuction(auctionId) {
    try {
      await AppDB.registerForAuction(auctionId, GameEngine.state.username);
      showToast('تم التسجيل بنجاح', 'تم تسجيل اسمك للمزايدة الحية بنجاح.', 'success');
    } catch (err) {
      showToast('فشل التسجيل', err.message, 'error');
    }
  }

  async function placeAuctionBid(auctionId) {
    const input = document.getElementById(`bid-input-${auctionId}`);
    if (!input) return;
    const val = parseInt(input.value || '0');
    if (val <= 0) return;

    // Check if player has enough money
    if (GameEngine.state.cash < val && GameEngine.state.bank < val) {
      showToast('رصيد غير كافي', 'لا تملك رصيداً كافياً لتقديم هذا العرض.', 'error');
      return;
    }

    try {
      await AppDB.placeAuctionBid(auctionId, GameEngine.state.username, val);
      showToast('تمت المزايدة', 'لقد قدمت عرض مزايدة أعلى بنجاح! 🚀', 'success');
    } catch (err) {
      showToast('فشل المزايدة', err.message, 'error');
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

    shelf.innerHTML = `<div class="col-span-full text-center text-slate-400 text-xs py-8">${window.currentLang === 'en' ? 'Fetching distressed business list...' : 'جاري جلب قائمة الشركات المتعثرة...'}</div>`;

    try {
      if (typeof firebase === 'undefined' || !AppDB.isFirebaseReady) {
        shelf.innerHTML = `<div class="col-span-full text-center text-slate-500 text-xs py-8">${window.currentLang === 'en' ? 'Acquisition market is only available in online mode.' : 'سوق الاستحواذ متاح فقط في وضع الأونلاين.'}</div>`;
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
        shelf.innerHTML = `<div class="col-span-full text-center text-slate-500 text-xs py-8">${window.currentLang === 'en' ? 'No distressed businesses available for acquisition at the moment.' : 'لا توجد شركات متعثرة معروضة للاستحواذ حالياً.'}</div>`;
        return;
      }

      shelf.innerHTML = '';
      distressed.forEach(item => {
        let totalInvestment = item.bizConfig.cost;
        for (let lvl = 0; lvl < item.level - 1; lvl++) {
          totalInvestment += Math.floor(item.bizConfig.cost * Math.pow(item.bizConfig.upgradeMultiplier, lvl));
        }

        const discountedPrice = Math.floor(totalInvestment * 0.55);

        const card = document.createElement('div');
        card.className = 'p-5 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4 flex flex-col justify-between';
        
        const translatedBizName = window.currentLang === 'en' ? (translationDict[item.bizConfig.name] || item.bizConfig.name) : item.bizConfig.name;

        card.innerHTML = `
          <div class="flex justify-between items-start border-b border-slate-800 pb-3">
            <div>
              <h4 class="font-black text-white text-sm">${translatedBizName || item.bizId}</h4>
              <span class="text-[10px] text-slate-400">${window.currentLang === 'en' ? 'Distressed Owner:' : 'المالك المتعثر:'} <strong class="text-rose-400 cursor-pointer hover:underline" onclick="window.UI.openPlayerProfileCard('${item.player}')">${item.player}</strong></span>
            </div>
            <span class="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-[10px] text-rose-400 font-bold">${window.currentLang === 'en' ? 'Acquisition Opportunity 📉' : 'فرصة استحواذ 📉'}</span>
          </div>
          <div class="grid grid-cols-2 gap-3 py-2 text-xs">
            <div class="p-2 bg-slate-950/40 rounded-xl border border-slate-900">
              <span class="text-[9px] text-slate-400 block mb-0.5">${window.currentLang === 'en' ? 'Current Level:' : 'المستوى الحالي:'}</span>
              <span class="font-bold text-slate-300">${window.currentLang === 'en' ? `Level ${item.level}` : `مستوى ${item.level}`}</span>
            </div>
            <div class="p-2 bg-slate-950/40 rounded-xl border border-slate-900">
              <span class="text-[9px] text-slate-400 block mb-0.5">${window.currentLang === 'en' ? 'Estimated Value:' : 'القيمة المقدرة:'}</span>
              <span class="numbers-font font-bold text-slate-400 line-through">${totalInvestment.toLocaleString()} EGP</span>
            </div>
          </div>
          <div class="flex justify-between items-center bg-slate-950/80 p-2.5 rounded-xl border border-slate-900">
            <span class="text-[10px] text-emerald-400 font-bold">${window.currentLang === 'en' ? 'Acquisition & Rescue Price (45% off):' : 'سعر الاستحواذ والإنقاذ (خصم 45%):'}</span>
            <span class="numbers-font font-black text-emerald-400 text-sm">${discountedPrice.toLocaleString()} EGP</span>
          </div>
          <button onclick="window.UI.acquireDistressedBusiness('${item.player}', '${item.bizId}', ${discountedPrice})" class="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black transition">${window.currentLang === 'en' ? 'Acquire & Rescue Business' : 'استحواذ وإنقاذ الشركة'}</button>
        `;
        
        shelf.appendChild(card);
      });

    } catch (err) {
      shelf.innerHTML = `<div class="col-span-full text-center text-rose-500 text-xs py-8">${window.currentLang === 'en' ? `Failed to load acquisition market: ${err.message}` : `فشل تحميل سوق الاستحواذ: ${err.message}`}</div>`;
    }
  }

  async function acquireDistressedBusiness(sellerUsername, bizId, price) {
    if (!confirm(`هل أنت متأكد من رغبتك في الاستحواذ على شركة (${bizId}) الخاصة باللاعب (${sellerUsername}) مقابل ${price.toLocaleString()} EGP؟ سيتم تحويل المبلغ له مباشرة لإنقاذه من التعثر المالي.`)) return;

    try {
      const buyerCash = GameEngine.state.cash;
      const buyerBank = GameEngine.state.bank;
      if (buyerCash < price && buyerBank < price) {
        showToast('رصيد غير كافي', 'لا تملك رصيداً كافياً لإتمام عملية الاستحواذ والإنقاذ.', 'error');
        return;
      }

      const sellerState = await AppDB.adminGetPlayer(sellerUsername);
      if (!sellerState) {
        showToast('خطأ الاستحواذ', 'تعذر العثور على بيانات البائع.', 'error');
        return;
      }

      const sellerRaw = sellerState.raw || sellerState;

      if (!sellerRaw.businesses || !sellerRaw.businesses[bizId] || sellerRaw.businesses[bizId].level <= 0) {
        showToast('خطأ الاستحواذ', 'لم تعد هذه الشركة معروضة للاستحواذ.', 'error');
        renderAcquisitionMarket();
        return;
      }
      if (sellerRaw.cash > 0) {
        showToast('خطأ الاستحواذ', 'اللاعب لم يعد متعثراً مالياً.', 'error');
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
        showToast('دمج وتطوير الشركة', `بما أنك تملك هذا المشروع بالفعل، تم دمج الكيانين وترقية مستواك إلى المستوى ${newLevel}!`, 'info');
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

      await AppDB.sendMail('SYSTEM_ACQUISITION', sellerUsername, 'system_notification', {
        message: `🤝 تم الاستحواذ وإنقاذ مشروعك (${GameEngine.BUSINESSES[bizId].name}) من قبل اللاعب (${GameEngine.state.username})! تمت إضافة +${price.toLocaleString()} EGP لحسابك وتمت تسوية تعثرك المالي.`
      });

      showToast('تم الاستحواذ والإنقاذ! 🎉', `لقد تملكت الشركة بنجاح وتم تحويل ${price.toLocaleString()} EGP لمساعدة اللاعب ${sellerUsername}.`, 'success');
      
      renderAll();
      renderAcquisitionMarket();

    } catch (err) {
      showToast('فشل الاستحواذ', err.message, 'error');
    }
  }

  async function triggerEndAuction(auctionId) {
    if (window.activeAuctionEndLock && window.activeAuctionEndLock[auctionId]) return;
    if (!window.activeAuctionEndLock) window.activeAuctionEndLock = {};
    window.activeAuctionEndLock[auctionId] = true;

    try {
      if (typeof firebase !== 'undefined' && AppDB.isFirebaseReady) {
        const db = firebase.firestore();
        const docRef = db.collection('liveAuctions').doc(auctionId);

        await db.runTransaction(async transaction => {
          const doc = await transaction.get(docRef);
          if (!doc.exists) return;
          const data = doc.data();
          if (data.status !== 'active') return;

          transaction.update(docRef, { status: 'ended' });

          const winner = data.highestBidder;
          const price = data.currentBid;

          if (winner) {
            const winMail = {
              sender: 'SYSTEM_AUCTION',
              recipient: winner,
              type: 'auction_win',
              payload: {
                auctionId,
                itemName: data.itemName,
                itemType: data.itemType,
                itemId: data.itemId,
                price
              },
              timestamp: Date.now(),
              status: 'pending'
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

    const wins = mails.filter(m => m.type === 'auction_win' && m.status === 'pending');
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

        if (type === 'property') {
          GameEngine.state.assets = GameEngine.state.assets || {};
          GameEngine.state.assets[id] = (GameEngine.state.assets[id] || 0) + 1;
        } else if (type === 'business') {
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
        } else if (type === 'item') {
          GameEngine.state.inventory = GameEngine.state.inventory || {};
          GameEngine.state.inventory[id] = (GameEngine.state.inventory[id] || 0) + 1;
        }

        GameEngine.state.netWorth = GameEngine.calculateNetWorth();
        await AppDB.savePlayerState(GameEngine.activeUsername, GameEngine.state);
        await AppDB.updateMailStatus(win.id, 'accepted');

        showToast('🏆 فزت بالمزاد!', `تهانينا! لقد فزت بمزاد (${win.payload.itemName}) مقابل ${price.toLocaleString()} EGP تم خصمها من حسابك.`, 'success');
        renderAll();
      } catch (err) {
        console.error('[Mailbox System] Failed to process auction win:', err);
      }
    }

    const empAdds = mails.filter(m => m.type === 'system_add_employee' && m.status === 'pending');
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
        await AppDB.updateMailStatus(add.id, 'accepted');
        showToast('موظف جديد 💼', `التحق اللاعب ${emp} بالعمل في مشروعك (${biz.name || bizId}) كمساعد براتب ${salary} EGP/ث!`, 'success');
        renderAll();
      }
    }

    const partAdds = mails.filter(m => m.type === 'system_add_partner' && m.status === 'pending');
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
        await AppDB.updateMailStatus(add.id, 'accepted');
        showToast('شريك جديد 🤝', `انضم اللاعب ${partner} كشريك استثماري بنسبة أرباح ${Math.round(sharePct * 100)}%!`, 'success');
        renderAll();
      }
    }

    const divs = mails.filter(m => m.type === 'dividend_claim' && m.status === 'pending');
    for (const div of divs) {
      try {
        const amt = div.payload.amount;
        GameEngine.state.cash += amt;
        GameEngine.state.netWorth = GameEngine.calculateNetWorth();
        await AppDB.savePlayerState(GameEngine.activeUsername, GameEngine.state);
        await AppDB.updateMailStatus(div.id, 'accepted');
        showToast('💸 أرباح شراكة استثمارية', `تمت إضافة +${amt.toLocaleString()} EGP من أرباحك في شراكة مشروع (${div.payload.businessId})!`, 'success');
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
              await AppDB.sendMail('SYSTEM_DIVIDEND', partner, 'dividend_claim', {
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
  async function renderCorporationsTab() {
    const container = document.getElementById('corporations-main-container');
    if (!container) return;

    if (typeof firebase === 'undefined' || !AppDB.isFirebaseReady) {
      container.innerHTML = `
        <div class="glass-panel p-6 text-center rounded-2xl border border-slate-800 bg-slate-950/40">
          <p class="text-slate-400 text-xs py-8">${window.currentLang === 'en' ? 'Joint Corporations are only available in online mode (with Firebase cloud connection).' : 'الشركات المشتركة متاحة فقط في وضع الأونلاين (مع اتصال سحابة Firebase).'}</p>
        </div>
      `;
      return;
    }

    const currentUsername = GameEngine.activeUsername || (GameEngine.state && GameEngine.state.username);
    const corp = window.activeCorporationState;

    if (!corp) {
      let list = window.lastCorporationsCache || [];
      if (!GameEngine.state.isAdmin) {
        list = list.filter(c => !c.isAdminCorp && c.founder !== 'admin');
      }
      
      let corpCardsHtml = '';
      if (list.length === 0) {
        corpCardsHtml = `
          <div class="col-span-full text-center text-slate-500 text-xs py-12">
            ${window.currentLang === 'en' ? 'No joint corporations registered on the server yet. Be the first to establish one!' : 'لا توجد أي شركات مشتركة مسجلة في السيرفر حالياً. كن أول من يؤسس شركة!'}
          </div>
        `;
      } else {
        list.forEach(c => {
          const membersCount = c.members ? c.members.length : 0;
          const treasuryVal = c.treasury || 0;
          corpCardsHtml += `
            <div class="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-950/20 hover:border-indigo-500/30 transition flex flex-col justify-between">
              <div>
                <h4 class="text-sm font-black text-white flex items-center gap-1.5">
                  <i class="fa-solid fa-building text-indigo-400"></i>
                  <span>${c.name}</span>
                </h4>
                <p class="text-slate-400 text-xs mt-1 min-h-[32px]">${c.desc || (window.currentLang === 'en' ? 'No description.' : 'لا يوجد وصف.')}</p>
                <div class="grid grid-cols-2 gap-2 mt-4 bg-slate-950/50 p-2.5 rounded-xl border border-slate-900/60 text-[10px]">
                  <div>
                    <span class="text-slate-500 block">${window.currentLang === 'en' ? 'Founder' : 'المؤسس'}</span>
                    <span class="text-slate-300 font-bold">${c.founder}</span>
                  </div>
                  <div>
                    <span class="text-slate-500 block">${window.currentLang === 'en' ? 'Members' : 'عدد الأعضاء'}</span>
                    <span class="text-slate-300 font-bold">${membersCount} ${window.currentLang === 'en' ? 'players' : 'لاعب'}</span>
                  </div>
                  <div class="col-span-2 border-t border-slate-900/40 pt-2 mt-1">
                    <span class="text-slate-500 block">${window.currentLang === 'en' ? 'Corp Treasury' : 'خزينة الشركة'}</span>
                    <span class="text-emerald-400 font-black numbers-font text-xs">${treasuryVal.toLocaleString()} EGP</span>
                  </div>
                </div>
              </div>
              <button onclick="window.UI.joinCorporationAction('${c.id}')" class="w-full mt-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition">${window.currentLang === 'en' ? 'Apply to Join' : 'تقديم طلب انضمام'}</button>
            </div>
          `;
        });
      }

      container.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-950/40 space-y-4">
            <h3 class="text-sm font-black text-white flex items-center gap-1.5">
              <i class="fa-solid fa-plus text-indigo-500"></i>
              <span>${window.currentLang === 'en' ? 'Establish New Joint Corp' : 'تأسيس شركة مشتركة جديدة'}</span>
            </h3>
            <p class="text-slate-400 text-[11px]">${window.currentLang === 'en' ? 'Establishing a corporation requires paying a heavy regulatory fee of 100 Billion EGP. The treasury will start from zero, and members must contribute capital to purchase projects.' : 'يتطلب تأسيس شركة دفع رسوم تنظيمية باهظة للبلدية تبلغ 100 مليار جنيه. ستبدأ الخزينة من الصفر وسينبغي ضخ مساهمات لشراء المشاريع.'}</p>
            
            <div class="space-y-3">
              <div>
                <label class="text-[10px] text-slate-400 block mb-1">${window.currentLang === 'en' ? 'Corporation Name' : 'اسم الشركة'}</label>
                <input id="create-corp-name" type="text" placeholder="${window.currentLang === 'en' ? 'e.g. Arab Contractors Alliance' : 'مثال: تحالف المقاولون العرب'}" class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500">
              </div>
              <div>
                <label class="text-[10px] text-slate-400 block mb-1">${window.currentLang === 'en' ? 'Activity Description (Optional)' : 'وصف نشاط الشركة (اختياري)'}</label>
                <textarea id="create-corp-desc" rows="3" placeholder="${window.currentLang === 'en' ? 'Write a brief description of the financial alliance vision...' : 'اكتب نبذة عن رؤية وتوجه التحالف المالي...'}" class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none"></textarea>
              </div>
            </div>

            <button onclick="window.UI.createCorporationAction()" class="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-600/10 transition">
              ${window.currentLang === 'en' ? 'Establish Corporation (Pay 100B EGP)' : 'تأسيس الشركة (خصم 100 مليار ج.م)'}
            </button>
          </div>

          <div class="lg:col-span-2 space-y-4">
            <h3 class="text-sm font-black text-white flex items-center gap-1.5">
              <i class="fa-solid fa-list text-slate-400"></i>
              <span>${window.currentLang === 'en' ? 'Registered Server Corporations List' : 'قائمة الشركات المسجلة على السيرفر'}</span>
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              ${corpCardsHtml}
            </div>
          </div>
        </div>
      `;
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
        Object.keys(corp.projects).forEach(projId => {
          if (corp.projects[projId] && GameEngine.CORP_PROJECTS[projId]) {
            totalCorpTickProfit += GameEngine.CORP_PROJECTS[projId].profitPerTick;
          }
        });
      }

      const myShareTickProfit = Math.floor(totalCorpTickProfit * sharePct);

      let membersHtml = '';
      membersList.forEach(m => {
        const cAmt = corp.contributions ? (corp.contributions[m] || 0) : 0;
        let mShare = totalCont > 0 ? (cAmt / totalCont) : (m === corp.founder ? 1.0 : 0.0);
        const isMe = m === currentUsername;
        const isMemberFounder = m === corp.founder;

        const role = (corp.roles && corp.roles[m]) || (isMemberFounder ? 'founder' : 'member');
        let roleBadge = `<span class="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded ml-1">${window.currentLang === 'en' ? 'Shareholder 👤' : 'مساهم 👤'}</span>`;
        if (role === 'founder') {
          roleBadge = `<span class="text-[9px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded ml-1">${window.currentLang === 'en' ? 'Founder 👑' : 'مؤسس 👑'}</span>`;
        } else if (role === 'cfo') {
          roleBadge = `<span class="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded ml-1">${window.currentLang === 'en' ? 'CFO 💼' : 'مدير مالي 💼'}</span>`;
        }

        let actions = '';
        if (isFounder && !isMemberFounder) {
          if (role === 'member') {
            actions += `<button onclick="window.UI.promoteCorpMemberAction('${corp.id}', '${m}', 'cfo')" class="text-[9px] bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded transition font-bold mr-1" title="${window.currentLang === 'en' ? 'Promote to CFO' : 'ترقية لمدير مالي'}"><i class="fa-solid fa-user-tie"></i></button>`;
          } else if (role === 'cfo') {
            actions += `<button onclick="window.UI.promoteCorpMemberAction('${corp.id}', '${m}', 'member')" class="text-[9px] bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded transition font-bold mr-1" title="${window.currentLang === 'en' ? 'Demote to Shareholder' : 'تنزيل لمساهم عادي'}"><i class="fa-solid fa-user-minus"></i></button>`;
          }
          actions += `<button onclick="window.UI.kickCorpMemberAction('${corp.id}','${m}')" class="text-[9px] bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded transition font-bold" title="${window.currentLang === 'en' ? 'Kick' : 'طرد'}"><i class='fa-solid fa-user-slash'></i></button>`;
        }

        membersHtml += `
          <tr class="border-b border-slate-900 text-xs">
            <td class="py-2.5 text-slate-300 font-bold">
              ${m} 
              ${roleBadge}
              ${isMe && !isMemberFounder ? `<span class="text-[9px] bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded ml-1">${window.currentLang === 'en' ? 'You' : 'أنت'}</span>` : ''}
            </td>
            <td class="py-2.5 text-slate-400 numbers-font">${cAmt.toLocaleString()} EGP</td>
            <td class="py-2.5 text-emerald-400 font-bold numbers-font">${(mShare * 100).toFixed(2)}%</td>
            <td class="py-2.5 text-left">
              ${actions}
            </td>
          </tr>
        `;
      });

      let projectsHtml = '';
      Object.keys(GameEngine.CORP_PROJECTS).forEach(projId => {
        const p = GameEngine.CORP_PROJECTS[projId];
        const owned = corp.projects && corp.projects[projId];
        const membersCount = corp.members ? corp.members.length : 0;
        const meetsCondition = membersCount >= (p.minMembers || 1);
        
        let statusBadge = '';
        let projectActionBtn = '';
        
        const translatedProjName = window.currentLang === 'en' ? (translationDict[p.name] || p.name) : p.name;

        if (owned) {
          statusBadge = `<span class="text-[10px] bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded-full font-bold">${window.currentLang === 'en' ? 'Owned by Corp ✅' : 'مملوك للشركة ✅'}</span>`;
          projectActionBtn = `<button class="w-full py-2 bg-slate-900 border border-slate-800 text-slate-500 rounded-xl text-xs font-bold" disabled>${window.currentLang === 'en' ? 'Generates yield for shareholders' : 'يولد أرباحاً للمساهمين'}</button>`;
        } else {
          statusBadge = `<span class="text-[10px] bg-slate-800 border border-slate-700 text-slate-400 px-2 py-0.5 rounded-full font-bold">${window.currentLang === 'en' ? 'Not Owned' : 'غير مملوك'}</span>`;
          if (isFounder) {
            if (meetsCondition) {
              projectActionBtn = `<button onclick="window.UI.buyCorporationProjectAction('${corp.id}', '${p.id}', ${p.cost})" class="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition">${window.currentLang === 'en' ? 'Buy Project from Treasury' : 'شراء المشروع من الخزينة'}</button>`;
            } else {
              projectActionBtn = `<button class="w-full py-2 bg-slate-900 border border-slate-800 text-rose-500/70 rounded-xl text-xs font-bold cursor-not-allowed" disabled>${window.currentLang === 'en' ? 'Condition not met ❌' : 'الشرط غير مستوفٍ ❌'}</button>`;
            }
          } else {
            projectActionBtn = `<button class="w-full py-2 bg-slate-900 border border-slate-800 text-slate-600 rounded-xl text-xs font-bold" disabled>${window.currentLang === 'en' ? 'Available to founder only' : 'متاح للمؤسس فقط'}</button>`;
          }
        }

        projectsHtml += `
          <div class="glass-panel p-5 rounded-2xl border ${owned ? 'border-emerald-500/20 bg-emerald-950/5' : 'border-slate-800 bg-slate-950/20'} flex flex-col justify-between space-y-4">
            <div>
              <div class="flex justify-between items-start gap-2">
                <h4 class="text-xs font-black text-white">${translatedProjName}</h4>
                ${statusBadge}
              </div>
              <div class="grid grid-cols-2 gap-2 mt-4 bg-slate-950/50 p-2.5 rounded-xl border border-slate-900/60 text-[10px]">
                <div>
                  <span class="text-slate-500 block">${window.currentLang === 'en' ? 'Investment Cost' : 'تكلفة الاستثمار'}</span>
                  <span class="text-slate-300 font-bold numbers-font text-xs">${p.cost.toLocaleString()} EGP</span>
                </div>
                <div>
                  <span class="text-slate-500 block">${window.currentLang === 'en' ? 'Total Yield' : 'العائد الإجمالي'}</span>
                  <span class="text-emerald-400 font-black numbers-font text-xs">+${p.profitPerTick.toLocaleString()}/tick</span>
                </div>
              </div>
              <div class="mt-3 text-[9.5px] ${meetsCondition ? 'text-emerald-400/90' : 'text-rose-400'} font-bold flex items-center gap-1">
                <i class="fa-solid fa-users text-[10px]"></i>
                <span>${window.currentLang === 'en' ? `Shareholder Condition: Min ${p.minMembers} players (Current: ${membersCount})` : `شرط المساهمين: لا يقل عن ${p.minMembers} لاعبين (المتوفر: ${membersCount})`}</span>
              </div>
            </div>
            ${projectActionBtn}
          </div>
        `;
      });

      const corpLevel = corp.level || 1;
      const corpBoostPct = (corpLevel - 1) * 5;
      const isCfo = (corp.roles && corp.roles[currentUsername]) === 'cfo';
      const hasStaffPower = isFounder || isCfo;

      container.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2 glass-panel p-6 rounded-2xl border border-indigo-500/10 bg-slate-950/40 relative overflow-hidden flex flex-col justify-between">
            <div>
              <div class="flex justify-between items-start">
                <h3 class="text-lg font-black text-white flex items-center gap-2">
                  <i class="fa-solid fa-building text-indigo-500"></i>
                  <span>${corp.name}</span>
                </h3>
                <span class="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full font-bold">${window.currentLang === 'en' ? 'Alliance Level:' : 'مستوى التحالف:'} ${corpLevel} 🏆</span>
              </div>
              <p class="text-slate-400 text-xs mt-2">${corp.desc || (window.currentLang === 'en' ? 'No description.' : 'لا يوجد وصف تجاري.')}</p>
              <div class="mt-2.5 text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                <i class="fa-solid fa-chart-line"></i>
                <span>${window.currentLang === 'en' ? `Member individual business profit boost: +${corpBoostPct}% (Active)` : `دعم أرباح المشاريع الفردية لأعضاء التحالف: +${corpBoostPct}% (نشط)`}</span>
              </div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6 bg-slate-950/70 p-4 rounded-xl border border-slate-900">
              <div>
                <span class="text-[10px] text-slate-500 block">${window.currentLang === 'en' ? 'Available Treasury' : 'الخزينة المتوفرة'}</span>
                <span class="text-emerald-400 font-black text-sm numbers-font">${(corp.treasury || 0).toLocaleString()} EGP</span>
              </div>
              <div>
                <span class="text-[10px] text-slate-500 block">${window.currentLang === 'en' ? 'Personal Contributions' : 'مساهماتك الشخصية'}</span>
                <span class="text-slate-300 font-bold text-sm numbers-font">${myCont.toLocaleString()} EGP</span>
              </div>
              <div>
                <span class="text-[10px] text-slate-500 block">${window.currentLang === 'en' ? 'Profit Share' : 'حصتك من الأرباح'}</span>
                <span class="text-indigo-400 font-black text-sm numbers-font">${(sharePct * 100).toFixed(2)}%</span>
              </div>
              <div>
                <span class="text-[10px] text-slate-500 block">${window.currentLang === 'en' ? 'Your Profit / tick' : 'أرباحك / tick'}</span>
                <span class="text-emerald-400 font-black text-sm numbers-font">+${myShareTickProfit.toLocaleString()} EGP</span>
              </div>
            </div>
          </div>

          <div class="space-y-4">
            <!-- Card 1: Contribute -->
            <div class="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-950/40 space-y-3">
              <h3 class="text-xs font-black text-white flex items-center gap-1.5">
                <i class="fa-solid fa-piggy-bank text-indigo-400"></i>
                <span>${window.currentLang === 'en' ? 'Contribute Capital to Treasury' : 'ضخ أموال في الخزينة المشتركة'}</span>
              </h3>
              <p class="text-slate-400 text-[10px] leading-relaxed">${window.currentLang === 'en' ? 'Every amount you contribute increases the treasury size to purchase projects, and automatically increases your profit percentage share compared to other partners.' : 'كل مبلغ تضخه يزيد من حجم الخزينة لشراء المشاريع، ويرفع حصتك المئوية من الأرباح تلقائياً مقارنة بالشركاء الآخرين.'}</p>
              <div>
                <label class="text-[9px] text-slate-500 block mb-1">${window.currentLang === 'en' ? 'Amount to Contribute (EGP)' : 'المبلغ المراد ضخه (EGP)'}</label>
                <input id="contribute-corp-amount" type="number" placeholder="${window.currentLang === 'en' ? 'e.g. 5000000000' : 'مثال: 5000000000'}" class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500">
              </div>
              <button onclick="window.UI.contributeCorporationAction('${corp.id}')" class="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black transition">
                ${window.currentLang === 'en' ? 'Confirm Capital Contribution' : 'تأكيد ضخ السيولة'}
              </button>
            </div>

            <!-- Card 2: Upgrade Corporation -->
            <div class="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-950/40 space-y-3">
              <h3 class="text-xs font-black text-white flex items-center gap-1.5">
                <i class="fa-solid fa-circle-up text-amber-500"></i>
                <span>${window.currentLang === 'en' ? 'Upgrade Joint Alliance Level' : 'ترقية مستوى التحالف المشترك'}</span>
              </h3>
              <p class="text-slate-400 text-[10px] leading-relaxed">${window.currentLang === 'en' ? 'Every upgrade increases the alliance level and raises the member business profit boost by an additional +5%.' : 'كل ترقية ترفع مستوى التحالف وتزيد من دعم أرباح المشاريع الفردية للأعضاء بنسبة +5% إضافية.'}</p>
              
              <div class="bg-slate-950/50 p-2 rounded-lg border border-slate-900 text-[10px] space-y-1">
                <div class="flex justify-between">
                  <span class="text-slate-500">${window.currentLang === 'en' ? 'Current Level:' : 'المستوى الحالي:'}</span>
                  <span class="text-white font-bold">${corpLevel}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-500">${window.currentLang === 'en' ? 'Next Level:' : 'المستوى القادم:'}</span>
                  <span class="text-amber-400 font-bold">${corpLevel + 1}</span>
                </div>
                <div class="flex justify-between border-t border-slate-900 pt-1 mt-1">
                  <span class="text-slate-500">${window.currentLang === 'en' ? 'Upgrade Cost:' : 'تكلفة الترقية:'}</span>
                  <span class="text-emerald-400 font-black numbers-font">${(corpLevel * 20000000000).toLocaleString()} EGP</span>
                </div>
              </div>

              <button onclick="window.UI.upgradeCorporationLevelAction('${corp.id}', ${corpLevel * 20000000000})" class="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-black transition">
                ${window.currentLang === 'en' ? 'Upgrade Alliance Now' : 'ترقية التحالف الآن'}
              </button>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div class="lg:col-span-2 space-y-4">
            <h3 class="text-sm font-black text-white flex items-center gap-1.5">
              <i class="fa-solid fa-industry text-slate-400"></i>
              <span>${window.currentLang === 'en' ? 'Megaprojects' : 'مشاريع الشركة العملاقة (Megaprojects)'}</span>
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              ${projectsHtml}
            </div>
          </div>

          <div class="glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-950/40 space-y-4 h-fit">
            <h3 class="text-sm font-black text-white flex items-center gap-1.5">
              <i class="fa-solid fa-users text-slate-400"></i>
              <span>${window.currentLang === 'en' ? 'Partners & Shareholders' : 'الشركاء والمساهمين'} (${membersList.length})</span>
            </h3>
            <div class="overflow-x-auto">
              <table class="w-full text-right">
                <thead>
                  <tr class="border-b border-slate-800 text-[10px] text-slate-500">
                    <th class="pb-2">${window.currentLang === 'en' ? 'Name' : 'الاسم'}</th>
                    <th class="pb-2">${window.currentLang === 'en' ? 'Contribution' : 'المساهمة'}</th>
                    <th class="pb-2">${window.currentLang === 'en' ? 'Share' : 'الحصة'}</th>
                    <th class="pb-2 text-left">${window.currentLang === 'en' ? 'Control' : 'التحكم'}</th>
                  </tr>
                </thead>
                <tbody>
                  ${membersHtml}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        ${hasStaffPower ? `
        <div class="mt-6 glass-panel p-6 rounded-2xl border border-amber-500/20 bg-slate-900/40 space-y-5">
          <h3 class="text-sm font-black text-amber-400 flex items-center gap-2">
            <i class="fa-solid fa-toolbox"></i>
            <span>${window.currentLang === 'en' ? 'Financial Supervision & Alliance Management' : 'لوحة الإشراف المالي وإدارة التحالف'}</span>
          </h3>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- 1. Payout Section (Founder and CFOs) -->
            <div class="bg-slate-950/50 border border-slate-800 rounded-xl p-4 space-y-3">
              <h4 class="text-xs font-black text-white flex items-center gap-1.5">
                <i class="fa-solid fa-money-bill-transfer text-emerald-400"></i>
                <span>${window.currentLang === 'en' ? 'Transfer Funds from Treasury to Members' : 'تحويل السيولة من الخزينة للأعضاء'}</span>
              </h4>
              <p class="text-[10px] text-slate-500 font-bold">${window.currentLang === 'en' ? 'Withdraw specific amounts from the alliance treasury and transfer it as cash balance to any member.' : 'سحب مبالغ محددة من خزينة التحالف وتحويلها ككاش رصيد لأي عضو.'}</p>
              
              <div class="space-y-2">
                <div>
                  <label class="text-[9px] text-slate-400 block mb-1">${window.currentLang === 'en' ? 'Select Target Member' : 'اختر العضو المستهدف'}</label>
                  <select id="payout-corp-target" class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500">
                    <option value="">${window.currentLang === 'en' ? '-- Select a partner --' : '-- اختر شريكاً --'}</option>
                    ${membersList.map(m => `<option value="${m}">${m} ${(corp.roles && corp.roles[m] === 'cfo') ? '[CFO]' : (m === corp.founder ? '[Founder]' : '')}</option>`).join('')}
                  </select>
                </div>
                <div>
                  <label class="text-[9px] text-slate-400 block mb-1">${window.currentLang === 'en' ? 'Amount to Withdraw (EGP)' : 'المبلغ المراد سحبه وتحويله (EGP)'}</label>
                  <input id="payout-corp-amount" type="number" placeholder="${window.currentLang === 'en' ? 'e.g. 100000000' : 'مثال: 100000000'}" class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500">
                </div>
              </div>

              <button onclick="window.UI.payoutFromCorpTreasuryAction('${corp.id}')" class="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition">
                ${window.currentLang === 'en' ? 'Confirm Fund Withdrawal' : 'تأكيد سحب وتحويل السيولة'}
              </button>
            </div>

            <!-- 2. Founder Only Controls -->
            ${isFounder ? `
            <div class="bg-slate-950/50 border border-slate-800 rounded-xl p-4 space-y-3">
              <h4 class="text-xs font-black text-white flex items-center gap-1.5"><i class="fa-solid fa-pen text-indigo-400"></i> ${window.currentLang === 'en' ? 'Edit Corp Details' : 'تعديل بيانات الشركة'}</h4>
              <div>
                <label class="text-[10px] text-slate-400 block mb-1">${window.currentLang === 'en' ? 'New Corp Name' : 'اسم جديد للشركة'}</label>
                <input id="edit-corp-name" type="text" value="${corp.name}" class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500">
              </div>
              <div>
                <label class="text-[10px] text-slate-400 block mb-1">${window.currentLang === 'en' ? 'New Corp Description' : 'وصف جديد للشركة'}</label>
                <textarea id="edit-corp-desc" rows="2" class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none">${corp.desc || ''}</textarea>
              </div>
              <button onclick="window.UI.editCorpInfoAction('${corp.id}')" class="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black transition">
                <i class="fa-solid fa-floppy-disk ml-1"></i> ${window.currentLang === 'en' ? 'Save Changes' : 'حفظ التعديلات'}
              </button>
            </div>

            <!-- 3. Owner Actions -->
            <div class="col-span-1 md:col-span-2 bg-slate-950/50 border border-slate-800 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-2">
                <h4 class="text-xs font-black text-white flex items-center gap-1.5"><i class="fa-solid fa-arrows-rotate text-amber-400"></i> ${window.currentLang === 'en' ? 'Transfer Ownership' : 'نقل الملكية'}</h4>
                <p class="text-[10px] text-slate-500 font-bold">${window.currentLang === 'en' ? 'Transfer the founder title to another member. This action is irreversible.' : 'نقل لقب المؤسس لعضو آخر. لا يمكن التراجع.'}</p>
                <select id="transfer-corp-target" class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500">
                  <option value="">${window.currentLang === 'en' ? '-- Select a member --' : '-- اختر عضواً --'}</option>
                  ${membersList.filter(m => m !== currentUsername).map(m => `<option value="${m}">${m}</option>`).join('')}
                </select>
                <button onclick="window.UI.transferCorpOwnershipAction('${corp.id}')" class="w-full py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-black transition">
                  ${window.currentLang === 'en' ? 'Transfer Ownership' : 'نقل الملكية'}
                </button>
              </div>

              <div class="space-y-2 flex flex-col justify-between">
                <div>
                  <h4 class="text-xs font-black text-rose-400 flex items-center gap-1.5"><i class="fa-solid fa-triangle-exclamation"></i> ${window.currentLang === 'en' ? 'Danger Zone' : 'منطقة الخطر'}</h4>
                  <p class="text-[10px] text-slate-500 font-bold">${window.currentLang === 'en' ? 'Permanently dissolve the joint corporation and refund balances to shareholders.' : 'حل الشركة المشتركة نهائياً وإعادة الأرصدة للمساهمين.'}</p>
                </div>
                <button onclick="window.UI.dissolveCorpAction('${corp.id}')" class="w-full py-2 bg-rose-700/30 hover:bg-rose-700/50 border border-rose-700/40 text-rose-300 rounded-xl text-xs font-black transition">
                  <i class="fa-solid fa-bomb ml-1"></i> ${window.currentLang === 'en' ? 'Dissolve Joint Corp Completely' : 'حل الشركة المشتركة بالكامل'}
                </button>
              </div>
            </div>
            ` : `
            <!-- CFO Info Box -->
            <div class="bg-slate-950/50 border border-slate-800 rounded-xl p-4 flex items-center justify-center text-center">
              <div class="space-y-1">
                <i class="fa-solid fa-user-shield text-emerald-400 text-2xl"></i>
                <h4 class="text-xs font-black text-white">${window.currentLang === 'en' ? 'Your Role: Alliance CFO' : 'أنت تشغل رتبة: مدير مالي للتحالف'}</h4>
                <p class="text-[10px] text-slate-500">${window.currentLang === 'en' ? 'You have the authority to withdraw/transfer funds from the treasury to members, buy projects, and upgrade alliance level.' : 'لديك الصلاحية لسحب وتحويل الأموال من الخزينة للأعضاء وشراء المشاريع وترقية مستوى التحالف.'}</p>
              </div>
            </div>
            `}
          </div>
        </div>` : ''}
      `;
    }
  }

  async function createCorporationAction() {
    const nameInput = document.getElementById('create-corp-name');
    const descInput = document.getElementById('create-corp-desc');
    if (!nameInput) return;

    const name = nameInput.value.trim();
    const desc = descInput ? descInput.value.trim() : '';

    if (!name) {
      showToast('خطأ التأسيس', 'يرجى إدخال اسم للشركة المشتركة أولاً.', 'error');
      return;
    }

    const cost = 100000000000;
    const currentCash = GameEngine.state.cash;
    const currentBank = GameEngine.state.bank;

    if (currentCash < cost && currentBank < cost) {
      showToast('رصيد غير كافي', 'تأسيس الشركة يتطلب دفع 100 مليار جنيه، ورصيدك الحالي لا يكفي.', 'error');
      return;
    }

    if (!confirm(`هل أنت متأكد من رغبتك في تأسيس شركة "${name}" مقابل دفع رسوم باهظة تبلغ 100,000,000,000 EGP من رصيدك؟`)) return;

    try {
      if (GameEngine.state.cash >= cost) {
        GameEngine.state.cash -= cost;
      } else {
        GameEngine.state.bank -= cost;
      }

      GameEngine.state.netWorth = GameEngine.calculateNetWorth();
      await AppDB.savePlayerState(GameEngine.activeUsername, GameEngine.state);

      const corpId = await AppDB.createCorporation(name, desc, GameEngine.state.username);

      showToast('مبروك التأسيس! 🏢🎉', `تم تأسيس شركة مشتركة باسم "${name}" بنجاح وخصم 100 مليار جنيه رسوم تأسيس.`, 'success');
      playMenuSound('success');
      renderAll();

    } catch (err) {
      showToast('فشل التأسيس', err.message, 'error');
    }
  }

  async function joinCorporationAction(corpId) {
    try {
      const username = GameEngine.activeUsername || (GameEngine.state && GameEngine.state.username);
      if (!username) throw new Error('يرجى تسجيل الدخول أولاً.');
      await AppDB.joinCorporation(corpId, username);
      showToast('تم الانضمام! 🤝', 'لقد انضممت بنجاح لعضوية الشركة المشتركة. يمكنك الآن ضخ المساهمات ومتابعة الأرباح.', 'success');
      playMenuSound('success');
    } catch (err) {
      showToast('فشل الانضمام', err.message, 'error');
    }
  }

  async function contributeCorporationAction(corpId) {
    const amountInput = document.getElementById('contribute-corp-amount');
    if (!amountInput) return;

    const amount = Math.floor(Number(amountInput.value));
    if (isNaN(amount) || amount <= 0) {
      showToast('مبلغ غير صحيح', 'يرجى إدخال قيمة مساهمة صحيحة أكبر من الصفر.', 'error');
      return;
    }

    const username = GameEngine.activeUsername || (GameEngine.state && GameEngine.state.username);
    if (!username) {
      showToast('غير مسجل', 'يرجى تسجيل الدخول أولاً للمساهمة في الشركة.', 'error');
      return;
    }

    const currentCash = GameEngine.state.cash || 0;
    const currentBank = GameEngine.state.bank || 0;
    const totalLiquidity = currentCash + currentBank;

    if (totalLiquidity < amount) {
      showToast('رصيد غير كافي', `لا تملك سيولة كافية. المبلغ المطلوب: ${amount.toLocaleString()} EGP (إجمالي الكاش والبنك لديك: ${totalLiquidity.toLocaleString()} EGP)`, 'error');
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
      
      showToast('تم ضخ السيولة! 💸', `لقد ساهمت بـ ${amount.toLocaleString()} EGP في خزينة الشركة بنجاح وتمت زيادة رصيد الخزينة وحصتك من الأرباح.`, 'success');
      playMenuSound('success');
      
      amountInput.value = '';
      renderAll();
      renderCorporationsTab();

    } catch (err) {
      showToast('فشل المساهمة', err.message, 'error');
    }
  }

  async function buyCorporationProjectAction(corpId, projectId, cost) {
    try {
      await AppDB.buyCorporationProject(corpId, projectId, cost);
      showToast('تم الشراء بنجاح! 🚀✅', 'تم شراء المشروع العملاق وسوف يساهم في مضاعفة أرباح الشركاء والتحالف بالكامل من الآن.', 'success');
      playMenuSound('success');
    } catch (err) {
      showToast('فشل شراء المشروع', err.message, 'error');
    }
  }

  async function loadAdminPlayerWorkspace(playerState) {
    const listSelect = document.getElementById('admin-player-backups-select');
    if (!listSelect) return;

    listSelect.innerHTML = '<option value="">جاري جلب النسخ الاحتياطية...</option>';

    try {
      const dates = await AppDB.getPlayerBackupDates(playerState.username);
      listSelect.innerHTML = '';
      if (dates.length === 0) {
        listSelect.innerHTML = '<option value="">لا توجد نسخ احتياطية متوفرة...</option>';
      } else {
        dates.forEach(d => {
          const opt = document.createElement('option');
          opt.value = d;
          opt.textContent = `نسخة يوم ${d}`;
          listSelect.appendChild(opt);
        });
      }
    } catch (err) {
      listSelect.innerHTML = '<option value="">فشل جلب النسخ الاحتياطية</option>';
    }
  }

  async function kickCorpMemberAction(corpId, targetUsername) {
    if (!confirm(`هل أنت متأكد من طرد "${targetUsername}" من الشركة؟ سيتم احتساب حصته كأموال معلقة في الخزينة.`)) return;
    try {
      await DB.kickCorpMember(corpId, targetUsername);
      showToast('تم الطرد', `تم طرد ${targetUsername} من الشركة بنجاح.`, 'success');
      renderCorporationsTab();
    } catch (e) {
      showToast('خطأ', e.message || 'فشل تنفيذ عملية الطرد.', 'error');
    }
  }

  async function editCorpInfoAction(corpId) {
    const newName = document.getElementById('edit-corp-name')?.value?.trim();
    const newDesc = document.getElementById('edit-corp-desc')?.value?.trim();
    if (!newName) { showToast('خطأ', 'يجب إدخال اسم صالح للشركة.', 'error'); return; }
    try {
      await DB.editCorpInfo(corpId, newName, newDesc);
      showToast('تم الحفظ ✅', 'تم تحديث بيانات الشركة بنجاح.', 'success');
      renderCorporationsTab();
    } catch (e) {
      showToast('خطأ', e.message || 'فشل تحديث البيانات.', 'error');
    }
  }

  async function transferCorpOwnershipAction(corpId) {
    const target = document.getElementById('transfer-corp-target')?.value;
    if (!target) { showToast('خطأ', 'يجب اختيار عضو لنقل الملكية إليه.', 'error'); return; }
    if (!confirm(`هل أنت متأكد من نقل ملكية الشركة إلى "${target}"؟ لن تتمكن من التراجع!`)) return;
    try {
      await AppDB.transferCorpOwnership(corpId, target);
      showToast('تم النقل 👑', `انتقلت ملكية الشركة إلى ${target}.`, 'success');
      renderCorporationsTab();
    } catch (e) {
      showToast('خطأ', e.message || 'فشل نقل الملكية.', 'error');
    }
  }

  async function dissolveCorpAction(corpId) {
    if (!confirm('⚠️ تحذير: سيتم حل الشركة نهائياً وإعادة توزيع الخزينة على المساهمين بحسب حصصهم. هل تريد المتابعة؟')) return;
    if (!confirm('تأكيد أخير: هذا الإجراء لا رجعة فيه. هل أنت متأكد 100%؟')) return;
    try {
      await AppDB.dissolveCorporation(corpId);
      window.activeCorporationState = null;
      showToast('تم الحل 💥', 'تم حل الشركة وإعادة توزيع الخزينة على المساهمين بنجاح.', 'success');
      renderCorporationsTab();
    } catch (e) {
      showToast('خطأ', e.message || 'فشل حل الشركة.', 'error');
    }
  }

  async function promoteCorpMemberAction(corpId, targetUsername, role) {
    const roleName = role === 'cfo' ? 'مدير مالي (CFO)' : 'مساهم عادي';
    if (!confirm(`هل أنت متأكد من تغيير رتبة "${targetUsername}" إلى "${roleName}"؟`)) return;
    try {
      await AppDB.promoteCorpMember(corpId, targetUsername, role);
      showToast('تحديث الرتبة', `تم تغيير رتبة اللاعب ${targetUsername} بنجاح.`, 'success');
      renderCorporationsTab();
    } catch (e) {
      showToast('خطأ رتبة', e.message, 'error');
    }
  }

  async function payoutFromCorpTreasuryAction(corpId) {
    const target = document.getElementById('payout-corp-target')?.value;
    const amount = Math.floor(Number(document.getElementById('payout-corp-amount')?.value));

    if (!target) {
      showToast('خطأ تحويل', 'يجب اختيار العضو المستهدف للتحويل.', 'error');
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      showToast('خطأ تحويل', 'يرجى إدخال مبلغ تحويل صحيح وموجب.', 'error');
      return;
    }

    if (!confirm(`هل أنت متأكد من سحب ${amount.toLocaleString()} EGP من خزينة التحالف وتحويلها مباشرة ككاش إلى "${target}"؟`)) return;

    try {
      await AppDB.payoutFromCorpTreasury(corpId, target, amount);
      showToast('تم التحويل 💸✅', `تم سحب وتحويل ${amount.toLocaleString()} EGP بنجاح إلى حساب ${target}.`, 'success');
      playMenuSound('success');
      
      const amtInput = document.getElementById('payout-corp-amount');
      if (amtInput) amtInput.value = '';
      
      renderCorporationsTab();
    } catch (e) {
      showToast('فشل التحويل', e.message, 'error');
    }
  }

  // --- Cars UI & Actions ---
  function renderCarsTab() {
    const s = GameEngine.state;
    if (!s) return;
    const container = document.getElementById('cars-dealership-list');
    if (!container) return;

    let html = '';
    Object.keys(GameEngine.CAR_TEMPLATES).forEach(carId => {
      const car = GameEngine.CAR_TEMPLATES[carId];
      const ownedRefs = (s.ownedCars || []).filter(c => c.id === carId);
      const ownedCount = ownedRefs.length;
      const isActive = s.activeCar === carId;

      let ownedSection = '';
      if (ownedCount > 0) {
        ownedSection += `
          <div class="mt-4 border-t border-slate-900 pt-3 space-y-2 text-right">
            <div class="text-[10px] text-slate-500 font-bold">المقتنيات المملوكة لك (${ownedCount} سيارة):</div>
        `;
        s.ownedCars.forEach((carRef, absIdx) => {
          if (carRef.id !== carId) return;
          const isRented = carRef.rentStatus === 'rented';
          ownedSection += `
            <div class="flex justify-between items-center bg-slate-950/60 p-2 rounded-lg border border-slate-900 text-[10px]">
              <div class="flex flex-col text-right">
                <span class="text-white font-bold">النسخة #${absIdx + 1}</span>
                <span class="${isRented ? 'text-emerald-400 font-bold' : 'text-slate-400'}">${isRented ? 'مؤجرة وتدر عائداً' : 'مركونة بالمرآب'}</span>
              </div>
              <div class="flex gap-1">
                ${isRented ? `
                  <button onclick="window.UI.rentCarAction('${carId}', 'idle', ${absIdx})" class="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold transition">إيقاف الإيجار</button>
                ` : `
                  <button onclick="window.UI.rentCarAction('${carId}', 'rented', ${absIdx})" class="px-2 py-1 bg-indigo-600/30 hover:bg-indigo-600 border border-indigo-500/20 text-indigo-300 hover:text-white rounded font-bold transition">تأجير</button>
                `}
                
                ${(car.cooldownReduction || car.interestBonus) && !isRented ? `
                  ${isActive ? `
                    <button onclick="window.UI.setActiveCarAction(null)" class="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded font-bold transition">إيقاف تفعيل</button>
                  ` : `
                    <button onclick="window.UI.setActiveCarAction('${carId}')" class="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/20 text-emerald-400 hover:text-white rounded font-bold transition">قيادة 🔑</button>
                  `}
                ` : ''}
                
                <button onclick="window.UI.sellCarAction('${carId}', ${absIdx})" class="px-1.5 py-1 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded font-bold transition"><i class="fa-solid fa-trash"></i> بيع</button>
              </div>
            </div>
          `;
        });
        ownedSection += `</div>`;
      }

      html += `
        <div class="glass-panel p-5 rounded-2xl border ${isActive ? 'border-amber-500/40 bg-amber-950/5' : 'border-slate-800 bg-slate-950/20'} flex flex-col justify-between space-y-4 text-right">
          <div>
            <div class="flex justify-between items-start gap-2">
              <h4 class="text-xs font-black text-white">${car.name}</h4>
              ${isActive ? '<span class="text-[9px] bg-amber-500/20 border border-amber-500/30 text-amber-400 px-2 py-0.5 rounded-full font-bold">نشطة 🚗🔥</span>' : ''}
            </div>
            <p class="text-[10px] text-slate-400 mt-1 leading-relaxed">${car.desc}</p>
            
            <div class="grid grid-cols-2 gap-2 mt-4 bg-slate-950/50 p-2.5 rounded-xl border border-slate-900 text-[10px] text-right">
              <div>
                <span class="text-slate-500 block">سعر الشراء</span>
                <span class="text-slate-300 font-bold numbers-font text-xs">${car.cost.toLocaleString()} EGP</span>
              </div>
              <div>
                <span class="text-slate-500 block">دخل الإيجار الصافي</span>
                <span class="text-emerald-400 font-black numbers-font text-xs">+${(car.rentalIncomePerTick - car.maintenanceCostPerTick).toLocaleString()}/s</span>
              </div>
            </div>
          </div>
          
          <div class="space-y-2">
            <button onclick="window.UI.buyCarAction('${carId}')" class="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition">شراء سيارة جديدة</button>
            ${ownedSection}
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  async function buyCarAction(carId) {
    try {
      const car = GameEngine.CAR_TEMPLATES[carId];
      if (!confirm(`هل أنت متأكد من شراء سيارة ${car.name} بمبلغ ${car.cost.toLocaleString()} EGP؟`)) return;
      await GameEngine.buyCar(carId);
      showToast('مبروك السيارة! 🏎️🎉', `تم شراء ${car.name} بنجاح وإضافتها للمرأب.`, 'success');
      playMenuSound('success');
      renderAll();
    } catch (err) {
      showToast('فشل الشراء', err.message, 'error');
    }
  }

  async function setActiveCarAction(carId) {
    try {
      await GameEngine.setActiveCar(carId);
      showToast('السيارة النشطة', carId === null ? 'تم إلغاء تفعيل السيارة النشطة.' : `تم تفعيل السيارة كسيارة شخصية بنجاح!`, 'success');
      playMenuSound('success');
      renderAll();
    } catch (err) {
      showToast('خطأ التفعيل', err.message, 'error');
    }
  }

  async function rentCarAction(carId, rentStatus, index) {
    try {
      await GameEngine.rentCar(carId, rentStatus, index);
      showToast('حالة الإيجار', rentStatus === 'rented' ? 'بدأ تأجير السيارة بنجاح وتدفق الدخل السلبي.' : 'تم إيقاف الإيجار وإعادة السيارة للمرأب.', 'success');
      playMenuSound('success');
      renderAll();
    } catch (err) {
      showToast('خطأ التأجير', err.message, 'error');
    }
  }

  async function sellCarAction(carId, index) {
    try {
      const car = GameEngine.CAR_TEMPLATES[carId];
      const sellPrice = Math.floor(car.cost * 0.75);
      if (!confirm(`هل أنت متأكد من بيع سيارة ${car.name} واسترداد ${sellPrice.toLocaleString()} EGP؟`)) return;
      await GameEngine.sellCar(carId, index);
      showToast('تم البيع 💰', `تم بيع السيارة بنجاح وإيداع ${sellPrice.toLocaleString()} EGP بالبنك.`, 'success');
      playMenuSound('success');
      renderAll();
    } catch (err) {
      showToast('خطأ البيع', err.message, 'error');
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
      let routesHtml = '';
      Object.keys(GameEngine.SMUGGLING_ROUTES).forEach(routeId => {
        const route = GameEngine.SMUGGLING_ROUTES[routeId];
        const vehicleButtons = route.requiredVehicles.map(vType => {
          const vDef = GameEngine.SMUGGLING_VEHICLES[vType];
          const hasV = s.smugglingFleet[vType] > 0;
          return `
            <button onclick="window.UI.startSmugglingJobAction('${routeId}', '${vType}')" 
                    ${!hasV ? 'disabled' : ''} 
                    class="px-2 py-1 text-[9px] rounded font-bold transition ${hasV ? 'bg-rose-700/30 hover:bg-rose-600 text-rose-300 border border-rose-500/20' : 'bg-slate-900 text-slate-600 cursor-not-allowed border border-slate-800'}">
              تهريب عبر: ${vDef.name.split(' ')[0]}
            </button>
          `;
        }).join(' ');

        routesHtml += `
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
          </div>
        `;
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
      activeJobsContainer.innerHTML = `<div class="text-center text-slate-600 text-xs py-4">لا توجد عمليات شحن نشطة حالياً.</div>`;
      return;
    }

    let jobsHtml = '';
    const now = Date.now();

    s.activeSmugglingJobs.forEach(job => {
      const route = GameEngine.SMUGGLING_ROUTES[job.routeId];
      const vehicle = GameEngine.SMUGGLING_VEHICLES[job.vehicleType];
      if (!route || !vehicle) return;

      const remainingMs = Math.max(0, job.endTime - now);
      const remainingSec = Math.ceil(remainingMs / 1000);
      const totalSec = route.durationTicks || 1;
      const progressPct = Math.min(100, ((totalSec - remainingSec) / totalSec) * 100);

      jobsHtml += `
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
        </div>
      `;
    });

    activeJobsContainer.innerHTML = jobsHtml;
  }

  async function buySmugglingVehicleAction(vehicleId) {
    try {
      const v = GameEngine.SMUGGLING_VEHICLES[vehicleId];
      if (!confirm(`هل أنت متأكد من شراء ${v.name} بمبلغ ${v.cost.toLocaleString()} EGP؟`)) return;
      await GameEngine.buySmugglingVehicle(vehicleId);
      showToast('مركبة جديدة بالأسطول 🚤✈️', `تم شراء ${v.name} بنجاح وإضافتها لأسطول التهريب.`, 'success');
      playMenuSound('success');
      renderAll();
    } catch (err) {
      showToast('فشل الشراء', err.message, 'error');
    }
  }

  async function startSmugglingJobAction(routeId, vehicleType) {
    try {
      const route = GameEngine.SMUGGLING_ROUTES[routeId];
      if (!confirm(`هل أنت متأكد من بدء عملية شحن "${route.name}" بتكلفة تجميد مركبة شحن؟`)) return;
      await GameEngine.startSmugglingJob(routeId, vehicleType);
      showToast('تم انطلاق الشحنة 🚢✈️', 'انطلقت المركبة وتظهر الآن في شريط التقدم النشط.', 'success');
      playMenuSound('success');
      renderAll();
    } catch (err) {
      showToast('خطأ انطلاق الشحنة', err.message, 'error');
    }
  }

  function switchAssetsSubtab(subtabId) {
    const reBtn = document.getElementById('btn-subtab-realestate');
    const carsBtn = document.getElementById('btn-subtab-cars');
    const reContent = document.getElementById('subtab-content-realestate');
    const carsContent = document.getElementById('subtab-content-cars');

    if (subtabId === 'realestate') {
      if (reBtn) reBtn.className = 'pb-2 text-sm font-black text-indigo-400 border-b-2 border-indigo-500 focus:outline-none transition';
      if (carsBtn) carsBtn.className = 'pb-2 text-sm font-black text-slate-400 border-b-2 border-transparent hover:text-white focus:outline-none transition';
      if (reContent) reContent.classList.remove('hidden');
      if (carsContent) carsContent.classList.add('hidden');
    } else {
      if (carsBtn) carsBtn.className = 'pb-2 text-sm font-black text-indigo-400 border-b-2 border-indigo-500 focus:outline-none transition';
      if (reBtn) reBtn.className = 'pb-2 text-sm font-black text-slate-400 border-b-2 border-transparent hover:text-white focus:outline-none transition';
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
      showToast('تمت الترقية 🏆🎉', 'تم ترقية مستوى التحالف المشترك بنجاح! تم زيادة دعم أرباح الأعضاء بمقدار +5% إضافية.', 'success');
      playMenuSound('success');
      renderCorporationsTab();
    } catch (e) {
      showToast('فشل الترقية', e.message, 'error');
    }
  }

  async function adminQuickJailAction(username) {
    if (!username) return;
    if (!confirm(`هل أنت متأكد من إرسال اللاعب المشبوه "${username}" إلى السجن لمدة 5 دقائق؟`)) return;
    try {
      await AppDB.adminSetPlayerJail(username, 300);
      showToast('عقوبة السجن السريعة', `تم إيداع اللاعب ${username} في السجن بنجاح.`, 'warning');
      logAdminAction(`إجراء سريع: سجن اللاعب المشبوه ${username}`);
      renderAdminAnalyticsDashboard();
    } catch (err) {
      showToast('فشل سجن اللاعب', err.message, 'error');
    }
  }

  async function adminQuickBanAction(username) {
    if (!username) return;
    if (!confirm(`هل أنت متأكد من حظر حساب اللاعب المشبوه "${username}" نهائياً؟`)) return;
    try {
      await AppDB.adminBanPlayer(username);
      showToast('حظر الحساب السريع', `تم حظر حساب اللاعب المشبوه ${username} نهائياً.`, 'success');
      logAdminAction(`إجراء سريع: حظر حساب اللاعب المشبوه ${username}`);
      renderAdminAnalyticsDashboard();
    } catch (err) {
      showToast('فشل حظر اللاعب', err.message, 'error');
    }
  }

  async function manualSaveProgressAction() {
    const btns = [
      document.getElementById('btn-save-progress-cloud'),
      document.getElementById('btn-save-progress-cloud-ingame'),
      document.getElementById('btn-save-progress-cloud-mobile')
    ].filter(Boolean);

    if (!GameEngine.activeUsername) {
      showToast('تنبيه', 'يرجى تسجيل الدخول أولاً لحفظ التقدم.', 'warning');
      return;
    }

    btns.forEach(btn => {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-xs"></i><span>جاري الحفظ...</span>';
    });

    try {
      const res = await AppDB.syncProgressToCloud(GameEngine.activeUsername);
      if (res.success) {
        showToast('تم التزامن السحابي ☁️', res.message, 'success');
        playMenuSound('success');
      } else {
        showToast('تنبيه الحفظ ⏳', res.message, 'warning');
      }
    } catch (e) {
      showToast('خطأ في الحفظ', e.message || 'تعذر الاتصال بالسيرفر.', 'error');
    } finally {
      btns.forEach(btn => {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up text-xs"></i><span>حفظ السحابة</span>';
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

  return {
    init,
    switchTab,
    showToast,
    returnToStartMenu,
    playMenuSound,
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
    kickCorpMemberAction,
    editCorpInfoAction,
    transferCorpOwnershipAction,
    dissolveCorpAction,
    adminQuickJailAction,
    adminQuickBanAction,
    promoteCorpMemberAction,
    payoutFromCorpTreasuryAction,
    upgradeCorporationLevelAction,
    
    // New V2: Cars and Smuggling exports
    buyCarAction,
    setActiveCarAction,
    rentCarAction,
    sellCarAction,
    buySmugglingVehicleAction,
    startSmugglingJobAction,
    toggleAdminSidebarAction,
    toggleServerBoostAction,
    manualSaveProgressAction
  };
})();


// Export globally
window.UIController = UIController;
window.UI = UIController;
