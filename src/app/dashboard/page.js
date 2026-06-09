'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase, MAX_FILE_SIZE, ALLOWED_TYPES, formatFileSize, getFileIcon, getSignedUrl } from '@/lib/supabase';
import { useDropzone } from 'react-dropzone';
import { Upload, LogOut, Trash2, Download, Clock, User, CloudUpload, BookOpen, Search, AlertCircle, FolderOpen, X, Eye, EyeOff, CheckCircle, Folder, ChevronRight, FolderPlus, KeyRound, UserX, ChevronDown, ZoomIn, Menu } from 'lucide-react';
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
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });

  const userMenuRef = useRef(null);
  const userMenuBtnRef = useRef(null);
  const messageTimeoutsRef = useRef({});

  const [showProfile, setShowProfile] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showDeleteRequest, setShowDeleteRequest] = useState(false);
  const [deleteRequestSent, setDeleteRequestSent] = useState(false);
  const [editPw, setEditPw] = useState('');
  const [editPwConfirm, setEditPwConfirm] = useState('');
  const [currentPw, setCurrentPw] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
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

  const [confirmModal, setConfirmModal] = useState(null);
  function askConfirm({ title, message, danger = true, onConfirm }) {
    setConfirmModal({ title, message, danger, onConfirm });
  }

  // Fix 11 - lightbox
  const [lightboxFile, setLightboxFile] = useState(null);

  // Escape klávesa zatvorí lightbox
  useEffect(() => {
    if (!lightboxFile) return;
    function onKey(e) { if (e.key === 'Escape') setLightboxFile(null); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [lightboxFile]);

  // Fix 10 - mobile menu
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [fileLimit, setFileLimit] = useState(20);
  const [hasMoreFiles, setHasMoreFiles] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Otvorí lightbox — vygeneruje signed URL pred zobrazením
  async function openLightbox(file) {
    try {
      const signedUrl = await getSignedUrl(file.file_name, 600);
      if (!signedUrl) {
        askConfirm({ title: 'Chyba', message: 'Podpísaný URL sa nepodarilo vygenerovať.', danger: false, onConfirm: () => {} });
        return;
      }
      setLightboxFile({ ...file, signedUrl });
    } catch (err) {
      console.error('Error opening lightbox:', err);
      askConfirm({ title: 'Chyba', message: 'Náhľad obrázka sa nepodarilo načítať: ' + err.message, danger: false, onConfirm: () => {} });
    }
  }

  // Stiahne súbor cez signed URL
  async function downloadFile(file) {
    try {
      const url = await getSignedUrl(file.file_name, 120);
      if (!url) return;
      const a = document.createElement('a');
      a.href = url;
      a.download = file.original_name;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading file:', err);
    }
  }

  const [allFiles, setAllFiles] = useState([]);

  const globalSearch = search.trim().length > 0;
  const filteredFiles = globalSearch
    ? allFiles.filter(f =>
        f.original_name.toLowerCase().includes(search.toLowerCase()) ||
        (f.description || '').toLowerCase().includes(search.toLowerCase()) ||
        (`${f.profiles?.first_name} ${f.profiles?.last_name}`).toLowerCase().includes(search.toLowerCase())
      )
    : files.filter(f => (f.folder_id || null) === (currentFolder ? currentFolder.id : null));

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

  useEffect(() => {
    return () => {
      if (messageTimeoutsRef.current.error) clearTimeout(messageTimeoutsRef.current.error);
      if (messageTimeoutsRef.current.success) clearTimeout(messageTimeoutsRef.current.success);
    };
  }, []);

  useEffect(() => { loadUser(); }, []);

  useEffect(() => {
    const isOverlayOpen = !!(mobileMenuOpen || lightboxFile || showProfile || confirmModal || showDeleteRequest);
    if (isOverlayOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen, lightboxFile, showProfile, confirmModal, showDeleteRequest]);

  async function loadUser() {
    try {
      const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) throw sessionErr;
      if (!session) { router.push('/'); return; }
      const { data: prof, error: profErr } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (profErr) throw profErr;
      if (!prof || prof.status !== 'approved') { await supabase.auth.signOut(); router.push('/'); return; }
      if (prof.is_admin) { router.push('/admin'); return; }
      setProfile(prof);
      await loadFiles(prof.class);
    } catch (err) {
      console.error('Error loading user:', err);
      router.push('/');
    } finally {
      setLoading(false);
    }
  }

  async function loadFiles(className, limit = fileLimit) {
    try {
      const [filesRes, allFilesRes, foldersRes] = await Promise.all([
        supabase.from('files')
          .select(`*, profiles(first_name, last_name)`, { count: 'exact' })
          .eq('class', className).order('created_at', { ascending: false }).range(0, limit - 1),
        supabase.from('files')
          .select(`*, profiles(first_name, last_name)`)
          .eq('class', className).order('created_at', { ascending: false }),
        supabase.from('folders')
          .select('*').eq('class', className).order('name', { ascending: true }),
      ]);
      if (filesRes.error) throw filesRes.error;
      if (allFilesRes.error) throw allFilesRes.error;
      if (foldersRes.error) throw foldersRes.error;
      setFiles(filesRes.data || []);
      setAllFiles(allFilesRes.data || []);
      setHasMoreFiles((filesRes.count || 0) > limit);
      setFolders(foldersRes.data || []);
    } catch (err) {
      console.error('Error loading files:', err);
    }
  }

  async function loadMoreFiles() {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const newLimit = fileLimit + 20;
      const { data: filesData, count, error } = await supabase.from('files')
        .select(`*, profiles(first_name, last_name)`, { count: 'exact' })
        .eq('class', profile.class).order('created_at', { ascending: false }).range(0, newLimit - 1);
      if (error) throw error;
      setFiles(filesData || []);
      setHasMoreFiles((count || 0) > newLimit);
      setFileLimit(newLimit);
    } catch (err) {
      console.error('Error loading more files:', err);
    } finally {
      setLoadingMore(false);
    }
  }

  function navigateToFolder(folder) {
    if (!folder) { setCurrentFolder(null); setFolderPath([]); return; }
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

  async function createFolder(e) {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    if (folderPath.length >= 3) { setFolderError('Max 3 urovne priecinkov.'); return; }
    setFolderSaving(true); setFolderError('');
    try {
      const { error } = await supabase.from('folders').insert({
        name: newFolderName.trim(), class: profile.class,
        parent_id: currentFolder ? currentFolder.id : null, created_by: profile.id,
      });
      if (error) throw error;
      setNewFolderName(''); setShowCreateFolder(false);
      await loadFiles(profile.class);
    } catch (error) {
      setFolderError('Chyba: ' + error.message);
    } finally {
      setFolderSaving(false);
    }
  }

  async function deleteFolder(folder) {
    if (folder.created_by !== profile.id && !profile.is_admin) {
      askConfirm({ title: 'Chyba', message: 'Môžeš vymazať iba vlastné priečinky.', danger: false, onConfirm: () => {} });
      return;
    }
    askConfirm({
      title: 'Vymazať priečinok?',
      message: `Priečinok "${folder.name}" a všetok obsah bude natrvalo vymazaný.`,
      onConfirm: async () => {
        setLoading(true);
        try {
          const { data: allFolders, error: foldersErr } = await supabase.from('folders').select('id, parent_id').eq('class', profile.class);
          if (foldersErr) throw foldersErr;
          const getDescendantIds = (folderId, list) => {
            let ids = [folderId];
            for (const f of list.filter(f => f.parent_id === folderId)) ids = [...ids, ...getDescendantIds(f.id, list)];
            return ids;
          };
          const folderIdsToDelete = getDescendantIds(folder.id, allFolders || []);
          const { data: filesToDelete, error: filesErr } = await supabase.from('files').select('file_name').in('folder_id', folderIdsToDelete);
          if (filesErr) throw filesErr;
          if (filesToDelete?.length > 0) {
            const fileNames = filesToDelete.map(f => f.file_name);
            for (let i = 0; i < fileNames.length; i += 100) {
              const { error: storageErr } = await supabase.storage.from('class-files').remove(fileNames.slice(i, i + 100));
              if (storageErr) throw storageErr;
            }
            const { error: dbFilesErr } = await supabase.from('files').delete().in('folder_id', folderIdsToDelete);
            if (dbFilesErr) throw dbFilesErr;
          }
          const { error: dbErr } = await supabase.from('folders').delete().in('id', folderIdsToDelete);
          if (dbErr) throw dbErr;
          if (currentFolder && folderIdsToDelete.includes(currentFolder.id)) {
            // Use full folder objects from `folders` state (has name, etc.)
            // allFolders only has {id, parent_id} which would give undefined breadcrumb names
            const parentFolder = folder.parent_id ? folders.find(f => f.id === folder.parent_id) : null;
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
    try {
      const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) throw sessionErr;
      if (!session?.user?.email) { setProfileError('Relácia vypršala. Prihláste sa znova.'); setProfileSaving(false); return; }
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: session.user.email, password: currentPw });
      if (signInErr) { setProfileError('Aktuálne heslo je nesprávne.'); setProfileSaving(false); return; }
      const { error: pwErr } = await supabase.auth.updateUser({ password: editPw });
      if (pwErr) { setProfileError('Heslo sa nepodarilo zmenit: ' + pwErr.message); setProfileSaving(false); return; }
      setCurrentPw(''); setEditPw(''); setEditPwConfirm('');
      setProfileSuccess('Heslo bolo úspešne zmenené!');
    } catch (err) {
      console.error(err);
      setProfileError('Nastala neočakávaná chyba.');
    } finally {
      setProfileSaving(false);
    }
  }

  async function requestDeletion() {
    try {
      const { error } = await supabase.from('profiles').update({ deletion_requested: true }).eq('id', profile.id);
      if (error) throw error;
      setDeleteRequestSent(true);
    } catch (err) {
      console.error(err);
      askConfirm({ title: 'Chyba', message: 'Nepodarilo sa odoslať žiadosť: ' + err.message, danger: false, onConfirm: () => {} });
    }
  }

  function openProfile() {
    setShowUserMenu(false); setEditPw(''); setEditPwConfirm(''); setCurrentPw('');
    setProfileError(''); setProfileSuccess('');
    setShowCurrentPw(false); setShowNewPw(false); setShowConfirmPw(false);
    setShowProfile(true);
  }


  const onDrop = useCallback((accepted, rejected) => {
    setUploadError(''); setUploadSuccess('');
    if (rejected.length > 0) {
      const err = rejected[0]?.errors?.[0];
      if (!err) { setUploadError('Chyba pri nahrávaní súboru.'); return; }
      if (err.code === 'file-too-large') setUploadError('Súbor je príliš veľký. Max 50 MB.');
      else if (err.code === 'file-invalid-type') setUploadError('Nepovolený typ súboru.');
      else setUploadError('Chyba: ' + err.message);
      return;
    }
    if (accepted.length === 0) return;
    setSelectedFiles(prev => {
      const existingNames = prev.map(f => f.name);
      const newFiles = accepted.filter(f => !existingNames.includes(f.name));
      return [...prev, ...newFiles];
    });
  }, []);

  const handleUpload = useCallback(async () => {
    if (selectedFiles.length === 0 || uploading) return;
    setUploadError(''); setUploadSuccess('');
    setUploading(true);

    // Klientská kontrola denného limitu
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const { count: todayCount, error: countErr } = await supabase
      .from('files')
      .select('id', { count: 'exact', head: true })
      .eq('uploaded_by', profile.id)
      .gte('created_at', startOfDay.toISOString());
    if (countErr) {
      setUploadError('Chyba pri kontrole denného limitu. Skús neskôr.');
      setUploading(false);
      return;
    }
    if (todayCount + selectedFiles.length > 20) {
      setUploadError(`Denný limit 20 súborov by bol prekročený. Môžeš nahrať ešte ${Math.max(0, 20 - todayCount)} súborov.`);
      setUploading(false);
      return;
    }

    let successCount = 0;
    const errors = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      setUploadProgress({ current: i + 1, total: selectedFiles.length });

      // Server-side validácia typu súboru
      if (!ALLOWED_TYPES.includes(file.type)) {
        errors.push(`${file.name}: Nepovolený typ súboru.`);
        continue;
      }

      const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const path = `${profile.class}/${safeName}`;

      const { error: uploadErr } = await supabase.storage
        .from('class-files')
        .upload(path, file, { cacheControl: '3600', upsert: false });
      if (uploadErr) { errors.push(`${file.name}: ${uploadErr.message}`); continue; }

      const { data: inserted, error: dbErr } = await supabase.from('files').insert({
        uploaded_by: profile.id,
        class: profile.class,
        file_name: path,
        original_name: file.name,
        file_url: path,
        file_type: file.type,
        file_size: file.size,
        description: null,
        folder_id: currentFolder ? currentFolder.id : null,
      }).select(`*, profiles(first_name, last_name)`).single();

      if (dbErr) {
        await supabase.storage.from('class-files').remove([path]);
        errors.push(`${file.name}: ${dbErr.message}`);
        continue;
      }

      successCount++;
    }

    setSelectedFiles([]);
    setUploading(false);
    setUploadProgress({ current: 0, total: 0 });

    if (errors.length > 0) {
      setUploadError('Chyba: ' + errors.join(' | '));
      if (messageTimeoutsRef.current.error) clearTimeout(messageTimeoutsRef.current.error);
      messageTimeoutsRef.current.error = setTimeout(() => setUploadError(''), 5000);
    }
    if (successCount > 0) {
      const msg = successCount === 1 ? 'Súbor bol úspešne nahraný!' : `${successCount} súborov bolo úspešne nahraných!`;
      setUploadSuccess(msg);
      if (messageTimeoutsRef.current.success) clearTimeout(messageTimeoutsRef.current.success);
      messageTimeoutsRef.current.success = setTimeout(() => setUploadSuccess(''), 4000);
      await loadFiles(profile.class);
    }
  }, [profile, currentFolder, selectedFiles, uploading]);

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
    maxSize: MAX_FILE_SIZE, multiple: true, disabled: uploading,
  });

  function deleteFile(file) {
    if (file.uploaded_by !== profile.id) {
      askConfirm({ title: 'Chyba', message: 'Môžeš vymazať iba vlastné súbory.', danger: false, onConfirm: () => {} });
      return;
    }
    askConfirm({
      title: 'Vymazať súbor?',
      message: `"${file.original_name}" bude natrvalo vymazaný.`,
      onConfirm: async () => {
        try {
          const { error: storageErr } = await supabase.storage.from('class-files').remove([file.file_name]);
          if (storageErr) throw storageErr;
          const { error: dbErr } = await supabase.from('files').delete().eq('id', file.id);
          if (dbErr) throw dbErr;
          setFiles(prev => prev.filter(f => f.id !== file.id));
          setAllFiles(prev => prev.filter(f => f.id !== file.id));
        } catch (err) {
          console.error('deleteFile error:', err);
          askConfirm({ title: 'Chyba', message: 'Súbor sa nepodarilo vymazať: ' + err.message, danger: false, onConfirm: () => {} });
        }
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
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nacitavam...</p>
      </div>
    </div>
  );

  return (
    <div style={{ background: 'var(--bg)' }}>

      {/* Fix 11 - Lightbox */}
      {lightboxFile && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center animate-fade-in"
          style={{ background: 'rgba(0,0,0,0.92)', cursor: 'pointer' }}
          onClick={() => setLightboxFile(null)}>
          <button className="absolute top-4 right-4 w-10 h-10 rounded-2xl flex items-center justify-center z-10"
            style={{ background: 'rgba(255,255,255,0.12)', color: 'white' }}
            onClick={() => setLightboxFile(null)}>
            <X size={20} />
          </button>
          <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-2xl text-sm font-medium text-white"
            style={{ background: 'rgba(255,255,255,0.1)', maxWidth: '70vw', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {lightboxFile.original_name}
          </div>
          <img src={lightboxFile.signedUrl} alt={lightboxFile.original_name}
            onClick={e => e.stopPropagation()}
            className="animate-fade-in"
            style={{ maxWidth: '92vw', maxHeight: '86vh', objectFit: 'contain', borderRadius: '12px', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }} />
          <a href={lightboxFile.signedUrl} download={lightboxFile.original_name} target="_blank" rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold text-white"
            style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}>
            <Download size={15} /> Stiahnut
          </a>
        </div>
      )}

      {/* Fix 10 - Mobile menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[55] flex flex-col sm:hidden animate-fade-in"
          style={{ background: 'rgba(7,17,31,0.97)' }}>
          <div className="flex items-center justify-between px-5 py-5">
            <div className="flex items-center gap-3">
              <Image src="/logo.png" alt="Logo" width={32} height={32} className="object-contain" />
              <div>
                <p className="text-white font-bold text-sm">Trieda {profile?.class}</p>
                <p className="text-blue-300 text-xs">{profile?.first_name} {profile?.last_name}</p>
              </div>
            </div>
            <button onClick={() => setMobileMenuOpen(false)}
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}>
              <X size={18} />
            </button>
          </div>
          <div className="flex flex-col gap-2 px-5 pt-4">
            <button onClick={() => { setMobileMenuOpen(false); openProfile(); }}
              className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left font-semibold text-white"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <KeyRound size={18} style={{ color: 'var(--accent-link)' }} /> Zmena hesla
            </button>
            <button onClick={() => { setMobileMenuOpen(false); setShowDeleteRequest(true); }}
              className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left font-semibold"
              style={{ background: 'rgba(200,32,10,0.1)', border: '1px solid rgba(200,32,10,0.2)', color: '#ef4444' }}>
              <UserX size={18} /> Zrusenie uctu
            </button>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', margin: '8px 0' }} />
            <button onClick={async () => { setMobileMenuOpen(false); await supabase.auth.signOut(); router.push('/'); }}
              className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left font-semibold text-white"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <LogOut size={18} style={{ color: 'rgba(255,255,255,0.6)' }} /> Odhlasit
            </button>
          </div>
          <div className="absolute bottom-8 left-0 right-0 flex justify-center">
            <ThemeToggle />
          </div>
        </div>
      )}

      {/* Confirm modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in"
          style={{ background: 'var(--overlay)' }}>
          <div className="rounded-3xl shadow-2xl w-full max-w-sm p-6 animate-slide-up"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h3 className="font-bold text-lg mb-2" style={{ color: 'var(--text)' }}>{confirmModal.title}</h3>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>{confirmModal.message}</p>
            <div className="flex gap-3">
              {confirmModal.danger ? (
                <>
                  <button onClick={() => setConfirmModal(null)}
                    className="flex-1 py-2.5 rounded-xl font-semibold text-sm"
                    style={{ background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)' }}>
                    Zrušiť
                  </button>
                  <button onClick={() => { const fn = confirmModal.onConfirm; setConfirmModal(null); fn(); }}
                    className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-white"
                    style={{ background: 'linear-gradient(135deg,#dc2626,#ef4444)' }}>
                    Potvrdiť
                  </button>
                </>
              ) : (
                <button onClick={() => setConfirmModal(null)}
                  className="w-full py-2.5 rounded-xl font-semibold text-sm"
                  style={{ background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)' }}>
                  Zatvoriť
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Zrusenie uctu */}
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
                <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text)' }}>Ziadost odoslana</h2>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Spravca skoly dostane tvoju ziadost o zrusenie uctu a rozhodne o nej co najskor.</p>
                <button onClick={() => { setShowDeleteRequest(false); setDeleteRequestSent(false); }} className="btn-primary w-full mt-5">Zatvorit</button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(200,32,10,0.1)' }}>
                    <UserX size={22} style={{ color: '#ef4444' }} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>Zrusenie uctu</h2>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Táto akcia vyžaduje schválenie správcu</p>
                  </div>
                </div>
                <div className="rounded-xl p-4 mb-5 text-sm" style={{ background: 'rgba(200,32,10,0.07)', border: '1px solid rgba(200,32,10,0.2)', color: 'var(--text)' }}>
                  Po schválení správcom bude tvoj účet a všetky nahrané súbory <strong>natrvalo vymazané</strong>. Táto akcia je nevratná.
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowDeleteRequest(false)}
                    className="flex-1 py-2.5 rounded-xl font-semibold text-sm"
                    style={{ background: 'var(--surface-2)', color: 'var(--text)' }}>Zrusit</button>
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
          <div className="rounded-3xl shadow-2xl w-full max-w-md p-6 relative animate-slide-up overflow-y-auto" style={{ background: 'var(--surface)', border: '1px solid var(--border)', maxHeight: '90vh' }}>
            <button onClick={() => setShowProfile(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--surface-2)' }}>
              <X size={16} style={{ color: 'var(--text-muted)' }} />
            </button>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'var(--surface-2)' }}>
                <User size={22} style={{ color: 'var(--text)' }} />
              </div>
              <div>
                <h2 className="text-xl font-bold" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>Moj profil</h2>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Trieda {profile?.class}</p>
              </div>
            </div>
            <form onSubmit={saveProfile} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Meno</label>
                  <input type="text" className="input-field" value={profile?.first_name || ''} disabled />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Priezvisko</label>
                  <input type="text" className="input-field" value={profile?.last_name || ''} disabled />
                </div>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Meno moze zmenit iba spravca skoly.</p>
              <div className="border-t" style={{ borderColor: 'var(--border)' }}>
                <div className="pt-3 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Zmena hesla</p>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text)' }}>Aktualne heslo</label>
                    <div className="relative">
                    <input type={showCurrentPw ? 'text' : 'password'} className="input-field pr-10"
                        autoComplete="current-password"
                        placeholder="vase aktualne heslo" value={currentPw} onChange={e => setCurrentPw(e.target.value)} required />
                      <button type="button" onClick={() => setShowCurrentPw(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                        {showCurrentPw ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text)' }}>Nove heslo</label>
                    <div className="relative">
                      <input type={showNewPw ? 'text' : 'password'} className="input-field pr-10"
                        autoComplete="new-password"
                        placeholder="min. 6 znakov" value={editPw} onChange={e => setEditPw(e.target.value)} required />
                      <button type="button" onClick={() => setShowNewPw(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                        {showNewPw ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text)' }}>Zopakujte nove heslo</label>
                    <div className="relative">
                      <input type={showConfirmPw ? 'text' : 'password'} className="input-field pr-10"
                        autoComplete="new-password"
                        placeholder="zopakujte heslo" value={editPwConfirm} onChange={e => setEditPwConfirm(e.target.value)} required />
                      <button type="button" onClick={() => setShowConfirmPw(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                        {showConfirmPw ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
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
                {profileSaving ? 'Ukladam...' : 'Zmenit heslo'}
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
              <p className="text-white font-bold text-sm hidden sm:block" style={{ fontFamily: 'Sora, sans-serif' }}>
                Spojená škola Kollárova 17, Sečovce
              </p>
              <p className="text-white font-bold text-sm sm:hidden" style={{ fontFamily: 'Sora, sans-serif' }}>
                SS Sečovce
              </p>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <p className="text-blue-200 text-xs">Trieda {profile?.class}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative hidden sm:block">
              <button ref={userMenuBtnRef} onClick={() => setShowUserMenu(v => !v)}
                className="flex items-center gap-2 rounded-xl px-3 py-1.5 transition-colors"
                style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(4px)' }}>
                <User size={13} className="text-blue-200" />
                <span className="text-white text-sm font-medium">{profile?.first_name} {profile?.last_name}</span>
                <ChevronDown size={12} className="text-blue-300" />
              </button>
              {showUserMenu && (
                <div ref={userMenuRef} className="absolute right-0 top-full mt-2 z-50 rounded-2xl shadow-2xl py-1.5 min-w-[200px] animate-fade-in"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
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
                    <UserX size={15} /> Zrusenie uctu
                  </button>
                </div>
              )}
            </div>
            <div className="hidden sm:flex items-center gap-3">
              <ThemeToggle />
              <button onClick={async () => { await supabase.auth.signOut(); router.push('/'); }}
                className="flex items-center gap-1.5 text-blue-200 hover:text-white transition-colors text-sm">
                <LogOut size={15} /> Odhlasit
              </button>
            </div>
            <button onClick={() => setMobileMenuOpen(true)}
              className="sm:hidden w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.1)' }}>
              <Menu size={18} className="text-white" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="animate-slide-up">
          <h2 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>
            Trieda {profile?.class}
          </h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>{globalSearch ? `${filteredFiles.length} výsledkov hľadania` : `${filteredFiles.length} materiálov v tomto priečinku`}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up">
          <StatCard icon={<BookOpen size={20} style={{ color: '#3b82f6' }} />} title="Subory" value={files.length} subtitle="celkom nahranych" color="blue" />
          <StatCard icon={<Folder size={20} style={{ color: '#f59e0b' }} />} title="Priecinky" value={folders.filter(f => !f.parent_id).length} subtitle="hlavnych priecinkov" color="amber" />
          <StatCard icon={<CloudUpload size={20} style={{ color: '#10b981' }} />} title="Posledný upload" value={allFiles.length > 0 ? new Date(allFiles[0].created_at).toLocaleDateString('sk-SK', { day: '2-digit', month: 'short' }) : '--'} subtitle="dátum posledného" color="green" />
          <StatCard icon={<Clock size={20} style={{ color: '#a855f7' }} />} title="Veľkosť" value={allFiles.length > 0 ? formatFileSize(allFiles.reduce((sum, f) => sum + (f.file_size || 0), 0)) : '0 B'} subtitle="všetky súbory spolu" color="purple" />
        </div>

        <div className="card shadow-card animate-slide-up">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--surface-2)' }}>
              <CloudUpload size={18} style={{ color: 'var(--accent-link)' }} />
            </div>
            <div>
              <h3 className="font-bold text-lg" style={{ color: 'var(--text)' }}>Nahrat novy subor</h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>PDF, obrazky, PowerPoint, Word, Excel - max 50 MB</p>
            </div>
          </div>
          <div {...getRootProps()} className={`border-2 border-dashed rounded-2xl p-4 sm:p-8 text-center cursor-pointer transition-all duration-300
            ${isDragActive ? 'scale-[1.02]' : ''} ${uploading ? 'opacity-60 cursor-not-allowed' : ''}`}
            style={{ borderColor: isDragActive ? 'var(--accent-link)' : 'var(--border)', background: isDragActive ? 'rgba(26,58,107,0.1)' : 'transparent' }}>
            <input {...getInputProps()} />
            {uploading ? (
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full animate-spin mx-auto mb-4"
                  style={{ borderWidth: '4px', borderStyle: 'solid', borderColor: 'var(--accent-link)', borderTopColor: 'transparent' }} />
                <p className="font-semibold text-sm" style={{ color: 'var(--accent-link)' }}>
                  {uploadProgress.total > 1 ? `Nahrávam ${uploadProgress.current} / ${uploadProgress.total}...` : 'Nahrávam súbor...'}
                </p>
              </div>
            ) : selectedFiles.length > 0 ? (
              <div className="w-full" onClick={e => e.stopPropagation()}>
                <div className="flex flex-col gap-2 max-h-52 overflow-y-auto pr-1">
                  {selectedFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-xl" style={{ background: 'var(--surface-2)' }}>
                      <span className="text-lg flex-shrink-0">{getFileIcon(f.type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs truncate" style={{ color: 'var(--text)' }}>{f.name}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatFileSize(f.size)}</p>
                      </div>
                      <button onClick={e => { e.stopPropagation(); setSelectedFiles(prev => prev.filter((_, idx) => idx !== i)); setUploadError(''); }}
                        className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors"
                        style={{ color: 'var(--text-muted)' }}>
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-center mt-3" style={{ color: 'var(--text-dim)' }}>
                  Klikni alebo pretiahni ďalšie súbory
                </p>
              </div>
            ) : isDragActive ? (
              <div className="flex flex-col items-center">
                <Upload size={28} style={{ color: 'var(--accent-link)' }} className="mb-2" />
                <p className="font-semibold text-base" style={{ color: 'var(--accent-link)' }}>Pusti subor sem!</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--surface-2)' }}>
                  <Upload size={28} style={{ color: 'var(--accent-link)' }} />
                </div>
                <p className="font-semibold text-base" style={{ color: 'var(--text)' }}>Pretiahni subor sem</p>
                <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>alebo klikni pre vyber zo zariadenia</p>
              </div>
            )}
          </div>
          {selectedFiles.length > 0 && !uploading && (
            <div className="mt-4 flex items-center gap-3">
              <button onClick={() => { setSelectedFiles([]); setUploadError(''); }}
                className="flex items-center gap-1.5 text-sm px-4 py-2.5 rounded-xl font-semibold flex-shrink-0"
                style={{ background: 'rgba(200,32,10,0.08)', color: '#ef4444', border: '1px solid rgba(200,32,10,0.2)' }}>
                <X size={14} /> Zrušiť
              </button>
              <button onClick={handleUpload}
                className="flex items-center justify-center gap-2 text-sm px-6 py-2.5 rounded-xl font-semibold text-white flex-1"
                style={{ background: 'var(--accent-link)' }}>
                <Upload size={15} />
                Odoslať {selectedFiles.length > 1 ? `${selectedFiles.length} súborov` : 'súbor'}
              </button>
            </div>
          )}
          {uploadError && <div className="mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm" style={{ background: 'rgba(200,32,10,0.1)', color: '#ef4444', border: '1px solid rgba(200,32,10,0.25)' }}><AlertCircle size={15} /> {uploadError}</div>}
          {uploadSuccess && <div className="mt-3 px-4 py-2.5 rounded-xl text-sm" style={{ background: 'rgba(5,150,105,0.1)', color: '#10b981', border: '1px solid rgba(5,150,105,0.25)' }}>{uploadSuccess}</div>}
        </div>

        <div className="card shadow-card animate-slide-up">
          <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--surface-2)' }}>
                <FolderOpen size={16} style={{ color: 'var(--accent-link)' }} />
              </div>
              <h3 className="font-bold" style={{ color: 'var(--text)' }}>
                {globalSearch ? `Vysledky hladania "${search}"` : 'Priecinky a subory triedy'}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {!globalSearch && folderPath.length < 3 && (
                <button onClick={() => { setShowCreateFolder(true); setFolderError(''); setNewFolderName(''); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold flex-shrink-0"
                  style={{ background: 'var(--surface-2)', color: 'var(--accent-link)' }}>
                  <FolderPlus size={13} /> Novy priecinok
                </button>
              )}
              <div className="input-with-icon flex-1" style={{ minWidth: 0 }}>
                <Search size={15} className="input-icon" />
                <input className="input-inner text-sm" style={{ width: '100%' }}
                  placeholder="Hladaj..."
                  value={search} onChange={e => setSearch(e.target.value)} />
                {globalSearch && (
                  <button onClick={() => setSearch('')} className="flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {globalSearch && (
            <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium"
              style={{ background: 'rgba(26,58,107,0.08)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
              <Search size={12} />
              Hľadám vo všetkých priečinkoch triedy — {filteredFiles.length} výsledkov
            </div>
          )}

          {!globalSearch && (
            <div className="flex items-center gap-1 flex-wrap mb-4 text-sm">
              <button onClick={() => navigateToFolder(null)}
                className="px-2 py-1 rounded-lg transition-colors font-medium"
                style={!currentFolder ? { background: 'var(--accent-link)', color: 'white' } : { color: 'var(--text-muted)', background: 'transparent' }}>
                Trieda {profile?.class}
              </button>
              {folderPath.map((f, i) => (
                <span key={f.id} className="flex items-center gap-1">
                  <ChevronRight size={13} style={{ color: 'var(--text-dim)' }} />
                  <button onClick={() => navigateToFolder(f)}
                    className="px-2 py-1 rounded-lg transition-colors font-medium"
                    style={i === folderPath.length - 1 ? { background: 'var(--accent-link)', color: 'white' } : { color: 'var(--text-muted)', background: 'transparent' }}>
                    {f.name}
                  </button>
                </span>
              ))}
            </div>
          )}

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
          {folderError && <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-xl text-sm" style={{ background: 'rgba(200,32,10,0.1)', color: '#ef4444', border: '1px solid rgba(200,32,10,0.25)' }}><AlertCircle size={13} /> {folderError}</div>}

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

          {visibleFolders.length > 0 && filteredFiles.length > 0 && <div style={{ borderTop: '1px solid var(--border)', marginBottom: '20px' }} />}

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
                  onPreview={openLightbox}
                  onDownload={() => downloadFile(file)}
                  folderName={globalSearch && file.folder_id ? folders.find(f => f.id === file.folder_id)?.name : null} />
              ))}
            </div>
          ) : null}

          {/* Nacitat viac */}
          {!globalSearch && hasMoreFiles && (
            <div className="text-center pt-2">
              <button onClick={loadMoreFiles} disabled={loadingMore}
                className="px-6 py-2.5 rounded-2xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'var(--surface-2)', color: 'var(--accent-link)', border: '1px solid var(--border)' }}>
                {loadingMore ? 'Načítavam...' : 'Načítať viac súborov'}
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs" style={{ color: 'var(--text-dim)' }}>
          © 2026 RU-MONT s. r. o., Spojená škola Sečovce
        </p>
      </main>
    </div>
  );
}

function StatCard({ icon, title, value, subtitle, color }) {
  const colorMap = { blue: 'rgba(26,58,107,0.15)', amber: 'rgba(180,100,0,0.12)', green: 'rgba(5,150,105,0.12)', purple: 'rgba(109,40,217,0.12)' };
  return (
    <article className="rounded-3xl border p-4 shadow-card hover:shadow-card-hover transition-all duration-150"
      style={{ background: colorMap[color] || colorMap.blue, borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm" style={{ background: 'var(--surface)' }}>{icon}</div>
        <span className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>{title}</span>
      </div>
      <p className="text-xl sm:text-2xl font-bold truncate" style={{ color: 'var(--text)' }}>{value}</p>
      <p className="text-xs mt-1 truncate" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
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
              className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 w-6 h-6 rounded-lg flex items-center justify-center text-red-400 hover:text-red-600 transition-all"
              style={{ background: 'rgba(200,32,10,0.1)' }}>
              <Trash2 size={12} />
            </button>
          )}
        </div>
        <p className="font-semibold text-sm leading-tight line-clamp-2 mb-1" style={{ color: 'var(--text)' }}>{folder.name}</p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {childCount > 0 && `${childCount} podpriec. `}{fileCount > 0 && `${fileCount} sub.`}
          {childCount === 0 && fileCount === 0 && 'Prazdny'}
        </p>
      </button>
    </div>
  );
}

function FileCard({ file, isOwner, onDelete, showFolder, folderName, onPreview, onDownload }) {
  const date = new Date(file.created_at).toLocaleDateString('sk-SK', { day: '2-digit', month: 'short', year: 'numeric' });
  const isImage = file.file_type?.startsWith('image/');
  return (
    <div className="file-card group">
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className="text-2xl">{getFileIcon(file.file_type)}</span>
        {isOwner && (
        <button onClick={onDelete} className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:text-red-600 transition-all"
        style={{ background: 'rgba(200,32,10,0.1)' }}>
        <Trash2 size={14} />
        </button>
        )}
      </div>
      <p className="font-semibold text-sm leading-tight mb-1 line-clamp-2" style={{ color: 'var(--text)' }}>{file.original_name}</p>
      {file.description && <p className="text-xs mb-2 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{file.description}</p>}
      {showFolder && folderName && (
        <div className="flex items-center gap-1 mb-2">
          <Folder size={10} style={{ color: '#f59e0b' }} />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{folderName}</span>
        </div>
      )}
      <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
      <div className="text-xs min-w-0 mr-2" style={{ color: 'var(--text-muted)' }}>
          <p className="font-medium">{file.profiles?.first_name || ''} {file.profiles?.last_name || ''}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <Clock size={10} /> <span>{date}</span>
            {file.file_size && <span>- {formatFileSize(file.file_size)}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {isImage && (
            <button onClick={() => onPreview(file)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: 'rgba(139,92,246,0.12)', color: '#a855f7' }}>
              <ZoomIn size={12} /> Nahlad
            </button>
          )}
          <button onClick={onDownload}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: 'rgba(26,58,107,0.15)', color: 'var(--accent-link)' }}>
            <Download size={12} /> Stiahnut
          </button>
        </div>
      </div>
    </div>
  );
}
