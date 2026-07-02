// ============================================================================
// Image Host — uploads images to tmpfiles.org (free, no auth, CORS-enabled)
// and returns a direct-download URL. This keeps base64 data out of the cloud
// JSON store so it stays under the size limit.
// ============================================================================

const UPLOAD_URL = 'https://tmpfiles.org/api/v1/upload';

export interface UploadResult {
  url: string;
  error: string | null;
}

/** Upload an image file and return a direct-access URL. */
export async function uploadImage(file: File): Promise<UploadResult> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(UPLOAD_URL, { method: 'POST', body: formData });
    const data = await res.json();
    if (data.status === 'success' && data.data?.url) {
      // Convert the page URL to a direct-download URL:
      // https://tmpfiles.org/xxxx/file.jpg -> https://tmpfiles.org/dl/xxxx/file.jpg
      const directUrl = data.data.url.replace(
        'tmpfiles.org/',
        'tmpfiles.org/dl/'
      );
      return { url: directUrl, error: null };
    }
    return { url: '', error: 'Upload failed: ' + (data.message || 'unknown error') };
  } catch (e) {
    return {
      url: '',
      error: e instanceof Error ? e.message : 'Network error during upload',
    };
  }
}

/** Compress an image client-side before uploading (max 800px, JPEG 0.8). */
export async function compressImage(
  file: File,
  maxDim = 800,
  quality = 0.8
): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height / width) * maxDim);
            width = maxDim;
          } else {
            width = Math.round((width / height) * maxDim);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas not supported')); return; }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
            } else {
              reject(new Error('Compression failed'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
