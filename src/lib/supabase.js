import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    detectSessionInUrl: true,   // automaticky spracuje tokeny z URL hash/query
    persistSession: true,        // uloží session do localStorage
    autoRefreshToken: true,      // automaticky obnoví token pred vypršaním
  },
});

// Zoznam tried
export const CLASSES = [
  '1.A', '1.C', '1.T', '1.G', '1.H',
  '2.A', '2.C', '2.T', '2.G',
  '3.A', '3.C', '3.T', '3.G',
  '4.A', '4.C', '4.T', '4.G',
];

// Povolené typy súborov
export const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function getFileIcon(type) {
  if (!type) return '📄';
  if (type.includes('pdf')) return '📕';
  if (type.includes('image')) return '🖼️';
  if (type.includes('presentation') || type.includes('powerpoint')) return '📊';
  if (type.includes('word')) return '📝';
  if (type.includes('excel') || type.includes('spreadsheet')) return '📈';
  return '📄';
}

// Vygeneruje dočasný podpisaný URL pre súbor (private bucket)
// expiresIn = sekundy, default 5 minút
export async function getSignedUrl(filePath, expiresIn = 300) {
  const { data, error } = await supabase.storage
    .from('class-files')
    .createSignedUrl(filePath, expiresIn);
  if (error) { console.error('getSignedUrl error:', error.message); return null; }
  return data.signedUrl;
}
