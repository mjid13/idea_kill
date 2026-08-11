"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { translateGeneratedArabic } from "./arabic-generated";

type Locale = "en" | "ar";
const LanguageContext = createContext<{ locale: Locale; setLocale: (locale: Locale) => void }>({
  locale: "en",
  setLocale: () => undefined,
});

// The calculator already produces deterministic English copy in several layers
// (forms, scoring, insights and charts). Keeping its Arabic equivalent here lets
// every current and future client-rendered screen share one language switch.
const AR: Record<string, string> = {
  "Product Viability Calculator": "حاسبة جدوى المنتج",
  Projects: "المشاريع",
  Compare: "مقارنة",
  "Evaluate an Idea": "قيّم فكرة",
  "Know if your product economics make sense before you spend months building it.": "اعرف ما إذا كانت اقتصاديات منتجك منطقية قبل أن تقضي أشهرًا في بنائه.",
  "Enter your assumptions and instantly evaluate market size, unit economics, profitability, runway, and overall product viability.": "أدخل افتراضاتك وقيّم فورًا حجم السوق واقتصاديات الوحدة والربحية والسيولة وجدوى المنتج ككل.",
  "View Example": "عرض مثال",
  "No account needed. Evaluations are saved privately in your browser.": "لا تحتاج إلى حساب. تُحفظ التقييمات بخصوصية داخل متصفحك.",
  "What it calculates": "ما الذي تحسبه الأداة",
  "Market opportunity": "فرصة السوق",
  "TAM, SAM, SOM, and the market penetration your plan actually requires.": "إجمالي السوق والسوق المتاح والممكن، ونسبة الاختراق التي تتطلبها خطتك فعليًا.",
  "Revenue potential": "إمكانات الإيرادات",
  "MRR, ARR, and 12/24/36-month forecasts built from your growth assumptions.": "الإيراد الشهري والسنوي المتكرر وتوقعات 12 و24 و36 شهرًا المبنية على افتراضات النمو.",
  "Unit economics": "اقتصاديات الوحدة",
  "CAC, LTV, LTV:CAC, gross margin, and CAC payback — benchmarked by business model.": "تكلفة اكتساب العميل وقيمته مدى الحياة ونسبتهما والهامش الإجمالي وفترة الاسترداد وفق معايير نموذج العمل.",
  "Break-even": "نقطة التعادل",
  "Contribution margin, break-even customers, and break-even revenue.": "هامش المساهمة وعدد العملاء والإيراد اللازمان للتعادل.",
  "Cash runway": "مدة السيولة",
  "Burn rate and months of runway at your current spend.": "معدل الحرق وعدد أشهر السيولة وفق إنفاقك الحالي.",
  "Product validation": "التحقق من المنتج",
  "Problem severity, demonstrated demand, and a separate validation maturity stage.": "حدة المشكلة والطلب المثبت ومرحلة نضج مستقلة للتحقق.",
  Risk: "المخاطر",
  "Technical, market, regulatory, competitive, and financial risk, weighted transparently.": "المخاطر التقنية والسوقية والتنظيمية والتنافسية والمالية بأوزان واضحة.",
  "Overall viability": "الجدوى الإجمالية",
  "A single 0-100 score with a confidence rating and a clear next step.": "درجة واحدة من 0 إلى 100 مع مستوى ثقة وخطوة تالية واضحة.",
  "This tool does not predict whether your startup will succeed. It evaluates the quality of your current assumptions and economics — so you know what to fix, validate, or build next.": "لا تتنبأ هذه الأداة بنجاح شركتك الناشئة، بل تقيّم جودة افتراضاتك واقتصادياتك الحالية لتعرف ما ينبغي إصلاحه أو التحقق منه أو بناؤه لاحقًا.",
  "Product Viability Calculator — evaluate before you build.": "حاسبة جدوى المنتج — قيّم قبل أن تبني.",

  "Evaluations saved in this browser.": "التقييمات المحفوظة في هذا المتصفح.",
  "Compare projects": "مقارنة المشاريع",
  "Select 2 or more saved projects to compare side by side.": "اختر مشروعين محفوظين أو أكثر لمقارنتها جنبًا إلى جنب.",
  "Select at least two projects on the Projects page to compare them.": "اختر مشروعين على الأقل من صفحة المشاريع لمقارنتهما.",
  "Go to projects": "الذهاب إلى المشاريع",
  Metric: "المؤشر",
  Untitled: "بلا عنوان",
  "Untitled project": "مشروع بلا عنوان",
  "You haven't evaluated any ideas yet.": "لم تقيّم أي أفكار بعد.",
  "Evaluate your first idea": "قيّم فكرتك الأولى",
  Open: "فتح",
  Duplicate: "نسخ المشروع",
  Delete: "حذف",
  "Delete this project? This cannot be undone.": "هل تريد حذف هذا المشروع؟ لا يمكن التراجع عن ذلك.",
  "Loading…": "جارٍ التحميل…",
  "Project not found.": "لم يتم العثور على المشروع.",
  "This project could not be found in this browser's storage.": "تعذر العثور على هذا المشروع في مساحة تخزين المتصفح.",
  "This project could not be found in this browser&apos;s storage.": "تعذر العثور على هذا المشروع في مساحة تخزين المتصفح.",
  "Back to projects": "العودة إلى المشاريع",
  Updated: "آخر تحديث",

  "Basic information": "المعلومات الأساسية",
  "What are you building?": "ما الذي تعمل على بنائه؟",
  Market: "السوق",
  "Size the opportunity: TAM, SAM, SOM.": "حدّد حجم الفرصة: السوق الإجمالي والمتاح والممكن.",
  "Pricing & customers": "التسعير والعملاء",
  "How you charge and how many customers you have.": "طريقة التسعير وعدد عملائك.",
  "Customer acquisition": "اكتساب العملاء",
  "What it costs to acquire a customer.": "تكلفة اكتساب العميل.",
  Retention: "الاحتفاظ بالعملاء",
  "How long customers stick around.": "المدة التي يستمر فيها العملاء.",
  "Revenue and cost per customer.": "الإيراد والتكلفة لكل عميل.",
  "Operating expenses": "المصروفات التشغيلية",
  "Fixed monthly costs.": "التكاليف الشهرية الثابتة.",
  "Funding & runway": "التمويل ومدة السيولة",
  "Cash on hand and other income.": "النقد المتاح والدخل الآخر.",
  Validation: "التحقق",
  "Evidence the problem and solution are real.": "أدلة واقعية على المشكلة والحل.",
  Team: "الفريق",
  "Rate your team's capability to execute.": "قيّم قدرة فريقك على التنفيذ.",
  "Rate the risks facing this opportunity.": "قيّم المخاطر التي تواجه هذه الفرصة.",
  "Load example": "تحميل المثال",
  Back: "السابق",
  Next: "التالي",
  "Saving…": "جارٍ الحفظ…",
  "Calculate viability": "احسب الجدوى",
  "Some fields need attention before you can finish. Please review earlier steps.": "تحتاج بعض الحقول إلى مراجعة قبل الإنهاء. راجع الخطوات السابقة.",

  "Project name": "اسم المشروع",
  "e.g. Acme Invoicing": "مثال: منصة أكمي للفوترة",
  "Short description": "وصف مختصر",
  "What does it do, and for whom?": "ماذا يقدم، ولمن؟",
  "Business model": "نموذج العمل",
  Currency: "العملة",
  SaaS: "برمجيات كخدمة",
  Subscription: "اشتراك",
  Marketplace: "سوق إلكتروني",
  "E-commerce": "تجارة إلكترونية",
  "One-time purchase": "شراء لمرة واحدة",
  Service: "خدمة",
  "Usage-based": "حسب الاستخدام",
  Other: "أخرى",
  Monthly: "شهري",
  Annual: "سنوي",
  "One-time": "مرة واحدة",
  "Billing period": "دورة الفوترة",
  "Product price": "سعر المنتج",
  "The price charged per billing period.": "السعر المفروض في كل دورة فوترة.",
  "Current customers": "العملاء الحاليون",
  "Paying customers you have today.": "العملاء الذين يدفعون حاليًا.",
  "Expected customers after 12 months": "العملاء المتوقعون بعد 12 شهرًا",
  "Expected monthly customer growth": "النمو الشهري المتوقع للعملاء",
  "Compounding month-over-month growth rate applied to new customer acquisition in forecasts.": "معدل نمو شهري تراكمي يُطبّق على اكتساب العملاء الجدد في التوقعات.",
  "Free-to-paid conversion rate": "معدل التحويل من مجاني إلى مدفوع",
  "Optional — only relevant if you run a freemium funnel.": "اختياري — مهم فقط عند استخدام نموذج مجاني جزئيًا.",

  "Total potential customers": "إجمالي العملاء المحتملين",
  "The full universe of customers who could conceivably use this product.": "جميع العملاء الذين قد يستخدمون هذا المنتج.",
  "Average annual customer spend": "متوسط إنفاق العميل السنوي",
  "What a typical customer spends per year in this category.": "ما ينفقه العميل المعتاد سنويًا في هذه الفئة.",
  "Addressable market %": "نسبة السوق المتاح",
  "Percentage of the total market realistically addressable given your positioning and geography.": "النسبة الواقعية المتاحة من إجمالي السوق وفق تموضعك ونطاقك الجغرافي.",
  "Obtainable market %": "نسبة السوق الممكن الوصول إليه",
  "Percentage of the addressable market you could realistically capture.": "النسبة التي يمكنك الاستحواذ عليها واقعيًا من السوق المتاح.",
  "Enter TAM/SAM/SOM directly": "أدخل أحجام السوق مباشرة",
  "Skip the bottom-up build if you already know your market sizing.": "تجاوز الحساب التفصيلي إذا كنت تعرف أحجام سوقك مسبقًا.",
  "TAM override": "قيمة السوق الإجمالي",
  "SAM override": "قيمة السوق المتاح",
  "SOM override": "قيمة السوق الممكن",
  "Target customers (planning horizon)": "العملاء المستهدفون خلال فترة الخطة",
  "Customers you're targeting within your planning horizon — used to compute required market penetration.": "العملاء المستهدفون خلال فترة التخطيط، ويُستخدم العدد لحساب اختراق السوق المطلوب.",

  "Monthly marketing spend": "الإنفاق الشهري على التسويق",
  "Monthly sales spend": "الإنفاق الشهري على المبيعات",
  "New customers acquired / month": "العملاء الجدد شهريًا",
  "Drives CAC = (marketing + sales spend) / new customers.": "يحدد تكلفة الاكتساب = (إنفاق التسويق + المبيعات) ÷ العملاء الجدد.",
  "Monthly leads": "العملاء المحتملون شهريًا",
  "Optional — used to derive lead-to-customer conversion automatically.": "اختياري — يُستخدم لحساب التحويل إلى عملاء تلقائيًا.",
  "Lead-to-customer conversion rate": "معدل تحويل العميل المحتمل",
  "Leave as Unknown to have it calculated automatically from leads and new customers.": "اتركه غير معروف ليُحسب تلقائيًا من العملاء المحتملين والجدد.",
  "Monthly churn rate": "معدل التسرب الشهري",
  "Percentage of customers who cancel each month.": "نسبة العملاء الذين يلغون اشتراكهم كل شهر.",
  "Annual churn rate": "معدل التسرب السنوي",
  "Optional — used to approximate monthly churn if monthly is unknown.": "اختياري — لتقدير التسرب الشهري عند عدم معرفته.",
  "Average customer lifetime": "متوسط عمر العميل",
  "Optional override — leave Unknown to derive it from churn.": "قيمة اختيارية — اتركها غير معروفة لاشتقاقها من التسرب.",

  "Revenue per customer": "الإيراد لكل عميل",
  "Typically the same as your monthly ARPU.": "عادةً يساوي متوسط الإيراد الشهري لكل مستخدم.",
  "Direct cost per customer": "التكلفة المباشرة لكل عميل",
  "Payment processing %": "نسبة معالجة المدفوعات",
  "Infrastructure cost per customer": "تكلفة البنية التحتية لكل عميل",
  "Support cost per customer": "تكلفة الدعم لكل عميل",
  "Other variable cost per customer": "تكلفة متغيرة أخرى لكل عميل",
  "Founder salaries": "رواتب المؤسسين",
  "Employee salaries": "رواتب الموظفين",
  "Contractor expenses": "مصروفات المتعاقدين",
  "Office expenses": "مصروفات المكتب",
  Infrastructure: "البنية التحتية",
  "Software subscriptions": "اشتراكات البرامج",
  Marketing: "التسويق",
  "Sales expenses": "مصروفات المبيعات",
  "Legal / accounting": "القانون والمحاسبة",
  "Other monthly expenses": "مصروفات شهرية أخرى",
  "Available cash": "النقد المتاح",
  "Initial investment": "الاستثمار الأولي",
  "Other monthly income": "دخل شهري آخر",
  "Grants, interest, or other non-operating income that offsets burn.": "منح أو فوائد أو دخل غير تشغيلي آخر يخفّض معدل الحرق.",

  Low: "منخفض",
  High: "مرتفع",
  Unknown: "غير معروف",
  Known: "معلوم",
  Estimated: "تقديري",
  Quality: "جودة الافتراض",
  Assumptions: "الافتراضات",
  Formula: "المعادلة",
  Problem: "المشكلة",
  "How real and urgent is the problem?": "ما مدى واقعية المشكلة وإلحاحها؟",
  "How painful is the problem?": "ما مدى تأثير المشكلة؟",
  "Minor annoyance": "إزعاج بسيط",
  "Severe pain": "مشكلة شديدة",
  "How frequently does it occur?": "كم مرة تحدث؟",
  Rarely: "نادرًا",
  Constantly: "باستمرار",
  "Is the customer already spending money solving it?": "هل ينفق العميل المال بالفعل لحلها؟",
  No: "لا",
  "Significant spend": "إنفاق كبير",
  "What evidence do you have?": "ما الأدلة التي لديك؟",
  "Have customers been interviewed?": "هل أجريت مقابلات مع العملاء؟",
  "Do you have users?": "هل لديك مستخدمون؟",
  "Do you have paying customers?": "هل لديك عملاء يدفعون؟",
  "Do you have signed LOIs/contracts?": "هل لديك خطابات نوايا أو عقود موقعة؟",
  "Have customers actively requested the solution?": "هل طلب العملاء الحل بأنفسهم؟",
  None: "لا يوجد",
  Many: "كثير",
  Several: "عدة",
  Frequently: "مرارًا",
  Product: "المنتج",
  "Feasibility and differentiation.": "قابلية التنفيذ والتميّز.",
  "Is the product technically feasible?": "هل يمكن تنفيذ المنتج تقنيًا؟",
  "Very uncertain": "غير مؤكد جدًا",
  "Well understood": "واضح تمامًا",
  "How difficult is it to build the MVP?": "ما مدى صعوبة بناء المنتج الأولي؟",
  Easy: "سهل",
  "Very difficult": "صعب جدًا",
  "How differentiated is the product?": "ما مدى تميّز المنتج؟",
  Commodity: "منتج اعتيادي",
  "Highly unique": "فريد جدًا",
  Distribution: "التوزيع",
  "Can you reach customers efficiently?": "هل يمكنك الوصول إلى العملاء بكفاءة؟",
  "Do you know how to reach customers?": "هل تعرف كيف تصل إلى العملاء؟",
  "Clear plan": "خطة واضحة",
  "Do you already have an audience?": "هل لديك جمهور بالفعل؟",
  Large: "كبير",
  "Do you have partnerships or distribution channels?": "هل لديك شراكات أو قنوات توزيع؟",
  "Do you have an unfair distribution advantage?": "هل لديك ميزة استثنائية في التوزيع؟",
  Competition: "المنافسة",
  "Competition intensity": "حدة المنافسة",
  "Little competition": "منافسة محدودة",
  Intense: "شديدة",
  "Strength of differentiation": "قوة التميّز",
  Weak: "ضعيف",
  Strong: "قوي",
  "Ease of switching from competitors": "سهولة الانتقال من المنافسين",
  "Hard to switch": "صعب",
  "Easy to switch": "سهل",

  "Domain expertise": "الخبرة في المجال",
  "Deep expert": "خبير متمرس",
  "Technical ability": "القدرة التقنية",
  "Sales capability": "القدرة على المبيعات",
  "Marketing capability": "القدرة على التسويق",
  "Founder commitment": "التزام المؤسس",
  "Part-time": "دوام جزئي",
  "All-in": "التزام كامل",
  "Access to industry relationships": "الوصول إلى علاقات في القطاع",
  Extensive: "واسعة",
  "Ability to raise or provide capital": "القدرة على جمع أو توفير رأس المال",
  Limited: "محدودة",
  "Technical risk": "المخاطر التقنية",
  "Market risk": "مخاطر السوق",
  "Regulatory risk": "المخاطر التنظيمية",
  "Competitive risk": "المخاطر التنافسية",
  "Financial risk": "المخاطر المالية",
  "Dependency risk": "مخاطر الاعتماد",
  "Low risk": "مخاطر منخفضة",
  "High risk": "مخاطر مرتفعة",

  "Edit assumptions": "تعديل الافتراضات",
  "Export report": "تصدير التقرير",
  "Product Viability Score": "درجة جدوى المنتج",
  "Viability score": "درجة الجدوى",
  Confidence: "الثقة",
  "How much real-world evidence supports these assumptions.": "مدى دعم الأدلة الواقعية لهذه الافتراضات.",
  Maturity: "النضج",
  Stage: "المرحلة",
  "High Risk": "مخاطر مرتفعة",
  Promising: "واعد",
  "Very Strong": "قوي جدًا",
  "Several critical assumptions currently make the economics unattractive.": "عدة افتراضات جوهرية تجعل الاقتصاديات الحالية غير جذابة.",
  "The economics show significant gaps based on current assumptions.": "تظهر الاقتصاديات فجوات كبيرة وفق الافتراضات الحالية.",
  "The opportunity has potential but key assumptions need strengthening.": "للفرصة إمكانات، لكن الافتراضات الأساسية تحتاج إلى تعزيز.",
  "Strong economics based on current assumptions.": "اقتصاديات قوية وفق الافتراضات الحالية.",
  "Very strong economics based on current assumptions.": "اقتصاديات قوية جدًا وفق الافتراضات الحالية.",
  "Market Opportunity": "فرصة السوق",
  "Unit Economics": "اقتصاديات الوحدة",
  "Financial Viability": "الجدوى المالية",
  Execution: "التنفيذ",
  "How this score is calculated": "كيف تُحسب الدرجة",
  "% of overall score": "% من الدرجة الإجمالية",

  TAM: "السوق الإجمالي",
  SAM: "السوق المتاح",
  SOM: "السوق الممكن",
  MRR: "الإيراد الشهري المتكرر",
  ARR: "الإيراد السنوي المتكرر",
  "Gross Margin": "الهامش الإجمالي",
  "Gross margin": "الهامش الإجمالي",
  CAC: "تكلفة اكتساب العميل",
  LTV: "قيمة العميل مدى الحياة",
  "LTV:CAC": "القيمة إلى تكلفة الاكتساب",
  "CAC payback": "استرداد تكلفة الاكتساب",
  "Break-even Customers": "عملاء نقطة التعادل",
  "Break-even customers": "عملاء نقطة التعادل",
  "Monthly Burn": "الحرق الشهري",
  Runway: "مدة السيولة",
  Unreachable: "غير ممكن",
  "Cash Flow Positive": "تدفق نقدي موجب",
  "No finite runway": "لا توجد مدة نفاد محددة",
  Profitable: "مربح",
  "Total Addressable Market — the full revenue opportunity if every potential customer bought.": "إجمالي فرصة الإيراد إذا اشترى كل عميل محتمل.",
  "Serviceable Available Market — the portion of TAM realistically addressable.": "الجزء المتاح واقعيًا من السوق الإجمالي.",
  "Serviceable Obtainable Market — the portion of SAM you could realistically capture.": "الجزء الذي يمكنك الاستحواذ عليه واقعيًا من السوق المتاح.",
  "Monthly Recurring Revenue.": "الإيراد الشهري المتكرر.",
  "Annual Recurring Revenue.": "الإيراد السنوي المتكرر.",
  "Customer Acquisition Cost — average spend to acquire one paying customer.": "متوسط الإنفاق اللازم لاكتساب عميل يدفع.",
  "Customer Lifetime Value, based on contribution margin rather than raw revenue.": "قيمة العميل طوال مدة علاقته بناءً على هامش المساهمة.",
  "Lifetime value relative to acquisition cost. 3x+ is generally considered healthy.": "قيمة العميل مقارنة بتكلفة اكتسابه؛ وتُعد نسبة 3 أضعاف فأكثر جيدة عادةً.",
  "Gross profit as a share of revenue, after variable costs.": "نسبة الربح الإجمالي من الإيراد بعد التكاليف المتغيرة.",
  "Customers needed to cover fixed monthly costs.": "عدد العملاء اللازم لتغطية التكاليف الشهرية الثابتة.",
  "Monthly expenses minus revenue. Never shown as negative — profitable months are labeled Cash Flow Positive.": "المصروفات الشهرية ناقص الإيراد؛ وتظهر الأشهر المربحة كتدفق نقدي موجب.",
  "Months of operating cash remaining at the current burn rate.": "أشهر النقد التشغيلي المتبقية وفق معدل الحرق الحالي.",

  Insights: "الرؤى",
  "Critical risks": "المخاطر الحرجة",
  Warnings: "التنبيهات",
  Strengths: "نقاط القوة",
  Opportunities: "الفرص",
  "Recommended next experiments": "التجارب التالية الموصى بها",
  "Should you pursue this idea?": "هل ينبغي أن تتابع هذه الفكرة؟",
  "Top reasons": "أهم الأسباب",
  "Explore Further": "استكشف أكثر",
  "Validate Before Building": "تحقق قبل البناء",
  "Improve Economics": "حسّن الاقتصاديات",
  "Strong Candidate": "مرشح قوي",
  "The opportunity has potential but requires more evidence.": "للفرصة إمكانات لكنها تحتاج إلى مزيد من الأدلة.",
  "Economics may work, but validation is currently weak.": "قد تنجح الاقتصاديات، لكن التحقق الحالي ضعيف.",
  "Demand may exist, but the current business model has weak unit economics.": "قد يوجد طلب، لكن نموذج العمل الحالي يعاني من ضعف اقتصاديات الوحدة.",
  "Current market, financial, and validation assumptions indicate a strong opportunity worth progressing.": "تشير افتراضات السوق والمال والتحقق الحالية إلى فرصة قوية تستحق المتابعة.",
  "Several critical assumptions currently make the opportunity unattractive.": "عدة افتراضات جوهرية تجعل الفرصة الحالية غير جذابة.",

  "Assumption sensitivity": "حساسية الافتراضات",
  "Flex the assumptions that move the score the most and see the dashboard recalculate instantly.": "غيّر الافتراضات الأكثر تأثيرًا وشاهد إعادة الحساب فورًا.",
  "Most sensitive assumptions": "الافتراضات الأكثر حساسية",
  Price: "السعر",
  Churn: "التسرب",
  "Growth rate": "معدل النمو",
  "Adjusts product price and revenue per customer.": "يعدّل سعر المنتج والإيراد لكل عميل.",
  "Adjusts marketing + sales spend, which scales CAC proportionally.": "يعدّل إنفاق التسويق والمبيعات وبالتالي تكلفة الاكتساب.",
  "Adjusts the monthly churn rate.": "يعدّل معدل التسرب الشهري.",
  "Adjusts the monthly customer growth rate.": "يعدّل معدل نمو العملاء الشهري.",
  Score: "الدرجة",
  Reset: "إعادة ضبط",
  "Scenario analysis": "تحليل السيناريوهات",
  "Scenario analysis (24-month)": "تحليل السيناريوهات (24 شهرًا)",
  Conservative: "متحفظ",
  Base: "أساسي",
  Optimistic: "متفائل",
  "Conservative applies weaker growth/CAC/churn; optimistic applies stronger. Base uses your entered assumptions.": "يفترض السيناريو المتحفظ نموًا أضعف وتكلفة اكتساب وتسربًا أعلى، والمتفائل العكس، أما الأساسي فيستخدم مدخلاتك.",
  "Revenue (month 24)": "الإيراد (الشهر 24)",
  "MRR (month 24)": "الإيراد الشهري المتكرر (الشهر 24)",
  "Customers (month 24)": "العملاء (الشهر 24)",
  "Net cash flow (month 24)": "صافي التدفق النقدي (الشهر 24)",
  "Break-even month": "شهر نقطة التعادل",
  "Not reached": "لم تتحقق",
  Forecast: "التوقعات",
  "Month-by-month projection built from your current assumptions.": "توقع شهري مبني على افتراضاتك الحالية.",
  Customers: "العملاء",
  "Revenue vs. expenses": "الإيرادات مقابل المصروفات",
  Revenue: "الإيرادات",
  "Revenue growth": "نمو الإيرادات",
  "Cash balance": "الرصيد النقدي",

  "Product Viability Report": "تقرير جدوى المنتج",
  "Back to dashboard": "العودة إلى لوحة النتائج",
  "Print / Save as PDF": "طباعة / حفظ PDF",
  "Revenue & unit economics": "الإيرادات واقتصاديات الوحدة",
  "Financial viability": "الجدوى المالية",
  "Monthly burn": "الحرق الشهري",
  "Break-even revenue": "إيراد نقطة التعادل",
  "Required penetration": "الاختراق المطلوب",
  "Profitable / no finite runway": "مربح / لا توجد مدة نفاد محددة",
  "Unreachable at current margins": "غير ممكن بالهوامش الحالية",
  "This report evaluates the economics of the assumptions entered on": "يقيّم هذا التقرير اقتصاديات الافتراضات المدخلة في",
  "It does not predict success — it assesses whether the current numbers add up.": "لا يتنبأ بالنجاح، بل يقيّم مدى منطقية الأرقام الحالية.",
  Close: "إغلاق",

  // Export menu
  Export: "تصدير",
  "Export this project": "تصدير هذا المشروع",
  "Everything is generated locally in your browser — nothing is uploaded anywhere.": "كل شيء يُنشأ محليًا في متصفحك — لا يُرفع أي شيء إلى أي مكان.",
  "Viability report": "تقرير الجدوى",
  "Printable summary of scores, metrics, and recommendations.": "ملخص قابل للطباعة للدرجات والمؤشرات والتوصيات.",
  "Investor pitch deck": "عرض تقديمي للمستثمرين",
  "Narrative deck: problem, market, traction, economics, the ask.": "عرض سردي: المشكلة والسوق والزخم والاقتصاديات وطلب التمويل.",
  "All data — JSON": "جميع البيانات — JSON",
  "Every input and calculated output, for backup or re-use elsewhere.": "جميع المدخلات والمخرجات المحسوبة، للنسخ الاحتياطي أو إعادة الاستخدام.",
  "All data — CSV": "جميع البيانات — CSV",
  "Same data, flattened for spreadsheets.": "البيانات نفسها، مبسّطة لجداول البيانات.",

  // Pitch narrative wizard step
  "Pitch narrative": "السرد التقديمي",
  "Optional context used to generate the investor pitch deck.": "سياق اختياري يُستخدم لإنشاء العرض التقديمي للمستثمرين.",
  "Optional — used only to fill in the narrative sections of the investor pitch deck export. None of this affects your viability score.":
    "اختياري — يُستخدم فقط لملء الأقسام السردية في تصدير العرض التقديمي للمستثمرين. لا يؤثر أي من هذا في درجة الجدوى.",
  "What problem are you solving, and for whom? Why does it matter?": "ما المشكلة التي تحلّها، ولمن؟ ولماذا هي مهمة؟",
  "Competitive landscape": "المشهد التنافسي",
  "Who else solves this today, and how are you meaningfully different?": "من غيرك يحل هذه المشكلة اليوم، وما الذي يميزك فعليًا عنه؟",
  "Traction & milestones": "الزخم والمحطات الرئيسية",
  "Key proof points so far: customers, revenue, partnerships, launches, press.": "أبرز الأدلة حتى الآن: العملاء والإيرادات والشراكات والإطلاقات والتغطية الإعلامية.",
  "Founders and key team members — name, role, and relevant background.": "المؤسسون وأعضاء الفريق الأساسيون — الاسم والدور والخبرة ذات الصلة.",
  Vision: "الرؤية",
  "Where does this go in 3-5 years?": "أين ستكون هذه الفكرة خلال 3-5 سنوات؟",
  "Funding ask": "طلب التمويل",
  "The amount you're raising in this round, if applicable.": "المبلغ الذي تسعى لجمعه في هذه الجولة، إن وُجد.",
  "Use of funds": "استخدام الأموال",
  "How will this money be spent? e.g. 60% engineering, 25% sales, 15% buffer.": "كيف سيُصرف هذا المبلغ؟ مثال: 60% هندسة، 25% مبيعات، 15% احتياطي.",

  // Pitch deck view
  "Investor Pitch Deck": "عرض تقديمي للمستثمرين",
  "The problem": "المشكلة",
  "No problem statement entered yet — add one in the Pitch narrative step.": "لم يُدرج بيان للمشكلة بعد — أضِفه في خطوة السرد التقديمي.",
  "The solution": "الحل",
  "No solution summary entered yet — add a short description in the Basic information step.": "لم يُدرج ملخص للحل بعد — أضِف وصفًا مختصرًا في خطوة المعلومات الأساسية.",
  "Target penetration": "الاختراق المستهدف",
  Billing: "الفوترة",
  "No traction summary entered yet — add one from the deck's Edit deck details page.": "لم يُدرج ملخص للزخم بعد — أضِفه من صفحة تعديل تفاصيل العرض التقديمي.",
  "Financial outlook (24-month)": "التوقعات المالية (24 شهرًا)",
  "No competitive landscape entered yet — add named competitors from the deck's Edit deck details page.": "لم يُدرج مشهد تنافسي بعد — أضِف منافسين محددين من صفحة تعديل تفاصيل العرض التقديمي.",
  Competitor: "المنافس",
  "Your edge": "ميزتك",
  "No team bios entered yet — add named team members from the deck's Edit deck details page.": "لم تُدرج نبذات عن الفريق بعد — أضِف أعضاء فريق محددين من صفحة تعديل تفاصيل العرض التقديمي.",
  Unnamed: "بلا اسم",
  "No significant risks flagged.": "لم تُحدَّد مخاطر جوهرية.",
  "The ask": "طلب التمويل",
  "Extends runway to approximately": "يمدّد مدة السيولة إلى نحو",
  "at the current burn rate.": "وفق معدل الحرق الحالي.",
  Round: "الجولة",
  Valuation: "التقييم",
  "Previous investors": "المستثمرون السابقون",
  "No use-of-funds breakdown entered yet.": "لم يُدرج تفصيل لاستخدام الأموال بعد.",
  "No funding ask entered — add an amount in the Pitch narrative step if you're raising.": "لم يُدرج طلب تمويل — أضِف مبلغًا في خطوة السرد التقديمي إذا كنت تسعى لجمع تمويل.",
  "No vision statement entered yet — add one in the Pitch narrative step.": "لم تُدرج رؤية بعد — أضِفها في خطوة السرد التقديمي.",
  "Independent viability read": "قراءة مستقلة للجدوى",
  "Independently modeled from the assumptions in this deck — not a guarantee of outcome, a check on whether the current numbers add up.":
    "نموذج مستقل مبني على الافتراضات في هذا العرض — لا يضمن نتيجة، بل يتحقق من مدى منطقية الأرقام الحالية.",
  "Edit deck details": "تعديل تفاصيل العرض",
  "MRR over time": "الإيراد الشهري المتكرر عبر الزمن",
  "Customers over time": "العملاء عبر الزمن",

  // Pitch deck edit form
  "Back to deck": "العودة إلى العرض",
  "Deck details": "تفاصيل العرض",
  "Structured content used only by the investor pitch deck — growth over time, named team members, named competitors, and round terms. None of this affects your viability score.":
    "محتوى منظّم يُستخدم فقط في العرض التقديمي للمستثمرين — النمو عبر الزمن وأعضاء الفريق المحددين والمنافسين المحددين وشروط الجولة. لا يؤثر أي من هذا في درجة الجدوى.",
  "Traction history": "سجل الزخم",
  "A few data points showing growth over time — as many or as few as you have.": "بضع نقاط بيانات توضح النمو عبر الزمن — بقدر ما لديك، قلّت أو كثرت.",
  "e.g. Jan 2026": "مثال: يناير 2026",
  "Add data point": "إضافة نقطة بيانات",
  "Founders and key team members.": "المؤسسون وأعضاء الفريق الأساسيون.",
  Name: "الاسم",
  Role: "الدور",
  "Relevant background (optional)": "خبرة ذات صلة (اختياري)",
  "Add team member": "إضافة عضو فريق",
  Competitors: "المنافسون",
  "Who else solves this, and how are you different from each one specifically.": "من غيرك يحل هذه المشكلة، وما الذي يميزك عن كل منهم تحديدًا.",
  "Competitor name": "اسم المنافس",
  "Your edge against them": "ميزتك مقارنةً به",
  "Add competitor": "إضافة منافس",
  "Round details": "تفاصيل الجولة",
  "Optional terms for the round you're raising, if applicable.": "شروط اختيارية للجولة التي تسعى لجمعها، إن وُجدت.",
  "Round type": "نوع الجولة",
  Optional: "اختياري",
  "Save deck details": "حفظ تفاصيل العرض",
  Remove: "إزالة",

  // Funding round options
  "Pre-seed": "ما قبل التأسيسي",
  Seed: "تأسيسي",
  "Series A": "الجولة A",
  "Series B+": "الجولة B فأعلى",
  Bridge: "جسرية",
};

type DynamicReplacer = (match: string, ...groups: string[]) => string;
const DYNAMIC: Array<[RegExp, DynamicReplacer]> = [
  [/^Step (\d+) of (\d+)$/, (_, current, total) => `الخطوة ${current} من ${total}`],
  [/^Stage (\d+)$/, (_, stage) => `المرحلة ${stage}`],
  [/^Month (\d+)$/, (_, month) => `الشهر ${month}`],
  [/^(\d+(?:\.\d+)?) months?$/, (_, months) => `${months} شهر`],
  [/^Compare \((\d+)\)$/, (_, count) => `مقارنة (${count})`],
  [/^Updated (.+)$/, (_, date) => `آخر تحديث ${date}`],
  [/^(.+) · Generated (.+)$/, (_, prefix, date) => `${prefix} · أُنشئ في ${date}`],
  [/^±(.+) score pts across ±50%$/, (_, points) => `±${points} نقطة ضمن ±50%`],
  [/^(.+) scores (\d+)\/100 — the weakest driver of this result\.$/, (_, label, score) => `${translateCore(label)} يسجل ${score}/100، وهو أضعف عامل في هذه النتيجة.`],
  [/^(.+) scores (\d+)\/100, a clear strength\.$/, (_, label, score) => `${translateCore(label)} يسجل ${score}/100، وهي نقطة قوة واضحة.`],
  [/^(.+) scores (\d+)\/100 and has room to improve\.$/, (_, label, score) => `${translateCore(label)} يسجل ${score}/100 ولديه مجال للتحسن.`],
  [/^LTV:CAC is (.+)x\.$/, (_, value) => `نسبة قيمة العميل إلى تكلفة اكتسابه هي ${value} ضعف.`],
];

function translateCore(value: string): string {
  const normalized = value.replace(/\s+/g, " ");
  if (AR[normalized]) return AR[normalized];
  const generated = translateGeneratedArabic(normalized);
  if (generated) return generated;
  for (const [pattern, replacer] of DYNAMIC) {
    if (pattern.test(value)) return value.replace(pattern, replacer);
  }
  return value;
}

function translateText(value: string): string {
  const leading = value.match(/^\s*/)?.[0] ?? "";
  const trailing = value.match(/\s*$/)?.[0] ?? "";
  const core = value.slice(leading.length, value.length - trailing.length);
  return core ? `${leading}${translateCore(core)}${trailing}` : value;
}

const originalText = new Map<Text, string>();
const originalAttributes = new Map<Element, Map<string, string>>();
const ATTRIBUTES = ["placeholder", "aria-label", "title"] as const;

function ignored(node: Node): boolean {
  const element = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
  return !!element?.closest("script, style, [data-i18n-ignore]");
}

function translateTextNode(node: Text) {
  if (ignored(node) || !/[A-Za-z]/.test(node.data)) return;
  const translated = translateText(node.data);
  if (translated === node.data) return;
  originalText.set(node, node.data);
  node.data = translated;
}

function translateAttributes(element: Element) {
  if (ignored(element)) return;
  for (const name of ATTRIBUTES) {
    const value = element.getAttribute(name);
    if (!value || !/[A-Za-z]/.test(value)) continue;
    const translated = translateText(value);
    if (translated === value) continue;
    const values = originalAttributes.get(element) ?? new Map<string, string>();
    values.set(name, value);
    originalAttributes.set(element, values);
    element.setAttribute(name, translated);
  }
}

function translateTree(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) return translateTextNode(root as Text);
  if (root.nodeType !== Node.ELEMENT_NODE || ignored(root)) return;
  translateAttributes(root as Element);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.nodeType === Node.TEXT_NODE) translateTextNode(node as Text);
    else translateAttributes(node as Element);
  }
}

function restoreEnglish() {
  for (const [node, value] of originalText) if (node.isConnected) node.data = value;
  originalText.clear();
  for (const [element, values] of originalAttributes) {
    if (element.isConnected) for (const [name, value] of values) element.setAttribute(name, value);
  }
  originalAttributes.clear();
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>("en");
  const [ready, setReady] = useState(false);
  const observerRef = useRef<MutationObserver | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLocale(localStorage.getItem("pvc-locale") === "ar" ? "ar" : "en");
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!ready) return;
    observerRef.current?.disconnect();
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
    localStorage.setItem("pvc-locale", locale);
    if (locale === "en") return restoreEnglish();

    translateTree(document.body);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") translateTextNode(mutation.target as Text);
        if (mutation.type === "attributes") translateAttributes(mutation.target as Element);
        for (const node of mutation.addedNodes) translateTree(node);
      }
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...ATTRIBUTES],
    });
    observerRef.current = observer;
    return () => observer.disconnect();
  }, [locale, ready]);

  return <LanguageContext.Provider value={{ locale, setLocale }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}
