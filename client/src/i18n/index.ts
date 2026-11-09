export type LanguageCode = 'en' | 'am' | 'om' | 'ar' | 'fr';

export interface TranslationDict {
  // Ministry Top Bar
  ministryBadge: string;
  nationalPortal: string;
  accessibility: string;
  fontSize: string;
  highContrast: string;
  hotline: string;

  // Header Navigation
  home: string;
  courses: string;
  institutions: string;
  verifyCertificate: string;
  helpSupport: string;
  signIn: string;
  signUp: string;
  myDashboard: string;
  logout: string;
  welcome: string;

  // Landing Page
  heroBadge: string;
  heroTitle: string;
  heroHighlight: string;
  heroSubtitle: string;
  searchPlaceholder: string;
  searchBtn: string;
  schools: string;
  schoolsSub: string;
  universities: string;
  universitiesSub: string;
  trainingCenters: string;
  trainingSub: string;
  independentLearners: string;
  independentSub: string;
  popularCourses: string;
  popularCoursesSub: string;
  viewAll: string;
  activeLearnersCount: string;
  certifiedCoursesCount: string;
  accreditedInstitutionsCount: string;
  expertInstructorsCount: string;

  // Auth (Sign In & Sign Up)
  signInTitle: string;
  signInSubtitle: string;
  signUpTitle: string;
  signUpSubtitle: string;
  fullNameLabel: string;
  fullNamePlaceholder: string;
  emailLabel: string;
  emailPlaceholder: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  roleLabel: string;
  institutionLabel: string;
  institutionPlaceholder: string;
  rememberMe: string;
  forgotPassword: string;
  signInBtn: string;
  signUpBtn: string;
  alreadyHaveAccount: string;
  dontHaveAccount: string;
  orContinueWith: string;

  // Roles
  roleStudent: string;
  roleTeacher: string;
  roleInstitutionAdmin: string;
  roleIndependent: string;

  // Footer
  footerAccreditation: string;
  footerAboutTitle: string;
  footerAboutDesc: string;
  footerQuickLinks: string;
  footerAcademicTitle: string;
  footerSupportTitle: string;
  footerPrivacy: string;
  footerTerms: string;
  footerSecurity: string;
  footerRights: string;
  footerSystemStatus: string;
}

export const translations: Record<LanguageCode, TranslationDict> = {
  en: {
    ministryBadge: 'Official Portal of the Ministry of Education & Higher Learning',
    nationalPortal: 'Unified National E-Learning Infrastructure',
    accessibility: 'Accessibility Tools',
    fontSize: 'Text Size',
    highContrast: 'High Contrast',
    hotline: 'Academic Hotline: +251 11 551 7200',

    home: 'Home',
    courses: 'Academic Courses',
    institutions: 'Accredited Institutions',
    verifyCertificate: 'Verify Certificate',
    helpSupport: 'Help & Governance',
    signIn: 'Sign In',
    signUp: 'Sign Up',
    myDashboard: 'Go to Dashboard',
    logout: 'Sign Out',
    welcome: 'Welcome',

    heroBadge: 'National Digital Education & Credentialing Framework',
    heroTitle: 'Learn Without',
    heroHighlight: 'Limits',
    heroSubtitle: 'Access accredited digital curriculum from anywhere. Built for primary schools, universities, professional training institutes, and independent learners nationwide.',
    searchPlaceholder: 'Search courses by subject, curriculum code, or accredited institution...',
    searchBtn: 'Search Portal',
    schools: 'K-12 Schools',
    schoolsSub: 'Primary & Secondary Education',
    universities: 'Universities & Colleges',
    universitiesSub: 'Undergraduate & Graduate',
    trainingCenters: 'Polytechnics & TVET',
    trainingSub: 'Vocational & Applied Skills',
    independentLearners: 'Lifelong Learners',
    independentSub: 'Self-Paced Continuing Education',
    popularCourses: 'Accredited Curriculum Courses',
    popularCoursesSub: 'Nationally standardized syllabi curated by accredited faculty and certified educators.',
    viewAll: 'Explore Directory',
    activeLearnersCount: 'Active Students Enrolled',
    certifiedCoursesCount: 'Curriculum Modules',
    accreditedInstitutionsCount: 'Accredited Campuses',
    expertInstructorsCount: 'Certified Educators',

    signInTitle: 'Sign In to Portal',
    signInSubtitle: 'Access your student, educator, or institutional workspace',
    signUpTitle: 'Create Your Academic Account',
    signUpSubtitle: 'Create your account dynamically as a learner, teacher, or institution administrator',
    fullNameLabel: 'Your Full Legal Name',
    fullNamePlaceholder: 'Enter your first and last name',
    emailLabel: 'Email Address / Academic ID',
    emailPlaceholder: 'e.g. yourname@domain.edu',
    passwordLabel: 'Secure Password',
    passwordPlaceholder: 'At least 12 characters with upper/lowercase, number & symbol',
    roleLabel: 'Select Your Academic Role',
    institutionLabel: 'Your School / University / Organization',
    institutionPlaceholder: 'e.g. Regional University, Learning Center...',
    rememberMe: 'Keep me authenticated',
    forgotPassword: 'Forgot password?',
    signInBtn: 'Sign In to Account',
    signUpBtn: 'Complete Registration & Enter',
    alreadyHaveAccount: 'Already have an official account?',
    dontHaveAccount: 'New to the national platform?',
    orContinueWith: 'Or authenticate with institutional SSO',

    roleStudent: 'Student / Learner',
    roleTeacher: 'Teacher / Faculty Instructor',
    roleInstitutionAdmin: 'Institution Dean / Administrator',
    roleIndependent: 'Independent Continuing Learner',

    footerAccreditation: 'Endorsed by the Federal Ministry of Education & National E-Learning Accreditation Board. All digital credentials comply with W3C Verifiable Credentials and ISO/IEC 19788 e-learning standards.',
    footerAboutTitle: 'National Infrastructure',
    footerAboutDesc: 'EduSphere is the unified cloud education and digital diploma platform providing equal educational opportunities, verified curriculum, and standardized online classrooms nationwide.',
    footerQuickLinks: 'Academic Portals',
    footerAcademicTitle: 'Standards & Quality',
    footerSupportTitle: 'Academic Support & Helplines',
    footerPrivacy: 'Data Privacy & FERPA Compliance',
    footerTerms: 'Terms of Academic Service',
    footerSecurity: 'Security & Integrity Guidelines',
    footerRights: 'All rights reserved. Ministry of Education Unified Portal.',
    footerSystemStatus: 'All National LMS Nodes Operational (99.98% Uptime)',
  },

  // Amharic (አማርኛ) - Ethiopian Ministry of Education primary working language
  am: {
    ministryBadge: 'የትምህርት እና ከፍተኛ ትምህርት ሚኒስቴር ይፋዊ ፖርታል',
    nationalPortal: 'የተቀናጀ የኢትዮጵያ ዲጂታል ትምህርት መሠረተ-ልማት',
    accessibility: 'የተደራሽነት መሣሪያዎች',
    fontSize: 'የፊደል መጠን',
    highContrast: 'ከፍተኛ ንፅፅር',
    hotline: 'የአካዳሚክ የስልክ መስመር: 011 551 7200',

    home: 'ዋና ገጽ',
    courses: 'የትምህርት ክፍለ-ጊዜያት',
    institutions: 'እውቅና ያላቸው ተቋማት',
    verifyCertificate: 'የምስክር ወረቀት አረጋግጥ',
    helpSupport: 'እርዳታ እና መመሪያ',
    signIn: 'ግባ (Sign In)',
    signUp: 'ተመዝገብ (Sign Up)',
    myDashboard: 'ወደ ዳሽቦርድ ሂድ',
    logout: 'ውጣ',
    welcome: 'እንኳን ደህና መጡ',

    heroBadge: 'ብሔራዊ የዲጂታል ትምህርትና ምስክር ወረቀት ማረጋገጫ ሥርዓት',
    heroTitle: 'ወሰን የለሽ',
    heroHighlight: 'ትምህርት',
    heroSubtitle: 'ከየትኛውም ቦታ ሆነው እውቅና ያለውን ስርዓተ-ትምህርት ይማሩ። ለአንደኛ እና ሁለተኛ ደረጃ ትምህርት ቤቶች፣ ዩኒቨርሲቲዎች፣ ቴክኒክና ሙያ ኮሌጆች እና ራሳቸውን ለሚያስተምሩ ተማሪዎች የተዘጋጀ።',
    searchPlaceholder: 'ትምህርቶችን በርዕስ፣ በኮድ ወይም በተቋም ስም ይፈልጉ...',
    searchBtn: 'ፈልግ',
    schools: 'ትምህርት ቤቶች',
    schoolsSub: 'አንደኛ እና ሁለተኛ ደረጃ',
    universities: 'ዩኒቨርሲቲዎችና ኮሌጆች',
    universitiesSub: 'ከፍተኛ ትምህርት',
    trainingCenters: 'ቴክኒክና ሙያ (TVET)',
    trainingSub: 'የሙያና ክህሎት ስልጠና',
    independentLearners: 'የግል ተማሪዎች',
    independentSub: 'በራስ ፍጥነት የሚደረግ ጥናት',
    popularCourses: 'እውቅና ያላቸው የትምህርት ዘርፎች',
    popularCoursesSub: 'በከፍተኛ የትምህርት ባለሙያዎችና መምህራን የተዘጋጁ ሀገር አቀፍ ደረጃቸውን የጠበቁ ትምህርቶች።',
    viewAll: 'ሁሉንም ይመልከቱ',
    activeLearnersCount: 'ንቁ ተማሪዎች',
    certifiedCoursesCount: 'የትምህርት ሞጁሎች',
    accreditedInstitutionsCount: 'እውቅና ያላቸው ካምፓሶች',
    expertInstructorsCount: 'ብቁ መምህራን',

    signInTitle: 'ወደ መለያዎ ይግቡ',
    signInSubtitle: 'የተማሪ፣ የመምህር ወይም የተቋም አስተዳዳሪ ገጽዎን ይክፈቱ',
    signUpTitle: 'አዲስ የትምህርት መለያ ይፍጠሩ',
    signUpSubtitle: 'ስምዎንና መረጃዎን በማስገባት እንደ ተማሪ፣ መምህር ወይም አስተዳዳሪ ይመዝገቡ',
    fullNameLabel: 'ሙሉ ስምዎ',
    fullNamePlaceholder: 'ስምዎንና የአባትዎን ስም ያስገቡ',
    emailLabel: 'ኢሜይል አድራሻ / የትምህርት መለያ',
    emailPlaceholder: 'ምሳሌ: yourname@domain.edu',
    passwordLabel: 'የይለፍ ቃል',
    passwordPlaceholder: 'ቢያንስ 8 ፊደላት፣ ቁጥሮችና ምልክቶችን የያዘ',
    roleLabel: 'የትምህርት ሚናዎን ይምረጡ',
    institutionLabel: 'የትምህርት ቤትዎ / ዩኒቨርሲቲዎ ስም',
    institutionPlaceholder: 'ምሳሌ: አዲስ አበባ ዩኒቨርሲቲ፣ አዳማ ት/ቤት...',
    rememberMe: 'መረጃዬን አስታውስ',
    forgotPassword: 'የይለፍ ቃል ረሱ?',
    signInBtn: 'ግባ',
    signUpBtn: 'ምዝገባውን አጠናቅቅ',
    alreadyHaveAccount: 'መለያ አለዎት?',
    dontHaveAccount: 'አዲስ ተጠቃሚ ነዎት?',
    orContinueWith: 'ወይም በተቋምዎ መለያ ይግቡ',

    roleStudent: 'ተማሪ (Student)',
    roleTeacher: 'መምህር / አስተማሪ (Instructor)',
    roleInstitutionAdmin: 'የትምህርት ተቋም አስተዳዳሪ (Dean)',
    roleIndependent: 'የግል ተማሪ (Independent)',

    footerAccreditation: 'በትምህርት ሚኒስቴር እና በብሔራዊ የኢ-ትምህርት ቦርድ እውቅና የተሰጠው። ሁሉም ዲጂታል ምስክር ወረቀቶች በQR ኮድ የሚረጋገጡ ናቸው።',
    footerAboutTitle: 'ብሔራዊ መሠረተ-ልማት',
    footerAboutDesc: 'ኤዱስፌር (EduSphere) በሀገር አቀፍ ደረጃ ጥራት ያለው ትምህርት፣ የቀጥታ ቪዲዮ ክፍሎች እና የተረጋገጡ የምስክር ወረቀቶችን የሚያቀርብ ፖርታል ነው።',
    footerQuickLinks: 'ፈጣን ማስፈንጠሪያዎች',
    footerAcademicTitle: 'የትምህርት ጥራትና ደረጃዎች',
    footerSupportTitle: 'የእርዳታ መስመሮች',
    footerPrivacy: 'የመረጃ ደህንነት መመሪያ',
    footerTerms: 'የአገልግሎት ውሎች',
    footerSecurity: 'የስርዓት ደህንነት',
    footerRights: 'መብቱ በህግ የተጠበቀ ነው። የትምህርት ሚኒስቴር የተቀናጀ ፖርታል።',
    footerSystemStatus: 'ሁሉም የዲጂታል ሰርቨሮች በጥሩ ሁኔታ እየሰሩ ናቸው (99.98%)',
  },

  // Afaan Oromoo
  om: {
    ministryBadge: 'Wajjira Ministeera Barnootaa fi Barnoota Olaanaa',
    nationalPortal: 'Sirna Barnoota Dijitaalaa Biyyoolessaa Waloo',
    accessibility: 'Meeshaalee Dhaqqabamummaa',
    fontSize: 'Guddina Barreeffamaa',
    highContrast: 'Garaagarummaa Ol’aanaa',
    hotline: 'Sarara Hootlaayinii: 011 551 7200',

    home: 'Fuula Duraa',
    courses: 'Koorsoota Barnootaa',
    institutions: 'Dhaabbilee Beekamtii Qaban',
    verifyCertificate: 'Waraqaa Ragaa Mirkaneessi',
    helpSupport: 'Gargaarsa & Qajeelfama',
    signIn: 'Seeni (Sign In)',
    signUp: 'Galmaa’i (Sign Up)',
    myDashboard: 'Gara Daashboordiitti',
    logout: 'Ba’i',
    welcome: 'Baga nagaan dhuftan',

    heroBadge: 'Sirna Barnoota Dijitaalaa fi Ragaa Biyyoolessaa',
    heroTitle: 'Daangaa Malee',
    heroHighlight: 'Baradhaa',
    heroSubtitle: 'Bakka jirtan hundatti barnoota beekamtii qabu hordofaa. Manneen barnootaa sadarkaa 1ffaa fi 2ffaa, yunivarsiitota fi kolleejjotaaf qophaa’e.',
    searchPlaceholder: 'Koorsoota matadureen yookiin maqaa dhaabbataan barbaadaa...',
    searchBtn: 'Barbaadi',
    schools: 'Manneen Barnootaa',
    schoolsSub: 'Sadarkaa 1ffaa fi 2ffaa',
    universities: 'Yunivarsiitota & Kolleejjota',
    universitiesSub: 'Barnoota Olaanaa',
    trainingCenters: 'Koolleejjota Teeknikaa (TVET)',
    trainingSub: 'Ogummaa fi Dandeettii',
    independentLearners: 'Barattoota Dhuunfaa',
    independentSub: 'Of Dandeessanii Baradhaa',
    popularCourses: 'Koorsoota Beekamtii Qaban',
    popularCoursesSub: 'Koorsoota qulqullina olaanaa qaban kan qorattootaa fi barsiisotaan qophaa’an.',
    viewAll: 'Hunda Ilaalaa',
    activeLearnersCount: 'Barattoota Qophaa’an',
    certifiedCoursesCount: 'Koorsoota Dijitaalaa',
    accreditedInstitutionsCount: 'Dhaabbilee Beekamoo',
    expertInstructorsCount: 'Barsiisota Gahumsa Qaban',

    signInTitle: 'Gara Herrega Keessaniitti Seenaa',
    signInSubtitle: 'Bakka hojii barataa, barsiisaa yookiin bulchaa bani',
    signUpTitle: 'Herrega Haaraa Banadhaa',
    signUpSubtitle: 'Maqaa keessan guutuun barataa, barsiisaa yookiin bulchaa ta’uun galmaa’aa',
    fullNameLabel: 'Maqaa Guutuu',
    fullNamePlaceholder: 'Maqaa keessanii fi kan abbaa galchaa',
    emailLabel: 'Teessoo Imeeyilii',
    emailPlaceholder: 'fakkeenya: maqaa@domain.edu',
    passwordLabel: 'Jecha Iccitii',
    passwordPlaceholder: 'Qubee, lakkoofsaa fi mallattoolee',
    roleLabel: 'Gahee Keessan Filadhaa',
    institutionLabel: 'Maqaa Mana Barnootaa / Yunivarsiitii',
    institutionPlaceholder: 'fakkeenya: Yunivarsiitii Finfinnee...',
    rememberMe: 'Na Yaadadhu',
    forgotPassword: 'Jecha iccitii irraanfattee?',
    signInBtn: 'Seeni',
    signUpBtn: 'Galmee Xumuri',
    alreadyHaveAccount: 'Herrega duraan qabduu?',
    dontHaveAccount: 'Haaraa dhuftanii?',
    orContinueWith: 'Yookiin herrega dhaabbataatiin seeni',

    roleStudent: 'Barataa (Student)',
    roleTeacher: 'Barsiisaa (Instructor)',
    roleInstitutionAdmin: 'Bulchaa Dhaabbataa (Admin)',
    roleIndependent: 'Barataa Dhuunfaa',

    footerAccreditation: 'Ministeera Barnootaatiin beekamtii kan argate. Waraqaaleen ragaa hundi QR koodiin mirkanaa’u.',
    footerAboutTitle: 'Bu’uuraalee Biyyoolessaa',
    footerAboutDesc: 'EduSphere sirna barnootaa qulqullina qabu fi kutaa barnootaa viidiyoo kallattii kennuudha.',
    footerQuickLinks: 'Liinkiiwwan Ariifachiisoo',
    footerAcademicTitle: 'Qulqullina Barnootaa',
    footerSupportTitle: 'Sarara Gargaarsaa',
    footerPrivacy: 'Iccitii Daataa',
    footerTerms: 'Waliigaltee Tajaajilaa',
    footerSecurity: 'Nageenya Sirnaa',
    footerRights: 'Mirgi qopheessaa seeraan eeggamaadha. Ministeera Barnootaa.',
    footerSystemStatus: 'Sarvaroonni hundinuu sirriitti hojjechaa jiru (99.98%)',
  },

  // Arabic (العربية)
  ar: {
    ministryBadge: 'البوابة الرسمية لوزارة التعليم العالي والبحث العلمي',
    nationalPortal: 'البنية التحتية الوطنية الموحدة للتعليم الإلكتروني',
    accessibility: 'أدوات الوصول وذوي الإعاقة',
    fontSize: 'حجم الخط',
    highContrast: 'تباين عالي',
    hotline: 'الخط الساخن الأكاديمي: 7200 551 11 251+',

    home: 'الرئيسية',
    courses: 'المناهج المعتمدة',
    institutions: 'المؤسسات المعتمدة',
    verifyCertificate: 'التحقق من الشهادات',
    helpSupport: 'الدعم والحوكمة',
    signIn: 'تسجيل الدخول',
    signUp: 'إنشاء حساب جديد',
    myDashboard: 'لوحة التحكم',
    logout: 'تسجيل الخروج',
    welcome: 'مرحباً بك',

    heroBadge: 'الإطار الوطني المعتمد للمؤهلات الرقمية',
    heroTitle: 'تعلّم بلا',
    heroHighlight: 'حدود',
    heroSubtitle: 'بوابة وطنية موحدة تتيح الوصول إلى المناهج التعليمية المعتمدة للمدارس والجامعات ومراكز التدريب المهني والدارسين المستقلين.',
    searchPlaceholder: 'ابحث عن المقررات بالاسم أو الرمز أو الجامعة...',
    searchBtn: 'بحث في البوابة',
    schools: 'التعليم العام (K-12)',
    schoolsSub: 'المدارس الابتدائية والثانوية',
    universities: 'الجامعات والكليات',
    universitiesSub: 'التعليم العالي والدراسات العليا',
    trainingCenters: 'المعاهد المهنية والتقنية',
    trainingSub: 'تطوير الكفاءات والمهارات',
    independentLearners: 'التعلم المستمر',
    independentSub: 'مسارات تعليمية ذاتية الوتيرة',
    popularCourses: 'المقررات الأكاديمية الرائدة',
    popularCoursesSub: 'مناهج قياسية معتمدة بإشراف نخبة من أساتذة الجامعات والمدربين المعتمدين.',
    viewAll: 'استعراض الدليل الأكاديمي',
    activeLearnersCount: 'طالب مسجل نشط',
    certifiedCoursesCount: 'وحدة تعليمية معتمدة',
    accreditedInstitutionsCount: 'مؤسسة تعليمية معتمدة',
    expertInstructorsCount: 'عضو هيئة تدريس معتمد',

    signInTitle: 'تسجيل الدخول للبوابة الوطنية',
    signInSubtitle: 'ادخل إلى مساحتك الأكاديمية كطالب أو معلم أو مدير مؤسسة',
    signUpTitle: 'تسجيل مستخدم جديد',
    signUpSubtitle: 'سجل بياناتك الحقيقية للانضمام كطالب أو عضو تدريس أو إدارة مؤسسة',
    fullNameLabel: 'الاسم الرباعي الرسمي',
    fullNamePlaceholder: 'أدخل اسمك الكامل كما في الوثائق الرسمية',
    emailLabel: 'البريد الإلكتروني / الهوية الأكاديمية',
    emailPlaceholder: 'name@institution.edu',
    passwordLabel: 'كلمة المرور الآمنة',
    passwordPlaceholder: '8 خانات على الأقل تحتوي أرقاماً ورموزاً',
    roleLabel: 'الصفة الأكاديمية',
    institutionLabel: 'المؤسسة التعليمية / المدرسة / الجامعة',
    institutionPlaceholder: 'أدخل اسم جامعتك أو مدرستك...',
    rememberMe: 'تذكر بياناتي في هذا المتصفح',
    forgotPassword: 'نسيت كلمة المرور؟',
    signInBtn: 'دخول البوابة',
    signUpBtn: 'تأكيد التسجيل والدخول',
    alreadyHaveAccount: 'هل لديك حساب مفعل بالفعل؟',
    dontHaveAccount: 'مستخدم جديد في المنظومة الوطنية؟',
    orContinueWith: 'أو الدخول عبر النفاذ الأكاديمي الموحد (SSO)',

    roleStudent: 'طالب / دارس (Student)',
    roleTeacher: 'عضو هيئة تدريس / معلم (Instructor)',
    roleInstitutionAdmin: 'عميد / مدير مؤسسة تعليمية (Dean)',
    roleIndependent: 'دارس مستقل (Independent Learner)',

    footerAccreditation: 'بوابة معتمدة ومرخصة من وزارة التعليم والمجلس الوطني لاعتماد التعليم الرقمي. كافة الشهادات مشفرة وتدعم التحقق الفوري عبر رمز الاستجابة السريعة (QR Code).',
    footerAboutTitle: 'البنية الوطنية الموحدة',
    footerAboutDesc: 'منصة إدوسفير (EduSphere) تقدم حلول التعليم الرقمي السيادية والفصول الافتراضية عالية الأمان وإصدار الوثائق الأكاديمية المعتمدة.',
    footerQuickLinks: 'روابط البوابة الأكاديمية',
    footerAcademicTitle: 'الجودة والاعتماد الأكاديمي',
    footerSupportTitle: 'مكاتب المساندة والخط الساخن',
    footerPrivacy: 'سياسة الخصوصية وحماية البيانات',
    footerTerms: 'شروط الاستخدام الأكاديمي',
    footerSecurity: 'معايير النزاهة والمراقبة',
    footerRights: 'جميع الحقوق محفوظة لوزارة التعليم © 2026',
    footerSystemStatus: 'جميع الخوادم المركزية تعمل بكفاءة 99.98%',
  },

  // French (Français)
  fr: {
    ministryBadge: 'Portail Officiel du Ministère de l\'Éducation et de l\'Enseignement Supérieur',
    nationalPortal: 'Infrastructure Nationale Unifiée d\'E-Learning',
    accessibility: 'Outils d\'Accessibilité',
    fontSize: 'Taille du Texte',
    highContrast: 'Contraste Élevé',
    hotline: 'Assistance Académique : +251 11 551 7200',

    home: 'Accueil',
    courses: 'Cours Homologués',
    institutions: 'Établissements Agréés',
    verifyCertificate: 'Vérifier Diplôme',
    helpSupport: 'Aide & Gouvernance',
    signIn: 'Connexion',
    signUp: 'Créer un Compte',
    myDashboard: 'Tableau de Bord',
    logout: 'Déconnexion',
    welcome: 'Bienvenue',

    heroBadge: 'Cadre National de Certification & d\'Éducation Numérique',
    heroTitle: 'Apprenez Sans',
    heroHighlight: 'Limites',
    heroSubtitle: 'Accédez aux programmes académiques homologués depuis n\'importe où. Conçu pour les écoles, universités, instituts de formation et apprenants indépendants.',
    searchPlaceholder: 'Rechercher un cours, un programme ou un établissement...',
    searchBtn: 'Rechercher',
    schools: 'Écoles Primaires & Secondaires',
    schoolsSub: 'Enseignement Général (K-12)',
    universities: 'Universités & Grandes Écoles',
    universitiesSub: 'Enseignement Supérieur',
    trainingCenters: 'Instituts Techniques (TVET)',
    trainingSub: 'Formations Professionnelles',
    independentLearners: 'Apprenants Libres',
    independentSub: 'Formation Continue Autonome',
    popularCourses: 'Programmes Homologués',
    popularCoursesSub: 'Cursus nationaux supervisés par un corps professoral agréé.',
    viewAll: 'Voir Tout le Répertoire',
    activeLearnersCount: 'Étudiants Inscrits',
    certifiedCoursesCount: 'Modules Certifiés',
    accreditedInstitutionsCount: 'Campus Homologués',
    expertInstructorsCount: 'Enseignants Agréés',

    signInTitle: 'Connexion au Portail',
    signInSubtitle: 'Accédez à votre espace étudiant, enseignant ou gestionnaire',
    signUpTitle: 'Inscription Dynamique',
    signUpSubtitle: 'Créez votre compte en saisissant vos identifiants réels',
    fullNameLabel: 'Nom et Prénom Officiels',
    fullNamePlaceholder: 'Entrez votre nom complet',
    emailLabel: 'Adresse E-mail / Identifiant Académique',
    emailPlaceholder: 'nom@domaine.edu',
    passwordLabel: 'Mot de Passe Sécurisé',
    passwordPlaceholder: '8 caractères minimum (chiffres & symboles)',
    roleLabel: 'Sélectionnez Votre Rôle',
    institutionLabel: 'Votre Établissement de Rattachement',
    institutionPlaceholder: 'ex. Université d\'État, Lycée...',
    rememberMe: 'Rester connecté',
    forgotPassword: 'Mot de passe oublié ?',
    signInBtn: 'Se Connecter',
    signUpBtn: 'Finaliser l\'Inscription',
    alreadyHaveAccount: 'Avez-vous déjà un compte ?',
    dontHaveAccount: 'Nouveau sur le portail ?',
    orContinueWith: 'Ou connectez-vous avec SSO académique',

    roleStudent: 'Étudiant / Apprenant',
    roleTeacher: 'Enseignant / Formateur',
    roleInstitutionAdmin: 'Doyen / Administrateur d\'Établissement',
    roleIndependent: 'Apprenant Indépendant',

    footerAccreditation: 'Homologué par le Ministère de l\'Éducation. Tous les diplômes délivrés intègrent un scellé cryptographique vérifiable par QR code.',
    footerAboutTitle: 'Infrastructure Nationale',
    footerAboutDesc: 'EduSphere garantit un accès universel aux classes virtuelles, cours interactifs et certifications diplomantes reconnues.',
    footerQuickLinks: 'Accès Rapides',
    footerAcademicTitle: 'Normes & Qualité',
    footerSupportTitle: 'Lignes d\'Assistance',
    footerPrivacy: 'Confidentialité & RGPD',
    footerTerms: 'Conditions Générales',
    footerSecurity: 'Intégrité & Sécurité',
    footerRights: 'Tous droits réservés. Ministère de l\'Éducation © 2026',
    footerSystemStatus: 'Tous les serveurs sont opérationnels (Disponibilité 99,98%)',
  },
};
