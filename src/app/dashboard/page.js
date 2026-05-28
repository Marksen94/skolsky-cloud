'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase, MAX_FILE_SIZE, formatFileSize, getFileIcon } from '@/lib/supabase';
import { useDropzone } from 'react-dropzone';
import { Upload, LogOut, Trash2, Download, Clock, User, CloudUpload, BookOpen, Search, AlertCircle, FolderOpen, X, Eye, EyeOff, CheckCircle, Settings, Lock, Folder, ChevronRight, FolderPlus } from 'lucide-react';

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

  // Profil modal
  const [showProfile, setShowProfile] = useState(false);
  const [editPw, setEditPw] = useState('');
  const [editPwConfirm, setEditPwConfirm] = useState('');
  const [showEditPw, setShowEditPw] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  // Priečinky
  const [folders, setFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [folderPath, setFolderPath] = useState([]);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [folderSaving, setFolderSaving] = useState(false);
  const [folderError, setFolderError] = useState('');

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
    const { data: filesData } = await supabase.from('files')
      .select(`*, profiles(first_name, last_name)`)
      .eq('class', className).order('created_at', { ascending: false });
    setFiles(filesData || []);

    const { data: foldersData } = await supabase.from('folders')
      .select('*')
      .eq('class', className).order('name', { ascending: true });
    setFolders(foldersData || []);
  }

  function navigateToFolder(folder) {
    if (!folder) {
      setCurrentFolder(null);
      setFolderPath([]);
    } else {
      const path = [];
      let temp = folder;
      while (temp) {
        path.unshift(temp);
        const parentId = temp.parent_id;
        temp = parentId ? folders.find(f => f.id === parentId) : null;
      }
      setCurrentFolder(folder);
      setFolderPath(path);
    }
  }

  function getFolderDepth(folder) {
    let depth = 0;
    let temp = folder;
    while (temp) {
      depth++;
      const parentId = temp.parent_id;
      temp = parentId ? folders.find(f => f.id === parentId) : null;
    }
    return depth;
  }

  async function createFolder(e) {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    if (folderPath.length >= 3) {
      setFolderError('Dosiahli ste maximálnu úroveň vnorenia priečinkov.');
      return;
    }
    setFolderSaving(true);
    setFolderError('');

    const { error } = await supabase.from('folders').insert({
      name: newFolderName.trim(),
      class: profile.class,
      parent_id: currentFolder ? currentFolder.id : null,
      created_by: profile.id
    });

    if (error) {
      setFolderError('Nepodarilo sa vytvoriť priečinok: ' + error.message);
      setFolderSaving(false);
      return;
    }

    setNewFolderName('');
    setShowCreateFolder(false);
    await loadFiles(profile.class);
    setFolderSaving(false);
  }

  async function deleteFolder(folder) {
    if (!confirm(`Naozaj chcete vymazať priečinok "${folder.name}" a všetok jeho obsah?`)) return;
    if (folder.created_by !== profile.id && !profile.is_admin) {
      alert('Môžete vymazať iba vlastné priečinky.');
      return;
    }

    setLoading(true);

    try {
      // 1. Načítaj VŠETKY priečinky triedy čerstvo z DB (nie zo state)
      const { data: allFolders } = await supabase
        .from('folders')
        .select('id, parent_id')
        .eq('class', profile.class);

      // 2. Rekurzívne zozbieraj ID všetkých potomkov vrátane samotného priečinka
      const getDescendantIds = (folderId, list) => {
        let ids = [folderId];
        for (const f of list.filter(f => f.parent_id === folderId)) {
          ids = [...ids, ...getDescendantIds(f.id, list)];
        }
        return ids;
      };
      const folderIdsToDelete = getDescendantIds(folder.id, allFolders || []);

      // 3. Načítaj všetky súbory v tých priečinkoch čerstvo z DB
      const { data: filesToDelete } = await supabase
        .from('files')
        .select('file_name')
        .in('folder_id', folderIdsToDelete);

      // 4. Vymaž súbory zo storage v dávkach po 100 (limit Supabase)
      if (filesToDelete?.length > 0) {
        const fileNames = filesToDelete.map(f => f.file_name);
        for (let i = 0; i < fileNames.length; i += 100) {
          const { error: storageErr } = await supabase.storage
            .from('class-files')
            .remove(fileNames.slice(i, i + 100));
          if (storageErr) console.error('Chyba storage batch:', storageErr);
        }
        // Vymaž záznamy súborov z DB
        await supabase.from('files').delete().in('folder_id', folderIdsToDelete);
      }

      // 5. Vymaž koreňový priečinok — CASCADE automaticky vymaže podpriečinky z DB
      const { error: dbErr } = await supabase.from('folders').delete().eq('id', folder.id);
      if (dbErr) {
        alert('Nepodarilo sa vymazať priečinok z databázy: ' + dbErr.message);
      } else {
        // Ak sme boli vnorení v mazanom priečinku, naviguj nahor
        if (currentFolder && folderIdsToDelete.includes(currentFolder.id)) {
          const parentFolder = folder.parent_id
            ? (allFolders || []).find(f => f.id === folder.parent_id)
            : null;
          navigateToFolder(parentFolder || null);
        }
      }

      await loadFiles(profile.class);
    } catch (err) {
      alert('Vyskytla sa chyba: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile(e) {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    if (!editPw) { setProfileError('Zadajte nové heslo.'); return; }
    if (editPw.length < 6) { setProfileError('Nové heslo musí mať aspoň 6 znakov.'); return; }
    if (editPw !== editPwConfirm) { setProfileError('Heslá sa nezhodujú.'); return; }

    setProfileSaving(true);
    const { error: pwErr } = await supabase.auth.updateUser({ password: editPw });
    if (pwErr) { setProfileError('Heslo sa nepodarilo zmeniť: ' + pwErr.message); setProfileSaving(false); return; }

    setEditPw('');
    setEditPwConfirm('');
    setProfileSuccess('Heslo bolo úspešne zmenené!');
    setProfileSaving(false);
  }

  function openProfile() {
    setEditPw('');
    setEditPwConfirm('');
    setProfileError('');
    setProfileSuccess('');
    setShowProfile(true);
  }

  const onDrop = useCallback(async (accepted, rejected) => {
    setUploadError(''); setUploadSuccess('');
    if (rejected.length > 0) {
      const err = rejected[0].errors[0];
      if (err.code === 'file-too-large') setUploadError('Súbor je príliš veľký. Max 50 MB.');
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

    const { data: inserted, error: dbErr } = await supabase.from('files').insert({
      uploaded_by: profile.id, class: profile.class, file_name: path,
      original_name: file.name, file_url: publicUrl, file_type: file.type,
      file_size: file.size, description: description.trim() || null,
      folder_id: currentFolder ? currentFolder.id : null,
    }).select(`*, profiles(first_name, last_name)`).single();
    if (dbErr) { setUploadError('Chyba pri ukladaní: ' + dbErr.message); setUploading(false); return; }

    // Optimistický update — pridaj nový súbor priamo do state bez reloadu
    if (inserted) {
      setFiles(prev => [inserted, ...prev]);
    }

    setUploadSuccess(`"${file.name}" bol úspešne nahratý!`);
    setDescription('');
    setUploading(false);
  }, [profile, description, currentFolder]);

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

  const currentFolderId = currentFolder ? currentFolder.id : null;
  const visibleFolders = folders.filter(f => (f.parent_id || null) === currentFolderId);
  const filteredFiles = files.filter(f => {
    const inFolder = (f.folder_id || null) === currentFolderId;
    if (!inFolder) return false;
    return (
      f.original_name.toLowerCase().includes(search.toLowerCase()) ||
      (f.description || '').toLowerCase().includes(search.toLowerCase()) ||
      (`${f.profiles?.first_name} ${f.profiles?.last_name}`).toLowerCase().includes(search.toLowerCase())
    );
  });

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

      {/* Profil Modal */}
      {showProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 relative animate-slide-up">
            <button onClick={() => setShowProfile(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-xl hover:bg-gray-100 flex items-center justify-center text-school-muted transition-colors">
              <X size={16} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                <User size={22} className="text-school-blue" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-school-navy" style={{ fontFamily: 'Sora, sans-serif' }}>Môj profil</h2>
                <p className="text-school-muted text-xs">Trieda {profile?.class}</p>
              </div>
            </div>

            <form onSubmit={saveProfile} className="space-y-4">
              {/* Meno a priezvisko – zobrazené ale nedá sa meniť */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-school-muted mb-1.5 flex items-center gap-1">
                    Meno <Lock size={10} />
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed outline-none"
                    value={profile?.first_name || ''}
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-school-muted mb-1.5 flex items-center gap-1">
                    Priezvisko <Lock size={10} />
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed outline-none"
                    value={profile?.last_name || ''}
                    disabled
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400 -mt-1">Meno môže zmeniť iba správca školy.</p>

              {/* Zmena hesla */}
              <div className="border-t border-gray-100 pt-3 space-y-3">
                <p className="text-xs font-semibold text-school-muted uppercase tracking-wide">Zmena hesla</p>
                <div>
                  <label className="block text-sm font-semibold text-school-navy mb-1.5">Nové heslo</label>
                  <div className="relative">
                    <input
                      type={showEditPw ? 'text' : 'password'}
                      className="input-field pr-10"
                      placeholder="min. 6 znakov"
                      value={editPw}
                      onChange={e => setEditPw(e.target.value)}
                      required
                    />
                    <button type="button" onClick={() => setShowEditPw(!showEditPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-school-muted hover:text-school-navy">
                      {showEditPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-school-navy mb-1.5">Zopakujte nové heslo</label>
                  <input
                    type={showEditPw ? 'text' : 'password'}
                    className="input-field"
                    placeholder="zopakujte heslo"
                    value={editPwConfirm}
                    onChange={e => setEditPwConfirm(e.target.value)}
                    required
                  />
                </div>
              </div>

              {profileError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-xl text-sm flex items-center gap-2">
                  <AlertCircle size={14} /> {profileError}
                </div>
              )}
              {profileSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-2.5 rounded-xl text-sm flex items-center gap-2">
                  <CheckCircle size={14} /> {profileSuccess}
                </div>
              )}

              <button type="submit" disabled={profileSaving}
                className="btn-primary w-full flex items-center justify-center gap-2">
                {profileSaving ? 'Ukladám...' : 'Zmeniť heslo'}
              </button>
            </form>
          </div>
        </div>
      )}

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
          <div className="flex items-center gap-3">
            <button onClick={openProfile}
              className="hidden sm:flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl px-3 py-1.5 transition-colors">
              <User size={13} className="text-blue-200" />
              <span className="text-white text-sm font-medium">{profile?.first_name} {profile?.last_name}</span>
              <Settings size={12} className="text-blue-300" />
            </button>
            <button onClick={openProfile}
              className="sm:hidden w-8 h-8 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-colors">
              <User size={15} className="text-blue-200" />
            </button>
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

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up">
          <StatCard
            icon={<BookOpen size={20} className="text-blue-500" />}
            title="Súbory"
            value={files.length}
            subtitle="celkem nahráno"
            color="blue"
          />
          <StatCard
            icon={<Folder size={20} className="text-amber-500" />}
            title="Priečinky"
            value={folders.filter(f => !f.parent_id).length}
            subtitle="hlavní priečinkov"
            color="amber"
          />
          <StatCard
            icon={<CloudUpload size={20} className="text-green-500" />}
            title="Dátum"
            value={files.length > 0 ? new Date(files[0].created_at).toLocaleDateString('sk-SK', { day: '2-digit', month: 'short' }) : '--'}
            subtitle="poslastný upload"
            color="green"
          />
          <StatCard
            icon={<Clock size={20} className="text-purple-500" />}
            title="Veľkosť"
            value={files.length > 0 ? formatFileSize(files.reduce((sum, f) => sum + (f.file_size || 0), 0)) : '0 B'}
            subtitle="všetky súbory"
            color="purple"
          />
        </div>

        {/* Upload */}
        <div className="card shadow-card hover:shadow-lg transition-shadow animate-slide-up">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl flex items-center justify-center">
              <CloudUpload size={18} className="text-school-blue" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-school-navy">Nahrať nový súbor</h3>
              <p className="text-xs text-school-muted">PDF, obrázky (JPG, PNG, WebP), PowerPoint, Word, Excel • max 50 MB</p>
            </div>
          </div>

          <input type="text" className="input-field text-sm mb-4"
            placeholder="Popis súboru (napr. Matematika – vzorce z Kap. 5) – voliteľné"
            value={description} onChange={e => setDescription(e.target.value)} disabled={uploading} />

          <div {...getRootProps()} className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300
            ${isDragActive ? 'border-school-blue bg-blue-50 scale-[1.02]' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/40'}
            ${uploading ? 'opacity-60 cursor-not-allowed' : ''}`}>
            <input {...getInputProps()} />
            {uploading ? (
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 border-4 border-school-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-school-blue font-semibold text-base">Nahrávam súbor...</p>
              </div>
            ) : isDragActive ? (
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 bg-school-blue/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Upload size={28} className="text-school-blue" />
                </div>
                <p className="text-school-blue font-semibold text-base">Pusti súbor sem!</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Upload size={28} className="text-school-blue" />
                </div>
                <p className="text-school-navy font-semibold text-base">Pretiahni súbor sem</p>
                <p className="text-school-muted text-sm mt-2">alebo klikni pre výber zo zariadenia</p>
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

        {/* Files & Folders */}
        <div className="card shadow-card animate-slide-up">
          {/* Header row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                <FolderOpen size={16} className="text-school-blue" />
              </div>
              <h3 className="font-bold text-school-navy">Priečinky a súbory triedy</h3>
            </div>
            <div className="flex items-center gap-2">
              {folderPath.length < 3 && (
                <button
                  onClick={() => { setShowCreateFolder(true); setFolderError(''); setNewFolderName(''); }}
                  className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-school-blue px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors">
                  <FolderPlus size={13} /> Nový priečinok
                </button>
              )}
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-school-muted" />
                <input type="text" className="input-field pl-9 py-2 text-sm w-40"
                  placeholder="Hľadaj..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Breadcrumbs */}
          <div className="flex items-center gap-1 flex-wrap mb-4 text-sm">
            <button
              onClick={() => navigateToFolder(null)}
              className={`px-2 py-1 rounded-lg transition-colors ${
                !currentFolder ? 'bg-school-navy text-white font-semibold' : 'text-school-muted hover:text-school-navy hover:bg-gray-100'
              }`}>
              Trieda {profile?.class}
            </button>
            {folderPath.map((f, i) => (
              <span key={f.id} className="flex items-center gap-1">
                <ChevronRight size={13} className="text-gray-300" />
                <button
                  onClick={() => navigateToFolder(f)}
                  className={`px-2 py-1 rounded-lg transition-colors ${
                    i === folderPath.length - 1 ? 'bg-school-navy text-white font-semibold' : 'text-school-muted hover:text-school-navy hover:bg-gray-100'
                  }`}>
                  {f.name}
                </button>
              </span>
            ))}
          </div>

          {/* Create Folder inline form */}
          {showCreateFolder && (
            <form onSubmit={createFolder} className="flex items-center gap-2 mb-4 p-3 bg-blue-50/60 rounded-2xl border border-blue-100">
              <Folder size={16} className="text-school-blue flex-shrink-0" />
              <input
                type="text"
                className="input-field py-1.5 text-sm flex-1"
                placeholder="Názov priečinka..."
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                autoFocus
                maxLength={60}
              />
              <button type="submit" disabled={folderSaving}
                className="btn-primary py-1.5 px-3 text-sm">
                {folderSaving ? '...' : 'Vytvoriť'}
              </button>
              <button type="button" onClick={() => setShowCreateFolder(false)}
                className="w-7 h-7 rounded-lg hover:bg-gray-200 flex items-center justify-center text-school-muted transition-colors">
                <X size={14} />
              </button>
            </form>
          )}
          {folderError && (
            <div className="mb-3 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-xl text-sm">
              <AlertCircle size={13} /> {folderError}
            </div>
          )}

          {/* Folders grid */}
          {visibleFolders.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-5">
              {visibleFolders.map(folder => {
                const childCount = folders.filter(f => f.parent_id === folder.id).length;
                const fileCount = files.filter(f => f.folder_id === folder.id).length;
                return (
                  <FolderCard
                    key={folder.id}
                    folder={folder}
                    childCount={childCount}
                    fileCount={fileCount}
                    isOwner={folder.created_by === profile?.id}
                    onOpen={() => navigateToFolder(folder)}
                    onDelete={() => deleteFolder(folder)}
                  />
                );
              })}
            </div>
          )}

          {/* Separator when both folders and files exist */}
          {visibleFolders.length > 0 && filteredFiles.length > 0 && (
            <div className="border-t border-gray-100 mb-5" />
          )}

          {/* Files grid */}
          {filteredFiles.length === 0 && visibleFolders.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <BookOpen size={24} className="text-gray-300" />
              </div>
              <p className="text-school-muted text-sm">
                {search ? 'Žiadne súbory nezodpovedajú hľadaniu.' : currentFolder ? 'Tento priečinok je prázdny.' : 'Trieda zatiaľ nemá žiadne materiály.'}
              </p>
            </div>
          ) : filteredFiles.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredFiles.map(file => (
                <FileCard key={file.id} file={file} isOwner={file.uploaded_by === profile?.id} onDelete={() => deleteFile(file)} />
              ))}
            </div>
          ) : null}
        </div>

        <p className="text-center text-xs text-school-muted/50">
          © 2026 RU-MONT s. r. o., Spojená škola Sečovce
        </p>
      </main>
    </div>
  );
}

function StatCard({ icon, title, value, subtitle, color }) {
  const colorMap = {
    blue: 'from-blue-50 to-blue-100 border-blue-100 text-school-blue',
    amber: 'from-amber-50 to-orange-100 border-amber-100 text-amber-600',
    green: 'from-emerald-50 to-green-100 border-emerald-100 text-emerald-600',
    purple: 'from-violet-50 to-purple-100 border-violet-100 text-violet-600',
  };

  return (
    <article className={`rounded-3xl border bg-gradient-to-br ${colorMap[color] || colorMap.blue} p-4 shadow-card hover:shadow-card-hover transition-all duration-200`}>
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-2xl bg-white/80 flex items-center justify-center shadow-sm">{icon}</div>
        <span className="text-[11px] uppercase tracking-[0.18em] text-school-muted">{title}</span>
      </div>
      <p className="text-2xl font-bold text-school-navy">{value}</p>
      <p className="text-xs text-school-muted mt-1">{subtitle}</p>
    </article>
  );
}

function FolderCard({ folder, childCount, fileCount, isOwner, onOpen, onDelete }) {
  return (
    <div className="group relative">
      <button
        onClick={onOpen}
        className="w-full text-left p-4 rounded-2xl border border-gray-100 bg-gradient-to-br from-amber-50/60 to-orange-50/30 hover:from-amber-100/80 hover:to-orange-100/50 hover:border-amber-200 transition-all duration-200 hover:shadow-sm">
        <div className="flex items-start justify-between mb-2">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
            <Folder size={20} className="text-amber-600" />
          </div>
          {isOwner && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onDelete(); }}
              className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg hover:bg-red-50 flex items-center justify-center text-red-400 hover:text-red-600 transition-all">
              <Trash2 size={12} />
            </button>
          )}
        </div>
        <p className="font-semibold text-school-navy text-sm leading-tight line-clamp-2 mb-1">{folder.name}</p>
        <p className="text-xs text-school-muted">
          {childCount > 0 && `${childCount} podpriec. `}{fileCount > 0 && `${fileCount} súb.`}
          {childCount === 0 && fileCount === 0 && 'Prázdny'}
        </p>
      </button>
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
