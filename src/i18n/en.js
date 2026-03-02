const en = {
  // Header
  appTitle: 'Post Creator',
  appSubtitle: 'by Dr. Mhanna Aljabab',
  privacyBadge: 'Your photos never leave this device',

  // Step indicator
  stepUpload: 'Upload',
  stepCrop: 'Crop',
  stepAnnotate: 'Annotate',
  stepCompose: 'Compose',

  // Upload — categories
  step1Label: 'Step 1',
  step1Heading: 'Choose a category',
  step1Desc: 'What type of content are you creating?',
  categoryMedical: 'Medical & Dental',
  categoryMedicalSub: 'Before/after clinical cases',
  categoryEcommerce: 'E-Commerce',
  categoryEcommerceSub: 'Products & retail',
  comingSoon: 'Coming Soon',

  // Upload — post type
  step2Label: 'Step 2',
  step2Heading: 'Choose post type',
  step2Desc: 'How many photos will this post show?',
  postTypeBA: 'Before & After',
  postTypeBASub: 'Two photos in one post',
  postTypeSingle: 'Single Photo',
  postTypeSingleSub: 'One annotated photo',

  // Upload — layout
  step3Label: 'Step 3',
  step3Heading: 'Choose layout',
  step3Desc: 'How should the photos be arranged in the post?',
  layoutStacked: 'Stacked',
  layoutSideBySide: 'Side by Side',
  layoutSingle: 'Single',

  // Upload — format (single photo only)
  stepFormatLabel: 'Step 3',
  stepFormatHeading: 'Choose format',
  stepFormatDesc: 'Pick the aspect ratio for your post.',
  formatSquare: 'Square',
  formatSquareSub: '1:1 — Classic Instagram feed',
  formatPortrait: 'Portrait',
  formatPortraitSub: '4:5 — More feed space',
  formatStory: 'Story / Reel',
  formatStorySub: '9:16 — Full screen (Instagram, TikTok, Snapchat)',

  // Upload — layout (B&A only, step 4)
  step4Label: 'Step 4',
  step4Heading: 'Choose layout',
  step4Desc: 'How should the before & after photos be arranged?',

  // Upload — import (step 4 for single, step 5 for B&A)
  step5Label: 'Step 5',
  step5Heading: 'Import photos & fill the template',
  step5Desc: 'Drop your images below, then drag each thumbnail into the correct slot on the right.',
  step4DescEmphasis: 'drag each thumbnail',
  step4DescEnd: 'into the correct slot on the template.',
  dropZoneHeading: 'Drop images here',
  dropZoneSub: 'or click to browse — select multiple',
  galleryLabel: (n) => `${n} photo${n !== 1 ? 's' : ''} — drag into the template →`,
  bucketLabel: 'Photo Bucket',
  bucketCount: (n) => `${n} photo${n !== 1 ? 's' : ''}`,
  placed: '✓ Placed',
  noPhotos: 'No photos yet — drop some above.',
  templateLabel: 'Template',
  templateHint: 'Drag photos from the gallery into the slots',
  slotBefore: 'Before',
  slotAfter: 'After',
  slotPhoto: 'Photo',
  slotDragHint: 'Drag photo here',
  btnNextCrop: 'Next: Crop →',

  // Crop
  cropHeading: 'Crop your images',
  cropDesc: 'Crop each photo to focus on the teeth. You can skip either.',
  cropSubLabel: (label) => `Cropping: ${label}`,
  cropHint: 'Drag the crop handles to adjust. Leave as-is for no crop.',
  btnSkipOriginal: 'Skip (use original)',
  btnApplyCrop: 'Apply Crop',
  btnBack: '← Back',

  // Annotate
  annotateHeading: (label) => `Annotate: ${label} image`,
  annotateDesc: 'Draw the dashed arch/incisal line — or use Auto-Generate. You can skip if not needed.',
  tipFreeDraw: 'Click and drag to draw a dashed line',
  tipPointToPoint: 'Click to place points. Double-click to finish the line. Press ESC to cancel.',
  btnSkipBefore: 'Skip Before',
  btnNextAfter: 'Next: After →',
  btnSkipAfter: 'Skip After',
  btnNextCompose: 'Next: Compose →',

  // Annotation toolbar
  toolFreeDraw: 'Free Draw',
  toolFreeDrawHint: 'Click and drag to draw',
  toolPointToPoint: 'Point-to-Point',
  toolPointToPointHint: 'Click to add points, double-click to finish',
  toolIncisalArch: 'Incisal Arch',
  toolIncisalArchTitle: 'Auto-generate incisal edge line (frontal view)',
  toolFullArch: 'Full Arch',
  toolFullArchTitle: 'Auto-generate full arch line (occlusal view)',
  toolUndo: '↩ Undo',
  toolUndoTitle: 'Undo last stroke (Ctrl+Z)',
  toolClear: '🗑 Clear',
  toolClearTitle: 'Clear all strokes',

  // Compose
  composeHeading: 'Compose your post',
  composeDesc: 'Choose a layout, edit the watermark, then download.',
  labelLayout: 'Layout',
  layoutStackedDesc: 'Before on top, After on bottom',
  layoutSideBySideDesc: 'Before left, After right',
  layoutSingleImage: 'Single Image',
  layoutSingleImageDesc: 'One photo full frame',
  labelWatermark: 'Watermark name',
  labelOutputSize: 'Output size',
  size1080Desc: 'Square (Instagram standard)',
  size1350Desc: 'Portrait 4:5 (more feed space)',
  btnDownload: '⬇ Download PNG',
  btnGenerating: 'Generating...',
  btnBackAnnotate: '← Back to Annotate',
  labelPreview: 'Preview',
  previewGenerating: 'Generating preview...',
  previewNote: 'Preview quality is reduced. The downloaded PNG is full resolution.',

  // Theme
  switchToLight: 'Switch to light mode',
  switchToDark: 'Switch to dark mode',
  lightMode: 'Light',
  darkMode: 'Dark',

  // Footer
  footerBy: 'by Dr. Mhanna Aljabab',
  footerCopyright: `© ${new Date().getFullYear()} Nasj. All rights reserved.`,
}

export default en
