/**
 * Resizes an uploaded logo File into a compact WebP/PNG Data URL
 * suitable for persisting safely inside Firestore settings documents (< 100 KB).
 */
export async function resizeLogoFileToDataUrl(
  file: File,
  maxDimension = 220
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('অনুগ্রহ করে একটি বৈধ ছবি (PNG, JPG, WebP, SVG) নির্বাচন করুন।');
  }

  // Allow small SVG files directly
  if (file.type === 'image/svg+xml' && file.size <= 80 * 1024) {
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('লোগো ফাইল পড়তে সমস্যা হয়েছে।'));
      reader.readAsDataURL(file);
    });
  }

  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('ছবি ফাইল পড়তে সমস্যা হয়েছে।'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('ছবি লোড করতে ব্যর্থ হয়েছে।'));
    image.src = rawDataUrl;
  });

  const scale = Math.min(1, maxDimension / Math.max(img.width || 1, img.height || 1));
  const targetWidth = Math.max(1, Math.round(img.width * scale));
  const targetHeight = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('ব্রাউজার ক্যানভাস তৈরি করা যায়নি।');
  }

  ctx.clearRect(0, 0, targetWidth, targetHeight);
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  const webpDataUrl = canvas.toDataURL('image/webp', 0.88);
  if (webpDataUrl.startsWith('data:image/webp')) {
    return webpDataUrl;
  }
  return canvas.toDataURL('image/png');
}
