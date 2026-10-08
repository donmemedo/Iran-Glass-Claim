// Persian copy follows the Persian UX-writing vocabulary (github.com/Aylarrazzaghi/Persian-vocabulary-in-UXwriting).
export type Lang = "fa" | "en";

const dict = {
  brand: ["ایران‌گلس‌کلیم", "Iran Glass Claim"],
  navHome: ["خانه", "Home"],
  navClaim: ["ثبت خسارت", "New claim"],
  navTrack: ["پیگیری", "Track"],
  navDash: ["پیش‌خوان بیمه‌گر", "Insurer panel"],
  navDashShort: ["پیش‌خوان", "Panel"],
  theme: ["حالت نمایش", "Appearance"],
  light: ["روشن", "Light"],
  dark: ["تیره", "Dark"],
  system: ["خودکار", "Auto"],

  heroKicker: ["شبکه تخصصی خسارت شیشه خودرو برای بیمه‌گران", "The glass-claim network built for insurers"],
  heroTitleA: ["ترک را", "Don't replace"],
  heroTitleB: ["ترمیم کنید،", "the glass."],
  heroTitleC: ["نه هزینه را.", "Heal the crack."],
  heroSub: [
    "بیمه‌شده بدون پرداخت نقدی مراجعه می‌کند، شیشه در صورت امکان تعمیر می‌شود، عکس و مدارک خسارت ثبت می‌شود و فاکتور مستقیم برای بیمه‌گر صادر می‌شود.",
    "Insured drivers pay nothing at the counter. We repair whenever possible, document every claim with photos, and invoice the insurer directly.",
  ],
  ctaClaim: ["ثبت خسارت شیشه", "File a glass claim"],
  ctaDemo: ["درخواست دمو برای بیمه‌گران", "Book an insurer demo"],
  healed: ["ترمیم شد", "Healed"],

  statRepair: ["نرخ تعمیر به‌جای تعویض", "Repaired, not replaced"],
  statCsat: ["رضایت بیمه‌شده", "Driver satisfaction"],
  statSla: ["پاسخ در کمتر از ۱۰ دقیقه", "Answered under 10 min"],
  statAvoided: ["هزینه جلوگیری‌شده", "Cost avoided"],

  offersTitle: ["سه خدمت، یک شریک", "Three offerings. One partner."],
  offersSub: ["الگوی موفق Carglass Insurance Services، بومی‌شده برای بازار ایران.", "The Carglass Insurance Services model, localised for Iran."],
  o1t: ["اول تعمیر", "Repair first"],
  o1d: ["ترک‌های قابل تعمیر با رزین ترمیم می‌شوند و تعویض فقط در موارد ضروری انجام می‌شود. متوسط هزینه هر خسارت پایین‌ترین در بازار است.", "Repairable chips are healed with resin; glass is replaced only when it must be. The lowest average cost per claim on the market."],
  o2t: ["پرداخت آنی", "Instant pay"],
  o2d: ["بیمه‌شده هیچ مبلغی پرداخت نمی‌کند. احراز بیمه‌نامه، فرانشیز و سقف تعهد ثبت و فاکتور مستقیم برای بیمه‌گر صادر می‌شود.", "The driver pays nothing. Policy, deductible and cover are verified, and the invoice goes straight to the insurer."],
  o3t: ["خدمات بیمه‌ای", "Insurance services"],
  o3d: ["دریافت تماس‌های ارجاعی، عکس‌برداری استاندارد، کنترل تقلب، پیش‌خوان خسارت، گزارش SLA و فایل تسویه دوره‌ای.", "Redirected calls, standard photo protocol, fraud checks, a live claims panel, SLA reports and periodic settlement files."],

  flowTitle: ["از ترک تا تسویه، در چهار قدم", "Crack to settlement in four steps"],
  f1t: ["تماس یا ثبت آنلاین", "Call or file online"], f1d: ["بیمه‌شده تماس می‌گیرد یا در دو دقیقه خسارت را ثبت می‌کند.", "The driver calls or files in two minutes."],
  f2t: ["ارزیابی و عکس", "Assess & photograph"], f2d: ["تصمیم تعمیر یا تعویض با پروتکل استاندارد گرفته می‌شود.", "Repair vs. replace, decided by a standard protocol."],
  f3t: ["خدمت در مرکز یا محل", "Service at centre or door"], f3d: ["در مرکز یا با تیم سیار، بدون پرداخت نقدی.", "At our centre or by a mobile team, cash-free."],
  f4t: ["فاکتور مستقیم به بیمه", "Direct invoice"], f4d: ["داده و مدارک کامل در پیش‌خوان بیمه‌گر ثبت می‌شود.", "Full data and evidence land in the insurer panel."],

  calcTitle: ["صرفه‌جویی خودتان را محاسبه کنید", "Calculate your savings"],
  calcSub: ["قیمت هر خدمت ما ممکن است بالاتر باشد، اما متوسط هزینه خسارت شما کمتر می‌شود.", "Our price per job may be higher — your average cost per claim is lower."],
  calcClaims: ["تعداد خسارت شیشه در ماه", "Glass claims per month"],
  calcRepairable: ["سهم خسارت‌های قابل تعمیر", "Share that is repairable"],
  calcToday: ["امروز (تعویض پیش‌فرض)", "Today (replace by default)"],
  calcWith: ["با ایران‌گلس‌کلیم", "With Iran Glass Claim"],
  calcSave: ["صرفه‌جویی سالانه", "Yearly savings"],
  perMonth: ["در ماه", "per month"],

  pricingTitle: ["قیمت‌گذاری شفاف و ارزش‌محور", "Transparent, value-based pricing"],
  p1: ["تعمیر ترک", "Chip repair"], p2: ["تعویض شیشه", "Glass replacement"], p3: ["کارمزد مدیریت پرونده", "Claim handling fee"],
  p4: ["پیش‌خوان بیمه‌گر", "Insurer panel"], p5: ["مرکز تماس اختصاصی", "Dedicated call centre"], p6: ["تیم سیار", "Mobile team"],

  demoTitle: ["پایلوت ۱۰۰ پرونده، بدون ریسک", "A 100-claim pilot. Zero risk."],
  demoSub: ["گزارش متوسط هزینه، نرخ تعمیر و رضایت بیمه‌شده را روی پرونده‌های واقعی خودتان ببینید.", "See average cost, repair rate and driver satisfaction on your own claims."],
  company: ["نام شرکت بیمه یا کارگزاری", "Insurer or broker"],
  contact: ["نام و نام خانوادگی", "Full name"],
  phone: ["شماره تماس", "Phone number"],
  monthly: ["خسارت شیشه در ماه (تقریبی)", "Glass claims / month (approx.)"],
  send: ["ارسال درخواست", "Send request"],
  demoOk: ["درخواست شما ثبت شد. به‌زودی با شما تماس می‌گیریم.", "Request received. We'll be in touch shortly."],
  footer: ["نسخه نمایشی — ارقام به میلیون تومان", "Demo build — figures in million Toman"],

  // Claim wizard
  claimTitle: ["ثبت خسارت شیشه", "File a glass claim"],
  claimSub: ["در کمتر از دو دقیقه. بدون پرداخت نقدی.", "Under two minutes. Nothing to pay."],
  s1: ["کدام شیشه؟", "Which glass?"], s2: ["آسیب", "Damage"], s3: ["بیمه‌نامه", "Policy"], s4: ["خدمت", "Service"],
  pickGlass: ["روی شیشه آسیب‌دیده بزنید", "Tap the damaged glass"],
  windshield: ["شیشه جلو", "Windshield"], side: ["شیشه بغل", "Side window"], rear: ["شیشه عقب", "Rear window"], sunroof: ["سانروف", "Sunroof"],
  size: ["اندازه ترک یا شکستگی", "Size of the chip or crack"],
  cm: ["سانتی‌متر", "cm"],
  coin: ["کوچک‌تر از یک سکه — معمولاً قابل تعمیر", "Smaller than a coin — usually repairable"],
  inView: ["در دید مستقیم راننده است", "In the driver's line of sight"],
  atEdge: ["نزدیک لبه شیشه است", "Close to the glass edge"],
  adas: ["خودرو دوربین یا سنسور جلو دارد (ADAS)", "Car has a front camera / sensors (ADAS)"],
  photos: ["عکس آسیب", "Damage photos"],
  addPhoto: ["اضافه کردن عکس", "Add photos"],
  verdictRepair: ["احتمالاً قابل تعمیر است", "Likely repairable"],
  verdictReplace: ["احتمالاً نیاز به تعویض دارد", "Likely needs replacement"],
  verdictHint: ["تصمیم نهایی پس از ارزیابی کارشناس گرفته می‌شود.", "Final decision after a technician's assessment."],
  name: ["نام و نام خانوادگی", "Full name"],
  mobile: ["شماره موبایل", "Mobile number"],
  policy: ["شماره بیمه‌نامه", "Policy number"],
  insurer: ["شرکت بیمه", "Insurer"],
  plate: ["پلاک خودرو", "Licence plate"],
  center: ["مرکز ایران‌گلس‌کلیم", "At our centre"], centerD: ["بدون هزینه اضافه", "No extra cost"],
  mobileTeam: ["تیم سیار", "Mobile team"], mobileTeamD: ["در محل شما", "At your location"],
  city: ["شهر", "City"],
  next: ["ادامه", "Continue"], back: ["بازگشت", "Back"], submit: ["ثبت خسارت", "Submit claim"],
  required: ["اینجا را خالی نگذارید", "This field can't be empty"],
  badMobile: ["شماره موبایل نادرست است", "That mobile number isn't valid"],
  youPay: ["سهم شما از پرداخت", "You pay"], zero: ["صفر تومان", "Nothing"],
  insurerPays: ["مبلغ قابل پرداخت توسط بیمه", "Billed to insurer"],
  successTitle: ["خسارت شما ثبت شد", "Your claim is in"],
  successSub: ["کد رهگیری با پیامک برای شما ارسال می‌شود. با این کد می‌توانید وضعیت پرونده را پیگیری کنید.", "We'll text you this tracking code. Use it to follow your claim."],
  trackIt: ["پیگیری پرونده", "Track claim"],
  newClaim: ["ثبت خسارت جدید", "New claim"],
  copy: ["کپی", "Copy"], copied: ["کپی شد", "Copied"],
  error: ["مشکلی پیش آمد. دوباره تلاش کنید.", "Something went wrong. Please try again."],

  // Track
  trackTitle: ["پیگیری پرونده", "Track your claim"],
  trackSub: ["کد رهگیری را بنویسید", "Enter your tracking code"],
  trackBtn: ["جستجو", "Search"],
  notFound: ["پرونده‌ای با این کد پیدا نشد", "No claim found with that code"],
  tryDemo: ["یک پرونده نمونه را ببینید", "Try a sample claim"],
  rateTitle: ["از خدمت ما راضی بودید؟", "How did we do?"],
  thanks: ["از دیدگاه شما سپاسگزاریم", "Thanks for your feedback"],

  // Statuses
  received: ["دریافت شد", "Received"], approved: ["تایید شد", "Approved"], scheduled: ["نوبت داده شد", "Scheduled"],
  in_service: ["در حال انجام", "In service"], done: ["انجام شد", "Done"], rejected: ["رد شد", "Rejected"],
  repair: ["تعمیر", "Repair"], replace: ["تعویض", "Replace"],

  // Dashboard
  dashTitle: ["پیش‌خوان خسارت", "Claims panel"],
  dashSub: ["نمای زنده پرونده‌های شیشه برای بیمه‌گر", "Live view of glass claims for insurers"],
  kClaims: ["پرونده‌ها (۳۰ روز)", "Claims (30 days)"],
  kOpen: ["پرونده باز", "Open claims"],
  kRepair: ["نرخ تعمیر", "Repair rate"],
  kAvg: ["متوسط هزینه هر خسارت", "Avg. cost per claim"],
  kAvoided: ["هزینه جلوگیری‌شده", "Cost avoided"],
  kCsat: ["رضایت بیمه‌شده", "Satisfaction"],
  kSla: ["SLA مرکز تماس", "Call-centre SLA"],
  last14: ["۱۴ روز اخیر", "Last 14 days"],
  byGlass: ["بر اساس نوع شیشه", "By glass type"],
  byStatus: ["وضعیت پرونده‌ها", "Claim status"],
  all: ["همه", "All"],
  search: ["جستجو در کد، نام، پلاک…", "Search code, name, plate…"],
  colCode: ["کد", "Code"], colDriver: ["بیمه‌شده", "Driver"], colGlass: ["شیشه", "Glass"], colDecision: ["تصمیم", "Decision"],
  colAmount: ["مبلغ", "Amount"], colStatus: ["وضعیت", "Status"], colDate: ["تاریخ", "Date"],
  details: ["جزئیات پرونده", "Claim details"],
  advance: ["مرحله بعد", "Next step"], reject: ["رد پرونده", "Reject claim"],
  close: ["بستن", "Close"],
  exportCsv: ["دریافت فایل تسویه", "Download settlement"],
  empty: ["پرونده‌ای پیدا نشد", "No claims match"],
  offline: ["اتصال به سرور برقرار نشد", "Can't reach the server"],
  mToman: ["میلیون تومان", "M Toman"],
  bToman: ["میلیارد تومان", "B Toman"],
  photosN: ["عکس", "photos"],
  timeline: ["تاریخچه", "History"],
  target: ["هدف: بالای", "Target: above"],
  refresh: ["به‌روزرسانی", "Refresh"],
  newest200: ["فقط ۲۰۰ پرونده تازه نمایش داده می‌شود. برای پیدا کردن پرونده‌های قدیمی‌تر جستجو کنید.", "Showing the newest 200 claims. Search to find older ones."],
  rejectAsk: ["این پرونده رد شود؟ این کار برگشت‌پذیر نیست.", "Reject this claim? This can't be undone."],
  cancel: ["انصراف", "Cancel"],
  changeFailed: ["وضعیت پرونده تغییر نکرد. دوباره تلاش کنید.", "The status didn't change. Please try again."],

  // Login
  password: ["رمز عبور", "Password"],
  login: ["ورود", "Log in"], logout: ["خروج", "Log out"],
  loginSub: ["برای دیدن پرونده‌ها، رمز عبور پیش‌خوان را بنویسید.", "Enter the panel password to see claims."],
  badPassword: ["رمز عبور نادرست است", "That password isn't right"],
  tooMany: ["تعداد تلاش‌ها زیاد شد. یک دقیقه دیگر دوباره امتحان کنید.", "Too many attempts. Try again in a minute."],
  loginOff: ["ورود به پیش‌خوان روی این سرور راه‌اندازی نشده است", "Panel login isn't set up on this server"],

  // Shell
  language: ["زبان", "Language"],
  tabs: ["بخش‌ها", "Sections"],
  photosLocal: ["در این نسخه آزمایشی، عکس‌ها فقط روی دستگاه شما نمایش داده می‌شوند و ارسال نمی‌شوند.", "In this demo, photos stay on your device. Only their count is sent."],
} satisfies Record<string, [string, string]>;

export type Key = keyof typeof dict;
export const translate = (lang: Lang, key: Key) => dict[key][lang === "fa" ? 0 : 1];

export const nf = (lang: Lang, n: number, digits = 1) =>
  new Intl.NumberFormat(lang === "fa" ? "fa-IR" : "en-US", { maximumFractionDigits: digits }).format(n);

export const df = (lang: Lang, iso: string, time = false) =>
  new Intl.DateTimeFormat(lang === "fa" ? "fa-IR-u-ca-persian" : "en-GB", {
    day: "numeric", month: "short", ...(time ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(iso));

const names: Record<string, string> = {
  "Iran Insurance": "بیمه ایران", "Asia Insurance": "بیمه آسیا", "Dana Insurance": "بیمه دانا",
  "Parsian Insurance": "بیمه پارسیان", "Saman Insurance": "بیمه سامان",
  Tehran: "تهران", Karaj: "کرج", Isfahan: "اصفهان", Mashhad: "مشهد", Shiraz: "شیراز", Tabriz: "تبریز",
};
export const local = (lang: Lang, s: string) => (lang === "fa" && names[s]) || s;
export const INSURERS = ["Iran Insurance", "Asia Insurance", "Dana Insurance", "Parsian Insurance", "Saman Insurance"];
export const CITIES = ["Tehran", "Karaj", "Isfahan", "Mashhad", "Shiraz", "Tabriz"];
export const pct = (lang: Lang, n: number) => nf(lang, n, 0) + (lang === "fa" ? "٪" : "%");
export const money = (lang: Lang, m: number) =>
  Math.abs(m) >= 1000 ? `${nf(lang, m / 1000)} ${translate(lang, "bToman")}` : `${nf(lang, m)} ${translate(lang, "mToman")}`;
