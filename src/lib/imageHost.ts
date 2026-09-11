// ============================================================================
// Image Host — uploads images/files to SUPABASE STORAGE (portfolio-assets
// bucket) and returns a permanent public URL. Files never expire and are
// secured by RLS (public read, authenticated write).
// ============================================================================

import { supabase, isSupabaseConfigured, SUPABASE_BUCKET } from './supabase';

export interface UploadResult {
  url: string;
  error: string | null;
}

function sanitizeName(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'file';
  const ext = (name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${base.slice(0, 32)}.${ext}`;
}

/** Upload a file to Supabase Storage and return its permanent public URL. */
export async function uploadImage(file: File, folder = 'images'): Promise<UploadResult> {
  if (!supabase || !isSupabaseConfigured) {
    return { url: '', error: 'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.' };
  }
  try {
    const path = `${folder}/${sanitizeName(file.name)}`;
    const { error: uploadErr } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type || 'application/octet-stream' });

    if (uploadErr) {
      return { url: '', error: uploadErr.message };
    }

    const { data } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(path);
    return { url: data.publicUrl, error: null };
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