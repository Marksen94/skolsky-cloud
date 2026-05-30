'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase, MAX_FILE_SIZE, formatFileSize, getFileIcon } from '@/lib/supabase';
import { useDropzone } from 'react-dropzone';
import { Upload, LogOut, Trash2, Download, Clock, User, CloudUpload, BookOpen, Search, AlertCircle, FolderOpen, X, Eye, EyeOff, CheckCircle, Lock, Folder, ChevronRight, FolderPlus, KeyRound, UserX, ChevronDown } from 'lucide-react';
import ThemeToggle from '@/app/components/ThemeToggle';

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

  const userMenuRef = useRef(null);
  const userMenuBtnRef = useRef(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showDeleteRequest, setShowDeleteRequest] = useState(false);
  const [deleteRequestSent, setDeleteRequestSent] = useState(false);
  const [editPw, setEditPw] = useState('');
  const [editPwConfirm, setEditPwConfirm] = useState('');
  const [currentPw, setCurrentPw] = useState('');
  const [showEditPw, setShowEditPw] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  const [folders, setFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [folderPath, setFolderPath] = useState([]);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [folderSaving, setFolderSaving] = useState(false);
  const [folderError, setFolderError] = useState('');

  // Fix 5 — vlastný confirm modal namiesto natívneho confirm()/alert()
  const [confirmModal, setConfirmModal] = useState(null);
  function askConfirm({ title, message, danger = true, onConfirm }) {
    setConfirmModal({ title, message, danger, onConfirm });
  }

  // Fix 7 — globálne hľadanie: keď je search aktívny, ignorujeme currentFolder
  const globalSearch = search.trim().length > 0;
  const filteredFiles = globalSearch
    ? files.filter(f =>
        f.original_name.toLowerCase().includes(search.toLowerCase()) ||
        (f.description || '').toLowerCase().includes(search.toLowerCase()) ||
        (`${f.profiles?.first_name} ${f.profiles?.last_name}`).toLowerCase().includes(search.toLowerCase())
      )
    : files.filter(f => {
        const inFolder = (f.folder_id || null) === (currentFolder ? currentFolder.id : null);
        return inFolder;
      });

  // Zatvori dropdown pri kliknutí mimo
  useEffect(() => {
    if (!showUserMenu) return;
    function handleClick(e) {
      if (
        userMenuRef.current && !userMenuRef.current.contains(e.target) &&
        userMenuBtnRef.current && !userMenuBtnRef.current.contains(e.target)
      ) setShowUserMenu(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showUserMenu]);

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
      .select('*').eq('class', className).order('name', { ascending: true });
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

  async function createFolder(e) {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    if (folderPath.length >= 3) { setFolderError('Dosiahli ste maximálnu úroveň vnorenia priečinkov.'); return; }
    setFolderSaving(true); setFolderError('');
    const { error } = await supabase.from('folders').insert({
      name: newFolderName.trim(), class: profile.class,
      parent_id: currentFolder ? currentFolder.id : null, created_by: profile.id,
    });
    if (error) { setFolderError('Nepodarilo sa vytvoriť priečinok: ' + error.message); setFolderSaving(false); return; }
    setNewFolderName(''); setShowCreateFolder(false);
    await loadFiles(profile.class);
    setFolderSaving(false);
  }

  // Fix 5 — deleteFolder bez confirm()
  async function deleteFolder(folder) {
    askConfirm({
      title: `Vymazať priečinok?`,
      message: `Priečinok „${folder.name}" a všetok jeho obsah bude natrvalo vymazaný.`,
      onConfirm: async () => {
        if (folder.created_by !== profile.id && !profile.is_admin) {
          askConfirm({ title: 'Chyba', message: 'Môžeš vymazať iba vlastné priečinky.', danger: false, onConfirm: () => {} });
          return;
        }
        setLoading(true);
        try {
          const { data: allFolders } = await supabase.from('folders').select('id, parent_id').eq('class', profile.class);
          const getDescendantIds = (folderId, list) => {
            let ids = [folderId];
            for (const f of list.filter(f => f.parent_id === folderId)) ids = [...ids, ...getDescendantIds(f.id, list)];
            return ids;
          };
          const folderIdsToDelete = getDescendantIds(folder.id, allFolders || []);
          const { data: filesToDelete } = await supabase.from('files').select('file_name').in('folder_id', folderIdsToDelete);
          if (filesToDelete?.length > 0) {
            const fileNames = filesToDelete.map(f => f.file_name);
            for (let i = 0; i < fileNames.length; i += 100)
              await supabase.storage.from('class-files').remove(fileNames.slice(i, i + 100));
            await supabase.from('files').delete().in('folder_id', folderIdsToDelete);
          }
          const { error: dbErr } = await supabase.from('folders').delete().eq('id', folder.id);
          if (!dbErr && currentFolder && folderIdsToDelete.includes(currentFolder.id)) {
            const parentFolder = folder.parent_id ? (allFolders || []).find(f => f.id === folder.parent_id) : null;
            navigateToFolder(parentFolder || null);
          }
          await loadFiles(profile.class);
        } catch (err) {
          askConfirm({ title: 'Chyba', message: err.message, danger: false, onConfirm: () => {} });
        } finally { setLoading(false); }
      },
    });
  }

  async function saveProfile(e) {
    e.preventDefault();
    setProfileError(''); setProfileSuccess('');
    if (!currentPw) { setProfileError('Zadajte aktuálne heslo.'); return; }
    if (!editPw) { setProfileError('Zadajte nové heslo.'); return; }
    if (editPw.length < 6) { setProfileError('Nové heslo musí mať aspoň 6 znakov.'); return; }
    if (editPw !== editPwConfirm) { setProfileError('Heslá sa nezhodujú.'); return; }
    setProfileSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email: session.user.email, password: currentPw });
    if (signInErr) { setProfileError('Aktuálne heslo je nesprávne.'); setProfileSaving(false); return; }
    const { error: pwErr } = await supabase.auth.updateUser({ password: editPw });
    if (pwErr) { setProfileError('Heslo sa nepodarilo zmeniť: ' + pwErr.message); setProfileSaving(false); return; }
    setCurrentPw(''); setEditPw(''); setEditPwConfirm('');
    setProfileSuccess('Heslo bolo úspešne zmenené!');
    setProfileSaving(false);
  }

  async function requestDeletion() {
    await supabase.from('profiles').update({ deletion_requested: true }).eq('id', profile.id);
    setDeleteRequestSent(true);
  }

  function openProfile() {
    setShowUserMenu(false); setEditPw(''); setEditPwConfirm(''); setCurrentPw('');
    setProfileError(''); setProfileSuccess(''); setShowProfile(true);
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
    if (inserted) setFiles(prev => [inserted, ...prev]);
    setUploadSuccess(`„${file.name}" bol úspešne nahratý!`);
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

  // Fix 5 — deleteFile bez confirm()
  function deleteFile(file) {
    if (file.uploaded_by !== profile.id) {
      askConfirm({ title: 'Chyba', message: 'Môžeš vymazať len vlastné súbory.', danger: false, onConfirm: () => {} });
      return;
    }
    askConfirm({
      title: 'Vymazať súbor?',
      message: `„${file.original_name}" bude natrvalo vymazaný.`,
      onConfirm: async () => {
        await supabase.storage.from('class-files').remove([file.file_name]);
        await supabase.from('files').delete().eq('id', file.id);
        setFiles(prev => prev.filter(f => f.id !== file.id));
      },
    });
  }

  const currentFolderId = currentFolder ? currentFolder.id : null;
  const visibleFolders = globalSearch ? [] : folders.filter(f => (f.parent_id || null) === currentFolderId);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="text-center">
        <div className="w-10 h-10 border-t-transparent rounded-full animate-spin mx-auto mb-3"
          style={{ borderWidth: '3px', borderStyle: 'solid', borderColor: 'var(--accent-link)', borderTopColor: 'transparent' }} />
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Načítavam...</p>
      </div>
    </div>
  );

  return (
    <div style={{ background: 'var(--bg)' }}>

      {/* Fix 5 — Vlastný confirm modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in"
          style={{ background: 'var(--overlay)' }}>
          <div className="rounded-3xl shadow-2xl w-full max-w-sm p-6 animate-slide-up"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h3 className="font-bold text-lg mb-2" style={{ color: 'var(--text)' }}>{confirmModal.title}</h3>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>{confirmModal.message}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmModal(null)}
                className="flex-1 py-2.5 rounded-xl font-semibold text-sm"
                style={{ background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)' }}>
                Zrušiť
              </button>
              {confirmModal.onConfirm && (
                <button onClick={() => { const fn = confirmModal.onConfirm; setConfirmModal(null); fn(); }}
                  className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-white"
                  style={{ background: confirmModal.danger ? 'linear-gradient(135deg,#dc2626,#ef4444)' : 'var(--accent-link)' }}>
                  Potvrdiť
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dropdown menu */}
      {showUserMenu && (
        <div ref={userMenuRef} className="fixed z-50 rounded-2xl shadow-2xl py-1.5 min-w-[200px] animate-fade-in"
          style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            top: (userMenuBtnRef.current?.getBoundingClientRect().bottom ?? 64) + 8,
            right: window.innerWidth - (userMenuBtnRef.current?.getBoundingClientRect().right ?? (window.innerWidth - 16)),
          }}>
          <button onClick={() => { setShowUserMenu(false); openProfile(); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors text-left"
            style={{ color: 'var(--text)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <KeyRound size={15} style={{ color: 'var(--accent-link)' }} /> Zmena hesla
          </button>
          <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />
          <button onClick={() => { setShowUserMenu(false); setShowDeleteRequest(true); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors text-left"
            style={{ color: '#ef4444' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(200,32,10,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <UserX size={15} /> Zrušenie účtu
          </button>
        </div>
      )}

      {/* Modal — Zrušenie účtu */}
      {showDeleteRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" style={{ background: 'var(--overlay)' }}>
          <div className="rounded-3xl shadow-2xl w-full max-w-sm p-6 relative animate-slide-up" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <button onClick={() => { setShowDeleteRequest(false); setDeleteRequestSent(false); }}
              className="absolute top-4 right-4 w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--surface-2)' }}>
              <X size={16} style={{ color: 'var(--text-muted)' }} />
            </button>
            {deleteRequestSent ? (
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(5,150,105,0.12)' }}>
                  <CheckCircle size={28} style={{ color: '#10b981' }} />
                </div>
                <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text)' }}>Žiadosť odoslaná</h2>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Správca školy dostane tvoju žiadosť o zrušenie účtu a rozhodne o nej čo najskôr.</p>
                <button onClick={() => { setShowDeleteRequest(false); setDeleteRequestSent(false); }} className="btn-primary w-full mt-5">Zatvoriť</button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(200,32,10,0.1)' }}>
                    <UserX size={22} style={{ color: '#ef4444' }} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>Zrušenie účtu</h2>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Táto akcia vyžaduje schválenie správcu</p>
                  </div>
                </div>
                <div className="rounded-xl p-4 mb-5 text-sm" style={{ background: 'rgba(200,32,10,0.07)', border: '1px solid rgba(200,32,10,0.2)', color: 'var(--text)' }}>
                  Po schválení správcom bude tvoj účet a všetky nahrané súbory <strong>natrvalo vymazané</strong>. Táto akcia je nevratná.
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowDeleteRequest(false)}
                    className="flex-1 py-2.5 rounded-xl font-semibold text-sm"
                    style={{ background: 'var(--surface-2)', color: 'var(--text)' }}>Zrušiť</button>
                  <button onClick={requestDeletion}
                    className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-white"
                    style={{ background: 'linear-gradient(135deg, #dc2626, #ef4444)' }}>
                    Požiadať o zrušenie
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Profil Modal */}
      {showProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" style={{ background: 'var(--overlay)' }}>
          <div className="rounded-3xl shadow-2xl w-full max-w-md p-6 relative animate-slide-up" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <button onClick={() => setShowProfile(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--surface-2)' }}>
              <X size={16} style={{ color: 'var(--text-muted)' }} />
            </button>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'var(--surface-2)' }}>
                <User size={22} style={{ color: 'var(--text)' }} />
              </div>
              <div>
                <h2 className="text-xl font-bold" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>Môj profil</h2>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Trieda {profile?.class}</p>
              </div>
            </div>
            <form onSubmit={saveProfile} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1.5 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>Meno <Lock size={10} /></label>
                  <input type="text" className="input-field" value={profile?.first_name || ''} disabled />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>Priezvisko <Lock size={10} /></label>
                  <input type="text" className="input-field" value={profile?.last_name || ''} disabled />
                </div>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Meno môže zmeniť iba správca školy.</p>
              <div className="border-t" style={{ borderColor: 'var(--border)' }}>
                <div className="pt-3 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Zmena hesla</p>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text)' }}>Aktuálne heslo</label>
                    <div className="relative">
                      <input type={showEditPw ? 'text' : 'password'} className="input-field pr-10"
                        placeholder="vaše aktuálne heslo" value={currentPw} onChange={e => setCurrentPw(e.target.value)} required />
                      <button type="button" onClick={() => setShowEditPw(!showEditPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                        {showEditPw ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text)' }}>Nové heslo</label>
                    <input type={showEditPw ? 'text' : 'password'} className="input-field"
                      placeholder="min. 6 znakov" value={editPw} onChange={e => setEditPw(e.target.value)} required />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text)' }}>Zopakujte nové heslo</label>
                    <input type={showEditPw ? 'text' : 'password'} className="input-field"
                      placeholder="zopakujte heslo" value={editPwConfirm} onChange={e => setEditPwConfirm(e.target.value)} required />
                  </div>
                </div>
              </div>
              {profileError && (
                <div className="px-3 py-2.5 rounded-xl text-sm flex items-center gap-2" style={{ background: 'rgba(200,32,10,0.1)', color: '#ef4444', border: '1px solid rgba(200,32,10,0.25)' }}>
                  <AlertCircle size={14} /> {profileError}
                </div>
              )}
              {profileSuccess && (
                <div className="px-3 py-2.5 rounded-xl text-sm flex items-center gap-2" style={{ background: 'rgba(5,150,105,0.1)', color: '#10b981', border: '1px solid rgba(5,150,105,0.25)' }}>
                  <CheckCircle size={14} /> {profileSuccess}
                </div>
              )}
              <button type="submit" disabled={profileSaving} className="btn-primary w-full flex items-center justify-center gap-2">
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
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm p-1"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
              <Image src="/logo.png" alt="Logo" width={32} height={32} className="object-contain" />
            </div>
            <div>
              <p className="text-white font-bold text-sm" style={{ fontFamily: 'Sora, sans-serif' }}>
                Spojená škola Kollárova 17, Sečovce
              </p>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <p className="text-blue-200 text-xs">Trieda {profile?.class}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button ref={userMenuBtnRef} onClick={() => setShowUserMenu(v => !v)}
              className="hidden sm:flex items-center gap-2 rounded-xl px-3 py-1.5 transition-colors"
              style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(4px)' }}>
              <User size={13} className="text-blue-200" />
              <span className="text-white text-sm font-medium">{profile?.first_name} {profile?.last_name}</span>
              <ChevronDown size={12} className="text-blue-300" />
            </button>
            <button ref={userMenuBtnRef} onClick={() => setShowUserMenu(v => !v)}
              className="sm:hidden w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.1)' }}>
              <User size={15} className="text-blue-200" />
            </button>
            <ThemeToggle />
            <button onClick={async () => { await supabase.auth.signOut(); router.push('/'); }}
              className="flex items-center gap-1.5 text-blue-200 hover:text-white transition-colors text-sm">
              <LogOut size={15} /> Odhlásiť
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="animate-slide-up">
          <h2 className="text-3xl font-bold" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>
            Trieda {profile?.class}
          </h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>{files.length} materiálov zdieľaných vašou triedou</p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up">
          <StatCard icon={<BookOpen size={20} style={{ color: '#3b82f6' }} />} title="Súbory" value={files.length} subtitle="celkom nahraných" color="blue" />
          <StatCard icon={<Folder size={20} style={{ color: '#f59e0b' }} />} title="Priečinky" value={folders.filter(f => !f.parent_id).length} subtitle="hlavných priečinkov" color="amber" />
          <StatCard icon={<CloudUpload size={20} style={{ color: '#10b981' }} />} title="Posledný upload" value={files.length > 0 ? new Date(files[0].created_at).toLocaleDateString('sk-SK', { day: '2-digit', month: 'short' }) : '--'} subtitle="dátum posledného" color="green" />
          <StatCard icon={<Clock size={20} style={{ color: '#a855f7' }} />} title="Veľkosť" value={files.length > 0 ? formatFileSize(files.reduce((sum, f) => sum + (f.file_size || 0), 0)) : '0 B'} subtitle="všetky súbory spolu" color="purple" />
        </div>

        {/* Upload — Fix 8: ikona používa var(--accent-link) */}
        <div className="card shadow-card hover:shadow-lg transition-shadow animate-slide-up">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--surface-2)' }}>
              <CloudUpload size={18} style={{ color: 'var(--accent-link)' }} />
            </div>
            <div>
              <h3 className="font-bold text-lg" style={{ color: 'var(--text)' }}>Nahrať nový súbor</h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>PDF, obrázky (JPG, PNG, WebP), PowerPoint, Word, Excel • max 50 MB</p>
            </div>
          </div>
          <input type="text" className="input-field text-sm mb-4"
            placeholder="Popis súboru (napr. Matematika – vzorce z Kap. 5) – voliteľné"
            value={description} onChange={e => setDescription(e.target.value)} disabled={uploading} />
          <div {...getRootProps()} className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300
            ${isDragActive ? 'scale-[1.02]' : ''} ${uploading ? 'opacity-60 cursor-not-allowed' : ''}`}
            style={{
              borderColor: isDragActive ? 'var(--accent-link)' : 'var(--border)',
              background: isDragActive ? 'rgba(26,58,107,0.1)' : 'transparent',
            }}>
            <input {...getInputProps()} />
            {uploading ? (
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full animate-spin mx-auto mb-4"
                  style={{ borderWidth: '4px', borderStyle: 'solid', borderColor: 'var(--accent-link)', borderTopColor: 'transparent' }} />
                <p className="font-semibold text-base" style={{ color: 'var(--accent-link)' }}>Nahrávam súbor...</p>
              </div>
            ) : isDragActive ? (
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(26,58,107,0.1)' }}>
                  <Upload size={28} style={{ color: 'var(--accent-link)' }} />
                </div>
                <p className="font-semibold text-base" style={{ color: 'var(--accent-link)' }}>Pusti súbor sem!</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--surface-2)' }}>
                  <Upload size={28} style={{ color: 'var(--accent-link)' }} />
                </div>
                <p className="font-semibold text-base" style={{ color: 'var(--text)' }}>Pretiahni súbor sem</p>
                <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>alebo klikni pre výber zo zariadenia</p>
              </div>
            )}
          </div>
          {uploadError && (
            <div className="mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm"
              style={{ background: 'rgba(200,32,10,0.1)', color: '#ef4444', border: '1px solid rgba(200,32,10,0.25)' }}>
              <AlertCircle size={15} /> {uploadError}
            </div>
          )}
          {uploadSuccess && (
            <div className="mt-3 px-4 py-2.5 rounded-xl text-sm"
              style={{ background: 'rgba(5,150,105,0.1)', color: '#10b981', border: '1px solid rgba(5,150,105,0.25)' }}>
              ✅ {uploadSuccess}
            </div>
          )}
        </div>

        {/* Files & Folders */}
        <div className="card shadow-card animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--surface-2)' }}>
                <FolderOpen size={16} style={{ color: 'var(--accent-link)' }} />
              </div>
              <h3 className="font-bold" style={{ color: 'var(--text)' }}>
                {globalSearch ? `Výsledky hľadania „${search}"` : 'Priečinky a súbory triedy'}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {!globalSearch && folderPath.length < 3 && (
                <button onClick={() => { setShowCreateFolder(true); setFolderError(''); setNewFolderName(''); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
                  style={{ background: 'var(--surface-2)', color: 'var(--accent-link)' }}>
                  <FolderPlus size={13} /> Nový priečinok
                </button>
              )}
              {/* Fix 7 — hľadanie s indikátorom globálneho režimu */}
              <div className="input-with-icon" style={{ minWidth: 0 }}>
                <Search size={15} className="input-icon" />
                <input className="input-inner text-sm" style={{ width: '140px' }}
                  placeholder={globalSearch ? 'Hľadaj všade...' : 'Hľadaj...'}
                  value={search} onChange={e => setSearch(e.target.value)} />
                {globalSearch && (
                  <button onClick={() => setSearch('')} className="flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Globálne hľadanie — banner */}
          {globalSearch && (
            <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium"
              style={{ background: 'rgba(26,58,107,0.08)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
              <Search size={12} />
              Hľadám vo všetkých priečinkoch triedy • {filteredFiles.length} výsledkov
            </div>
          )}

          {/* Breadcrumbs — skryté počas globálneho hľadania */}
          {!globalSearch && (
            <div className="flex items-center gap-1 flex-wrap mb-4 text-sm">
              <button onClick={() => navigateToFolder(null)}
                className="px-2 py-1 rounded-lg transition-colors font-medium"
                style={!currentFolder
                  ? { background: 'var(--accent-link)', color: 'white' }
                  : { color: 'var(--text-muted)', background: 'transparent' }}>
                Trieda {profile?.class}
              </button>
              {folderPath.map((f, i) => (
                <span key={f.id} className="flex items-center gap-1">
                  <ChevronRight size={13} style={{ color: 'var(--border)' }} />
                  <button onClick={() => navigateToFolder(f)}
                    className="px-2 py-1 rounded-lg transition-colors font-medium"
                    style={i === folderPath.length - 1
                      ? { background: 'var(--accent-link)', color: 'white' }
                      : { color: 'var(--text-muted)', background: 'transparent' }}>
                    {f.name}
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Create Folder */}
          {!globalSearch && showCreateFolder && (
            <form onSubmit={createFolder} className="flex items-center gap-2 mb-4 p-3 rounded-2xl border"
              style={{ background: 'rgba(180,120,0,0.08)', borderColor: 'rgba(180,120,0,0.2)' }}>
              <Folder size={16} style={{ color: '#f59e0b', flexShrink: 0 }} />
              <input type="text" className="input-field py-1.5 text-sm flex-1"
                placeholder="Názov priečinka..." value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)} autoFocus maxLength={60} />
              <button type="submit" disabled={folderSaving} className="btn-primary py-1.5 px-3 text-sm">
                {folderSaving ? '...' : 'Vytvoriť'}
              </button>
              <button type="button" onClick={() => setShowCreateFolder(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--surface-2)' }}>
                <X size={14} style={{ color: 'var(--text-muted)' }} />
              </button>
            </form>
          )}
          {folderError && (
            <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
              style={{ background: 'rgba(200,32,10,0.1)', color: '#ef4444', border: '1px solid rgba(200,32,10,0.25)' }}>
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
                  <FolderCard key={folder.id} folder={folder} childCount={childCount} fileCount={fileCount}
                    isOwner={folder.created_by === profile?.id}
                    onOpen={() => navigateToFolder(folder)} onDelete={() => deleteFolder(folder)} />
                );
              })}
            </div>
          )}

          {visibleFolders.length > 0 && filteredFiles.length > 0 && (
            <div style={{ borderTop: '1px solid var(--border)', marginBottom: '20px' }} />
          )}

          {/* Files grid */}
          {filteredFiles.length === 0 && visibleFolders.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: 'var(--surface-2)' }}>
                <BookOpen size={24} style={{ color: 'var(--text-dim)' }} />
              </div>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {globalSearch ? 'Žiadne súbory nezodpovedajú hľadaniu.' : currentFolder ? 'Tento priečinok je prázdny.' : 'Trieda zatiaľ nemá žiadne materiály.'}
              </p>
            </div>
          ) : filteredFiles.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredFiles.map(file => (
                <FileCard key={file.id} file={file} isOwner={file.uploaded_by === profile?.id}
                  onDelete={() => deleteFile(file)} showFolder={globalSearch}
                  folderName={globalSearch && file.folder_id ? folders.find(f => f.id === file.folder_id)?.name : null} />
              ))}
            </div>
          ) : null}
        </div>

        <p className="text-center text-xs" style={{ color: 'var(--text-dim)' }}>
          © 2026 RU-MONT s. r. o., Spojená škola Sečovce
        </p>
      </main>
    </div>
  );
}

function StatCard({ icon, title, value, subtitle, color }) {
  const colorMap = {
    blue: 'rgba(26,58,107,0.15)', amber: 'rgba(180,100,0,0.12)',
    green: 'rgba(5,150,105,0.12)', purple: 'rgba(109,40,217,0.12)',
  };
  return (
    <article className="rounded-3xl border p-4 shadow-card hover:shadow-card-hover transition-all duration-200"
      style={{ background: colorMap[color] || colorMap.blue, borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm" style={{ background: 'var(--surface)' }}>{icon}</div>
        <span className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>{title}</span>
      </div>
      <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{value}</p>
      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
    </article>
  );
}

function FolderCard({ folder, childCount, fileCount, isOwner, onOpen, onDelete }) {
  return (
    <div className="group relative">
      <button onClick={onOpen} className="w-full text-left p-4 rounded-2xl border transition-all duration-200 hover:shadow-sm"
        style={{ borderColor: 'var(--border)', background: 'rgba(180,100,0,0.08)' }}>
        <div className="flex items-start justify-between mb-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(180,100,0,0.2)' }}>
            <Folder size={20} style={{ color: '#f59e0b' }} />
          </div>
          {isOwner && (
            <button type="button" onClick={e => { e.stopPropagation(); onDelete(); }}
              className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg flex items-center justify-center text-red-400 hover:text-red-600 transition-all"
              style={{ background: 'rgba(200,32,10,0.1)' }}>
              <Trash2 size={12} />
            </button>
          )}
        </div>
        <p className="font-semibold text-sm leading-tight line-clamp-2 mb-1" style={{ color: 'var(--text)' }}>{folder.name}</p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {childCount > 0 && `${childCount} podpriec. `}{fileCount > 0 && `${fileCount} súb.`}
          {childCount === 0 && fileCount === 0 && 'Prázdny'}
        </p>
      </button>
    </div>
  );
}

function FileCard({ file, isOwner, onDelete, showFolder, folderName }) {
  const date = new Date(file.created_at).toLocaleDateString('sk-SK', { day: '2-digit', month: 'short', year: 'numeric' });
  return (
    <div className="file-card group">
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className="text-2xl">{getFileIcon(file.file_type)}</span>
        {isOwner && (
          <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:text-red-600 transition-all"
            style={{ background: 'rgba(200,32,10,0.1)' }}>
            <Trash2 size={14} />
          </button>
        )}
      </div>
      <p className="font-semibold text-sm leading-tight mb-1 line-clamp-2" style={{ color: 'var(--text)' }}>{file.original_name}</p>
      {file.description && <p className="text-xs mb-2 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{file.description}</p>}
      {/* Fix 7 — zobraz priečinok pri globálnom hľadaní */}
      {showFolder && folderName && (
        <div className="flex items-center gap-1 mb-2">
          <Folder size={10} style={{ color: '#f59e0b' }} />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{folderName}</span>
        </div>
      )}
      <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
          <p className="font-medium">{file.profiles?.first_name} {file.profiles?.last_name}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <Clock size={10} /> <span>{date}</span>
            {file.file_size && <span>· {formatFileSize(file.file_size)}</span>}
          </div>
        </div>
        <a href={file.file_url} target="_blank" rel="noopener noreferrer" download
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200"
          style={{ background: 'rgba(26,58,107,0.15)', color: 'var(--accent-link)' }}>
          <Download size={12} /> Stiahnuť
        </a>
      </div>
    </div>
  );
}
