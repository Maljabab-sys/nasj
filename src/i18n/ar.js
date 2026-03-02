const ar = {
  // Header
  appTitle: 'منشئ صور العيادة',
  appSubtitle: 'بقلم د. مهنا الجباب',
  privacyBadge: 'صورك لا تغادر جهازك أبداً',

  // Step indicator
  stepUpload: 'رفع',
  stepCrop: 'قص',
  stepAnnotate: 'تعليق',
  stepCompose: 'تصميم',

  // Upload — categories
  step1Label: 'الخطوة ١',
  step1Heading: 'اختر الفئة',
  step1Desc: 'ما نوع المحتوى الذي تريد إنشاءه؟',
  categoryMedical: 'طبي وأسنان',
  categoryMedicalSub: 'حالات قبل وبعد السريرية',
  categoryEcommerce: 'التجارة الإلكترونية',
  categoryEcommerceSub: 'المنتجات والتجزئة',
  comingSoon: 'قريباً',

  // Upload — post type
  step2Label: 'الخطوة ٢',
  step2Heading: 'اختر نوع المنشور',
  step2Desc: 'كم عدد الصور التي سيعرضها هذا المنشور؟',
  postTypeBA: 'قبل وبعد',
  postTypeBASub: 'صورتان في منشور واحد',
  postTypeSingle: 'صورة واحدة',
  postTypeSingleSub: 'صورة واحدة مع تعليقات',

  // Upload — layout
  step3Label: 'الخطوة ٣',
  step3Heading: 'اختر التخطيط',
  step3Desc: 'كيف تريد ترتيب الصور في المنشور؟',
  layoutStacked: 'فوق بعض',
  layoutSideBySide: 'جنباً إلى جنب',
  layoutSingle: 'صورة واحدة',

  // Upload — format (single photo only)
  stepFormatLabel: 'الخطوة ٣',
  stepFormatHeading: 'اختر التنسيق',
  stepFormatDesc: 'حدد نسبة أبعاد منشورك.',
  formatSquare: 'مربع',
  formatSquareSub: '١:١ — تغذية إنستغرام الكلاسيكية',
  formatPortrait: 'عمودي',
  formatPortraitSub: '٤:٥ — مساحة أكبر في التغذية',
  formatStory: 'قصة / ريلز',
  formatStorySub: '٩:١٦ — شاشة كاملة (إنستغرام، تيك توك، سناب شات)',

  // Upload — layout (B&A only, step 4)
  step4Label: 'الخطوة ٤',
  step4Heading: 'اختر التخطيط',
  step4Desc: 'كيف تريد ترتيب صور القبل والبعد؟',

  // Upload — import (step 4 for single, step 5 for B&A)
  step5Label: 'الخطوة ٥',
  step5Heading: 'استيراد الصور وملء القالب',
  step5Desc: 'أفلت صورك أدناه، ثم اسحب كل صورة مصغرة إلى المكان المناسب في القالب.',
  step4DescEmphasis: 'اسحب كل صورة مصغرة',
  step4DescEnd: 'إلى المكان المناسب في القالب.',
  dropZoneHeading: 'أفلت الصور هنا',
  dropZoneSub: 'أو انقر للاستعراض — يمكنك اختيار عدة صور',
  galleryLabel: (n) => `${n} صورة — اسحب إلى القالب ←`,
  bucketLabel: 'سلة الصور',
  bucketCount: (n) => `${n} صورة`,
  placed: '✓ تم الوضع',
  noPhotos: 'لا توجد صور بعد — أفلت بعضها أعلاه.',
  templateLabel: 'القالب',
  templateHint: 'اسحب الصور من المعرض إلى المناطق المخصصة',
  slotBefore: 'قبل',
  slotAfter: 'بعد',
  slotPhoto: 'الصورة',
  slotDragHint: 'اسحب صورة هنا',
  btnNextCrop: 'التالي: القص ←',

  // Crop
  cropHeading: 'قص صورك',
  cropDesc: 'اقطع كل صورة للتركيز على الأسنان. يمكنك تخطي أي منهما.',
  cropSubLabel: (label) => `قص: ${label}`,
  cropHint: 'اسحب مقابض القص للضبط. اتركها كما هي إذا لم تكن تريد القص.',
  btnSkipOriginal: 'تخطي (استخدام الأصل)',
  btnApplyCrop: 'تطبيق القص',
  btnBack: 'رجوع →',

  // Annotate
  annotateHeading: (label) => `تعليق على صورة: ${label}`,
  annotateDesc: 'ارسم خط القوس أو الحافة بخط متقطع — أو استخدم الإنشاء التلقائي. يمكنك التخطي إذا لم يكن مطلوباً.',
  tipFreeDraw: 'انقر واسحب لرسم خط متقطع',
  tipPointToPoint: 'انقر لوضع النقاط. انقر مرتين للإنهاء. اضغط ESC للإلغاء.',
  btnSkipBefore: 'تخطي صورة القبل',
  btnNextAfter: 'التالي: البعد ←',
  btnSkipAfter: 'تخطي صورة البعد',
  btnNextCompose: 'التالي: التصميم ←',

  // Annotation toolbar
  toolFreeDraw: 'رسم حر',
  toolFreeDrawHint: 'انقر واسحب للرسم',
  toolPointToPoint: 'نقطة لنقطة',
  toolPointToPointHint: 'انقر لإضافة نقاط، انقر مرتين للإنهاء',
  toolIncisalArch: 'قوس الحافة',
  toolIncisalArchTitle: 'إنشاء تلقائي لخط الحافة الأمامية',
  toolFullArch: 'القوس الكامل',
  toolFullArchTitle: 'إنشاء تلقائي لخط القوس الكامل',
  toolUndo: '↩ تراجع',
  toolUndoTitle: 'التراجع عن آخر ضربة (Ctrl+Z)',
  toolClear: '🗑 مسح',
  toolClearTitle: 'مسح جميع الخطوط',

  // Compose
  composeHeading: 'تصميم منشورك',
  composeDesc: 'اختر التخطيط، عدّل العلامة المائية، ثم قم بالتنزيل.',
  labelLayout: 'التخطيط',
  layoutStackedDesc: 'القبل في الأعلى، البعد في الأسفل',
  layoutSideBySideDesc: 'القبل على اليمين، البعد على اليسار',
  layoutSingleImage: 'صورة واحدة',
  layoutSingleImageDesc: 'صورة كاملة',
  labelWatermark: 'اسم العلامة المائية',
  labelOutputSize: 'حجم الإخراج',
  size1080Desc: 'مربع (معيار إنستغرام)',
  size1350Desc: 'صورة عمودية 4:5',
  btnDownload: '⬇ تنزيل PNG',
  btnGenerating: 'جارٍ الإنشاء...',
  btnBackAnnotate: 'رجوع إلى التعليق →',
  labelPreview: 'معاينة',
  previewGenerating: 'جارٍ إنشاء المعاينة...',
  previewNote: 'جودة المعاينة مخفضة. الصورة المحملة بدقة كاملة.',

  // Theme
  switchToLight: 'التبديل إلى الوضع الفاتح',
  switchToDark: 'التبديل إلى الوضع الداكن',
  lightMode: 'فاتح',
  darkMode: 'داكن',

  // Footer
  footerBy: 'بواسطة د. مهنا الجباب',
  footerCopyright: `© ${new Date().getFullYear()} نسج. جميع الحقوق محفوظة.`,
}

export default ar
