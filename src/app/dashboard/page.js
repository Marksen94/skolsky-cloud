'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase, MAX_FILE_SIZE, formatFileSize, getFileIcon } from '@/lib/supabase';
import { useDropzone } from 'react-dropzone';
import { Upload, LogOut, Trash2, Download, Clock, User, CloudUpload, BookOpen, Search, AlertCircle, FolderOpen } from 'lucide-react';

export default function Dashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => { loadUser(); }, []);

  async function loadUser() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/'); return; }
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    if (!prof || prof.status !== 'approved') { await supabase.auth.signOut(); router.push('/'); return; }
    if (prof.is_admin) { router.push('/admin'); return; }
    setProfile(prof);
    await loadFiles(prof.class);
    setLoading(false);
  }

  async function loadFiles(className) {
    const { data } = await supabase.from('files')
      .select(`*, profiles(first_name, last_name)`)
      .eq('class', className).order('created_at', { ascending: false });
    setFiles(data || []);
  }

  const onDrop = useCallback(async (accepted, rejected) => {
    setUploadError(''); setUploadSuccess('');
    if (rejected.length > 0) {
      const err = rejected[0].errors[0];
      if (err.code === 'file-too-large') setUploadError('Súbor je príliš veľký. Max 30 MB.');
      else if (err.code === 'file-invalid-type') setUploadError('Nepovolený typ súboru.');
      else setUploadError('Chyba: ' + err.message);
      return;
    }
    if (accepted.length === 0) return;
    const file = accepted[0];
    setUploading(true);

    const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const path = `${profile.class}/${safeName}`;

    const { error: uploadErr } = await supabase.storage.from('class-files').upload(path, file, { cacheControl: '3600', upsert: false });
    if (uploadErr) { setUploadError('Chyba pri nahrávaní: ' + uploadErr.message); setUploading(false); return; }

    const { data: { publicUrl } } = supabase.storage.from('class-files').getPublicUrl(path);

    const { error: dbErr } = await supabase.from('files').insert({
      uploaded_by: profile.id, class: profile.class, file_name: path,
      original_name: file.name, file_url: publicUrl, file_type: file.type,
      file_size: file.size, description: description.trim() || null,
    });
    if (dbErr) { setUploadError('Chyba pri ukladaní: ' + dbErr.message); setUploading(false); return; }

    setUploadSuccess(`"${file.name}" bol úspešne nahratý!`);
    setDescription('');
    await loadFiles(profile.class);
    setUploading(false);
  }, [profile, description]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'], 'image/*': ['.jpg', '.jpeg', '.png', '.webp'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxSize: MAX_FILE_SIZE, multiple: false, disabled: uploading,
  });

  async function deleteFile(file) {
    if (!confirm(`Vymazať "${file.original_name}"?`)) return;
    if (file.uploaded_by !== profile.id) { alert('Môžeš vymazať len vlastné súbory.'); return; }
    await supabase.storage.from('class-files').remove([file.file_name]);
    await supabase.from('files').delete().eq('id', file.id);
    await loadFiles(profile.class);
  }

  const filteredFiles = files.filter(f =>
    f.original_name.toLowerCase().includes(search.toLowerCase()) ||
    (f.description || '').toLowerCase().includes(search.toLowerCase()) ||
    (`${f.profiles?.first_name} ${f.profiles?.last_name}`).toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/40 flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-3 border-school-blue border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{borderWidth: '3px'}} />
        <p className="text-school-muted text-sm">Načítavam...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      {/* Header */}
      <header className="school-header">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm p-1">
              <Image src="/logo.png" alt="Logo" width={32} height={32} className="object-contain" />
            </div>
            <div>
              <p className="text-white font-bold text-sm" style={{ fontFamily: 'Sora, sans-serif' }}>
                Spojená škola Kollárova 17, Sečovce
              </p>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <p className="text-blue-200 text-xs">Trieda {profile?.class}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-xl px-3 py-1.5">
              <User size={13} className="text-blue-200" />
              <span className="text-white text-sm font-medium">{profile?.first_name} {profile?.last_name}</span>
            </div>
            <button onClick={async () => { await supabase.auth.signOut(); router.push('/'); }}
              className="flex items-center gap-1.5 text-blue-200 hover:text-white transition-colors text-sm">
              <LogOut size={15} /> Odhlásiť
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="animate-slide-up">
          <h2 className="text-3xl font-bold text-school-navy" style={{ fontFamily: 'Sora, sans-serif' }}>
            Trieda {profile?.class}
          </h2>
          <p className="text-school-muted mt-1 text-sm">{files.length} materiálov zdieľaných vašou triedou</p>
        </div>

        {/* Upload */}
        <div className="card shadow-card animate-slide-up">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
              <CloudUpload size={16} className="text-school-blue" />
            </div>
            <h3 className="font-bold text-school-navy">Nahrať nový súbor</h3>
          </div>
          <p className="text-xs text-school-muted mb-4 ml-10">PDF, obrázky (JPG, PNG), PowerPoint, Word, Excel • max 30 MB</p>

          <input type="text" className="input-field text-sm mb-3"
            placeholder="Popis súboru (napr. Matematika – vzorce z Kap. 5) – voliteľné"
            value={description} onChange={e => setDescription(e.target.value)} disabled={uploading} />

          <div {...getRootProps()} className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200
            ${isDragActive ? 'border-school-blue bg-blue-50 scale-[1.01]' : 'border-gray-200 hover:border-school-blue hover:bg-blue-50/30'}
            ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <input {...getInputProps()} />
            {uploading ? (
              <div>
                <div className="w-10 h-10 border-4 border-school-blue border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-school-blue font-semibold">Nahrávam súbor...</p>
              </div>
            ) : isDragActive ? (
              <div>
                <Upload size={28} className="text-school-blue mx-auto mb-2" />
                <p className="text-school-blue font-semibold">Pusti súbor sem!</p>
              </div>
            ) : (
              <div>
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Upload size={22} className="text-school-blue" />
                </div>
                <p className="text-school-navy font-semibold">Pretiahni súbor sem</p>
                <p className="text-school-muted text-sm mt-1">alebo klikni pre výber zo zariadenia</p>
              </div>
            )}
          </div>

          {uploadError && (
            <div className="mt-3 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-xl text-sm">
              <AlertCircle size={15} /> {uploadError}
            </div>
          )}
          {uploadSuccess && (
            <div className="mt-3 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2.5 rounded-xl text-sm">
              ✅ {uploadSuccess}
            </div>
          )}
        </div>

        {/* Files */}
        <div className="card shadow-card animate-slide-up">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                <FolderOpen size={16} className="text-school-blue" />
              </div>
              <h3 className="font-bold text-school-navy">Súbory triedy</h3>
            </div>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-school-muted" />
              <input type="text" className="input-field pl-9 py-2 text-sm w-48"
                placeholder="Hľadaj..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          {filteredFiles.length === 0 ? (
            <div className="text-center py-14">
              <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <BookOpen size={24} className="text-gray-300" />
              </div>
              <p className="text-school-muted text-sm">
                {search ? 'Žiadne súbory nezodpovedajú hľadaniu.' : 'Trieda zatiaľ nemá žiadne súbory. Buď prvý!'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredFiles.map(file => (
                <FileCard key={file.id} file={file} isOwner={file.uploaded_by === profile?.id} onDelete={() => deleteFile(file)} />
              ))}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-school-muted/50">
          © 2026 RU-MONT s. r. o., Spojená škola Sečovce
        </p>
      </main>
    </div>
  );
}

function FileCard({ file, isOwner, onDelete }) {
  const date = new Date(file.created_at).toLocaleDateString('sk-SK', { day: '2-digit', month: 'short', year: 'numeric' });
  return (
    <div className="file-card group">
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className="text-2xl">{getFileIcon(file.file_type)}</span>
        {isOwner && (
          <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-red-400 hover:text-red-600 transition-all">
            <Trash2 size={14} />
          </button>
        )}
      </div>
      <p className="font-semibold text-school-navy text-sm leading-tight mb-1 line-clamp-2">{file.original_name}</p>
      {file.description && <p className="text-school-muted text-xs mb-2 line-clamp-2">{file.description}</p>}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
        <div className="text-xs text-school-muted">
          <p className="font-medium">{file.profiles?.first_name} {file.profiles?.last_name}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <Clock size={10} /> <span>{date}</span>
            {file.file_size && <span>· {formatFileSize(file.file_size)}</span>}
          </div>
        </div>
        <a href={file.file_url} target="_blank" rel="noopener noreferrer" download
          className="flex items-center gap-1 bg-school-blue/5 hover:bg-school-blue text-school-blue hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200">
          <Download size={12} /> Stiahnuť
        </a>
      </div>
    </div>
  );
}
