'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase, CLASSES, MAX_FILE_SIZE, formatFileSize, getFileIcon } from '@/lib/supabase';
import { useDropzone } from 'react-dropzone';
import {
  Users, FileText, CheckCircle, XCircle, Trash2, LogOut, Shield, Clock,
  Search, Filter, Download, CloudUpload, AlertCircle, Folder,
  FolderOpen, X, ChevronRight, FolderPlus,
} from 'lucide-react';
import ThemeToggle from '@/app/components/ThemeToggle';

const TABS = ['Žiadosti', 'Žiaci', 'Súbory'];

export default function AdminPage() {
  const router = useRouter();
  const [adminProfile, setAdminProfile] = useState(null);
  const [tab, setTab] = useState('Žiadosti');
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState([]);
  const [approved, setApproved] = useState([]);
  const [files, setFiles] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [fileSearch, setFileSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');

  // Upload stav
  const [uploadClass, setUploadClass] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadFolderId, setUploadFolderId] = useState('');
  const [uploadClassFolders, setUploadClassFolders] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  // Správa priečinkov
  const [adminCurrentFolder, setAdminCurrentFolder] = useState(null);
  const [adminFolderPath, setAdminFolderPath] = useState([]);
  const [showAdminCreateFolder, setShowAdminCreateFolder] = useState(false);
  const [newAdminFolderName, setNewAdminFolderName] = useState('');
  const [adminFolderSaving, setAdminFolderSaving] = useState(false);
  const [adminFolderError, setAdminFolderError] = useState('');

  useEffect(() => { checkAdmin(); }, []);

  async function checkAdmin() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/'); return; }
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    if (!prof?.is_admin) { router.push('/dashboard'); return; }
    setAdminProfile(prof);
    await Promise.all([loadPending(), loadApproved(), loadFiles()]);
    setLoading(false);
  }

  async function loadPending() {
    const { data } = await supabase.from('profiles').select('*').eq('status', 'pending').order('created_at', { ascending: false });
    setPending(data || []);
  }
  async function loadApproved() {
    const { data } = await supabase.from('profiles').select('*').in('status', ['approved', 'rejected']).eq('is_admin', false).order('created_at', { ascending: false });
    setApproved(data || []);
  }
  async function loadFiles() {
    const { data } = await supabase.from('files').select(`*, profiles(first_name, last_name)`).order('created_at', { ascending: false });
    setFiles(data || []);
  }

  async function approveUser(id) {
    await supabase.from('profiles').update({ status: 'approved' }).eq('id', id);
    await loadPending(); await loadApproved();
  }
  async function rejectUser(id, name) {
    if (!confirm(`Zamietnút žiadosť od ${name}?`)) return;
    await supabase.from('profiles').update({ status: 'rejected' }).eq('id', id);
    await loadPending(); await loadApproved();
  }

  async function deleteUser(id, name) {
    if (!confirm(`Vymazať žiaka ${name}?\n\nŽiak bude môcť znova použiť rovnaký email pri novej registrácii.`)) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/delete-user', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ userId: id }),
      });
      const data = await res.json();
      if (!res.ok) { alert('Chyba pri mazaní: ' + (data.error || 'Neznáma chyba')); return; }
      await loadApproved();
      await loadFiles();
    } catch (err) {
      alert('Nepodarilo sa vymazať žiaka: ' + err.message);
    }
  }

  async function deleteFile(file) {
    if (!confirm(`Vymazať "${file.original_name}"?`)) return;
    await supabase.storage.from('class-files').remove([file.file_name]);
    await supabase.from('files').delete().eq('id', file.id);
    setFiles(prev => prev.filter(f => f.id !== file.id));
  }

  // ── Načíta priečinky triedy + resetuje navigáciu ──────────────────────────
  async function handleUploadClassChange(cls) {
    setUploadClass(cls);
    setUploadFolderId('');
    setAdminCurrentFolder(null);
    setAdminFolderPath([]);
    setShowAdminCreateFolder(false);
    setAdminFolderError('');
    if (!cls) { setUploadClassFolders([]); return; }
    const { data } = await supabase
      .from('folders')
      .select('id, name, parent_id, created_by')
      .eq('class', cls)
      .order('name', { ascending: true });
    setUploadClassFolders(data || []);
  }

  // ── Navigácia v priečinkoch — synchronizuje aj uploadFolderId ─────────────
  function adminNavigateToFolder(folder) {
    setShowAdminCreateFolder(false);
    setAdminFolderError('');
    if (!folder) {
      setAdminCurrentFolder(null);
      setAdminFolderPath([]);
      setUploadFolderId('');
    } else {
      const path = [];
      let temp = folder;
      while (temp) {
        path.unshift(temp);
        const parentId = temp.parent_id;
        temp = parentId ? uploadClassFolders.find(f => f.id === parentId) : null;
      }
      setAdminCurrentFolder(folder);
      setAdminFolderPath(path);
      // Synchronizuj cieľový priečinok pre upload s aktuálnou navigáciou
      setUploadFolderId(folder.id);
    }
  }

  // ── Vytvorenie priečinka (max 3 úrovne) ───────────────────────────────────
  async function adminCreateFolder(e) {
    e.preventDefault();
    if (!newAdminFolderName.trim()) return;
    if (adminFolderPath.length >= 3) {
      setAdminFolderError('Dosiahli ste maximálnu úroveň vnorenia (3).');
      return;
    }
    setAdminFolderSaving(true);
    setAdminFolderError('');

    const { data: newFolder, error } = await supabase.from('folders').insert({
      name: newAdminFolderName.trim(),
      class: uploadClass,
      parent_id: adminCurrentFolder ? adminCurrentFolder.id : null,
      created_by: adminProfile.id,
    }).select('id, name, parent_id, created_by').single();

    if (error) {
      setAdminFolderError('Nepodarilo sa vytvoriť priečinok: ' + error.message);
      setAdminFolderSaving(false);
      return;
    }

    // Optimistický update — pridaj priečinok do lokálneho state bez reloadu
    if (newFolder) setUploadClassFolders(prev => [...prev, newFolder]);
    setNewAdminFolderName('');
    setShowAdminCreateFolder(false);
    setAdminFolderSaving(false);
  }

  // ── Zmazanie priečinka (admin môže zmazať akýkoľvek) ─────────────────────
  async function adminDeleteFolder(folder) {
    if (!confirm(`Vymazať priečinok "${folder.name}" a všetok jeho obsah?`)) return;

    // Zozbieraj IDs všetkých potomkov vrátane samotného priečinka
    const getDescendantIds = (folderId, list) => {
      let ids = [folderId];
      for (const f of list.filter(f => f.parent_id === folderId)) {
        ids = [...ids, ...getDescendantIds(f.id, list)];
      }
      return ids;
    };
    const folderIdsToDelete = getDescendantIds(folder.id, uploadClassFolders);

    // Vymaž súbory zo storage + DB
    const { data: filesToDelete } = await supabase
      .from('files').select('file_name').in('folder_id', folderIdsToDelete);
    if (filesToDelete?.length > 0) {
      const names = filesToDelete.map(f => f.file_name);
      for (let i = 0; i < names.length; i += 100) {
        await supabase.storage.from('class-files').remove(names.slice(i, i + 100));
      }
      await supabase.from('files').delete().in('folder_id', folderIdsToDelete);
      setFiles(prev => prev.filter(f => !folderIdsToDelete.includes(f.folder_id)));
    }

    // Vymaž koreňový priečinok — CASCADE zmaže podpriečinky z DB
    const { error: dbErr } = await supabase.from('folders').delete().eq('id', folder.id);
    if (dbErr) { alert('Chyba pri mazaní priečinka: ' + dbErr.message); return; }

    // Optimistický update lokálneho state
    setUploadClassFolders(prev => prev.filter(f => !folderIdsToDelete.includes(f.id)));
    if (uploadFolderId && folderIdsToDelete.includes(uploadFolderId)) setUploadFolderId('');

    // Ak sme boli vnorení v zmazanom priečinku, naviguj nahor
    if (adminCurrentFolder && folderIdsToDelete.includes(adminCurrentFolder.id)) {
      const parent = folder.parent_id
        ? uploadClassFolders.find(f => f.id === folder.parent_id) : null;
      adminNavigateToFolder(parent || null);
    }
  }

  // ── Zostaví odsadený strom priečinkov pre upload <select> ────────────────
  function buildFolderOptions(folderList, parentId = null, depth = 0) {
    const items = folderList.filter(f => (f.parent_id || null) === parentId);
    let options = [];
    for (const f of items) {
      const indent = '\u00a0\u00a0'.repeat(depth * 2);
      const prefix = depth > 0 ? '\u2514 ' : '';
      options.push({ id: f.id, label: indent + prefix + f.name });
      options = [...options, ...buildFolderOptions(folderList, f.id, depth + 1)];
    }
    return options;
  }

  const onDrop = useCallback(async (accepted, rejected) => {
    setUploadError(''); setUploadSuccess('');
    if (!uploadClass) { setUploadError('Najskôr vyber triedu.'); return; }
    if (rejected.length > 0) {
      const err = rejected[0].errors[0];
      if (err.code === 'file-too-large') setUploadError('Súbor je príliš veľký. Max 50 MB.');
      else setUploadError('Nepovolený typ súboru.');
      return;
    }
    if (accepted.length === 0) return;
    const file = accepted[0];
    setUploading(true);

    const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const path = `${uploadClass}/${safeName}`;

    const { error: uploadErr } = await supabase.storage.from('class-files').upload(path, file, { cacheControl: '3600', upsert: false });
    if (uploadErr) { setUploadError('Chyba pri nahrávaní: ' + uploadErr.message); setUploading(false); return; }

    const { data: { publicUrl } } = supabase.storage.from('class-files').getPublicUrl(path);

    const { data: inserted, error: dbErr } = await supabase.from('files').insert({
      uploaded_by: adminProfile.id,
      class: uploadClass,
      file_name: path,
      original_name: file.name,
      file_url: publicUrl,
      file_type: file.type,
      file_size: file.size,
      description: uploadDesc.trim() || null,
      folder_id: uploadFolderId || null,
    }).select('*').single();
    if (dbErr) { setUploadError('Chyba pri ukladaní: ' + dbErr.message); setUploading(false); return; }

    if (inserted) {
      setFiles(prev => [
        { ...inserted, profiles: { first_name: adminProfile.first_name, last_name: adminProfile.last_name } },
        ...prev,
      ]);
    }

    const folderName = uploadFolderId
      ? uploadClassFolders.find(f => f.id === uploadFolderId)?.name : null;
    setUploadSuccess(
      `"${file.name}" bol nahratý do triedy ${uploadClass}` +
      (folderName ? ` → priečinok „${folderName}"` : '') + '!'
    );
    setUploadDesc('');
    setUploading(false);
  }, [uploadClass, uploadDesc, uploadFolderId, uploadClassFolders, adminProfile]);

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

  const filteredUsers = approved.filter(u => {
    const name = `${u.first_name} ${u.last_name} ${u.email} ${u.class}`.toLowerCase();
    return name.includes(userSearch.toLowerCase()) && (classFilter ? u.class === classFilter : true);
  });
  const uniqueClasses = new Set(approved.map(u => u.class)).size;
  const filteredFiles = files.filter(f => {
    const text = `${f.original_name} ${f.description || ''} ${f.profiles?.first_name || ''} ${f.class}`.toLowerCase();
    return text.includes(fileSearch.toLowerCase()) && (classFilter ? f.class === classFilter : true);
  });

  const folderOptions = buildFolderOptions(uploadClassFolders);
  const adminCurrentFolderId = adminCurrentFolder ? adminCurrentFolder.id : null;
  const adminVisibleFolders = uploadClassFolders.filter(f => (f.parent_id || null) === adminCurrentFolderId);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="w-10 h-10 border-4 border-school-blue border-t-transparent rounded-full animate-spin" style={{ borderWidth: '3px' }} />
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
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
                <Shield size={10} className="text-red-400" />
                <p className="text-red-300 text-xs font-medium">Správcovský panel</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-blue-200 text-sm hidden sm:block font-medium">{adminProfile?.first_name} {adminProfile?.last_name}</span>
            <ThemeToggle />
            <button onClick={async () => { await supabase.auth.signOut(); router.push('/'); }}
              className="flex items-center gap-1.5 text-blue-200 hover:text-white transition-colors text-sm">
              <LogOut size={15} /> Odhlásiť
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8 animate-slide-up">
          <StatCard color="amber" icon={<Clock size={18} />} label="Čakajúce žiadosti" value={pending.length} hint="Na schválenie" />
          <StatCard color="blue" icon={<Users size={18} />} label="Schválení žiaci" value={approved.filter(u => u.status === 'approved').length} hint="Aktívni používatelia" />
          <StatCard color="emerald" icon={<FileText size={18} />} label="Nahratých súborov" value={files.length} hint="Všetky triedy" />
          <StatCard color="violet" icon={<Shield size={18} />} label="Aktívne triedy" value={uniqueClasses} hint="Rozdelenie používateľov" />
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 mb-6 rounded-3xl p-1.5 shadow-card w-fit animate-fade-in" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-2xl text-sm font-semibold transition-all duration-200
                ${tab === t ? 'bg-gradient-to-r from-school-navy to-school-blue text-white shadow-md' : 'hover:opacity-80'}`}
              style={tab !== t ? { color: 'var(--text-muted)' } : {}}>
              {t}
              {t === 'Žiadosti' && pending.length > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">{pending.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Žiadosti ── */}
        {tab === 'Žiadosti' && (
          <div className="card shadow-card animate-fade-in">
            <h3 className="font-bold text-school-navy mb-5 flex items-center gap-2" style={{ fontFamily: 'Sora, sans-serif', fontSize: '1.1rem' }}>
              <Clock size={18} className="text-amber-500" /> Čakajúce žiadosti o registráciu
            </h3>
            {pending.length === 0 ? (
              <div className="text-center py-14">
                <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <CheckCircle size={24} className="text-emerald-400" />
                </div>
                <p className="text-school-muted text-sm">Žiadne čakajúce žiadosti. Všetko vybavené!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pending.map(user => (
                  <div key={user.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 rounded-3xl shadow-sm hover:shadow-md transition-all duration-200">
                    <div>
                      <p className="font-bold text-school-navy flex items-center gap-2">
                        {user.first_name} {user.last_name}
                        <span className="bg-school-blue text-white text-xs px-2 py-0.5 rounded-full font-medium">{user.class}</span>
                      </p>
                      <p className="text-school-muted text-sm">{user.email}</p>
                      <p className="text-xs text-school-muted/60 mt-0.5">{new Date(user.created_at).toLocaleString('sk-SK')}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => approveUser(user.id)} className="btn-success flex items-center gap-1.5">
                        <CheckCircle size={14} /> Schváliť
                      </button>
                      <button onClick={() => rejectUser(user.id, `${user.first_name} ${user.last_name}`)} className="btn-danger flex items-center gap-1.5">
                        <XCircle size={14} /> Zamietnuť
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Žiaci ── */}
        {tab === 'Žiaci' && (
          <div className="card shadow-card hover:shadow-card-hover transition-all duration-200 animate-fade-in">
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <div className="input-with-icon flex-1">
                <Search size={15} className="input-icon" />
                <input className="input-inner text-sm" placeholder="Hľadaj meno alebo email..."
                  value={userSearch} onChange={e => setUserSearch(e.target.value)} />
              </div>
              <div className="input-with-icon">
                <Filter size={15} className="input-icon" />
                <select className="input-inner text-sm" value={classFilter} onChange={e => setClassFilter(e.target.value)}>
                  <option value="">Všetky triedy</option>
                  {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Meno', 'Email', 'Trieda', 'Stav', ''].map(h => (
                      <th key={h} className="text-left py-2 px-3 font-semibold text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(user => (
                    <tr key={user.id} className="transition-colors" style={{ borderBottom: '1px solid var(--border)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td className="py-3 px-3 font-semibold" style={{ color: 'var(--text)' }}>{user.first_name} {user.last_name}</td>
                      <td className="py-3 px-3" style={{ color: 'var(--text-muted)' }}>{user.email}</td>
                      <td className="py-3 px-3"><span className="bg-school-blue text-white text-xs px-2 py-0.5 rounded-full font-medium">{user.class}</span></td>
                      <td className="py-3 px-3"><span className={user.status === 'approved' ? 'badge-approved' : 'badge-rejected'}>{user.status === 'approved' ? 'Schválený' : 'Zamietnutý'}</span></td>
                      <td className="py-3 px-3 text-right flex items-center justify-end gap-2">
                        {user.status === 'rejected' && (
                          <button onClick={() => approveUser(user.id)} className="text-emerald-600 hover:text-emerald-800 text-xs font-semibold">Schváliť</button>
                        )}
                        <button onClick={() => deleteUser(user.id, `${user.first_name} ${user.last_name}`)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:text-red-600 transition-all"
                          style={{ ':hover': { background: 'var(--surface-2)' } }}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredUsers.length === 0 && <p className="text-center text-school-muted py-10 text-sm">Žiadni žiaci nezodpovedajú filtru.</p>}
            </div>
          </div>
        )}

        {/* ── Súbory ── */}
        {tab === 'Súbory' && (
          <div className="space-y-4 animate-fade-in">

            {/* Upload sekcia */}
            <div className="card shadow-card hover:shadow-card-hover transition-all duration-200">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--surface-2)' }}>
                  <CloudUpload size={16} style={{ color: 'var(--accent-link)' }} />
                </div>
                <h3 className="font-bold" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>Nahrať súbor do triedy</h3>
              </div>
              <p className="text-xs mb-4 ml-10" style={{ color: 'var(--text-muted)' }}>PDF, obrázky (JPG, PNG, WebP), PowerPoint, Word, Excel • max 50 MB</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text)' }}>Trieda *</label>
                  <select className="input-field py-2 text-sm" value={uploadClass}
                    onChange={e => handleUploadClassChange(e.target.value)} disabled={uploading}>
                    <option value="">-- Vyber triedu --</option>
                    {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text)' }}>Popis (voliteľné)</label>
                  <input type="text" className="input-field py-2 text-sm" placeholder="napr. Fyzika – tabuľky..."
                    value={uploadDesc} onChange={e => setUploadDesc(e.target.value)} disabled={uploading} />
                </div>
              </div>

              {/* Cieľový priečinok — synchronizovaný s navigáciou nižšie */}
              {uploadClass && (
                <div className="mb-3">
                  <label className="block text-xs font-semibold mb-1 flex items-center gap-1" style={{ color: 'var(--text)' }}>
                    <Folder size={11} className="text-amber-500" /> Cieľový priečinok pre nahrávanie
                  </label>
                  {adminCurrentFolder ? (
                    <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-sm">
                      <Folder size={14} className="text-amber-500 flex-shrink-0" />
                      <span className="font-semibold text-amber-800 flex-1">
                        {adminFolderPath.map(f => f.name).join(' › ')}
                      </span>
                      <button
                        type="button"
                        onClick={() => adminNavigateToFolder(null)}
                        className="text-xs text-amber-500 hover:text-amber-700 font-medium underline underline-offset-2">
                        Zrušiť
                      </button>
                    </div>
                  ) : (
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-school-muted">
                      {folderOptions.length === 0
                        ? `Trieda ${uploadClass} zatiaľ nemá žiadne priečinky — súbor bude v koreňovom zobrazení.`
                        : 'Koreň triedy — klikni na priečinok nižšie pre výber'}
                    </div>
                  )}
                </div>
              )}

              <div {...getRootProps()} className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200
                ${isDragActive ? 'scale-[1.01]' : ''}
                ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                style={{
                  borderColor: isDragActive ? 'var(--accent-link)' : 'var(--border)',
                  background: isDragActive ? 'rgba(26,58,107,0.08)' : 'var(--surface-2)',
                }}>
                <input {...getInputProps()} />
                {uploading ? (
                  <div>
                    <div className="w-8 h-8 border-4 border-school-blue border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-school-blue font-semibold text-sm">Nahrávam súbor...</p>
                  </div>
                ) : isDragActive ? (
                  <div>
                    <CloudUpload size={24} className="mx-auto mb-1" style={{ color: 'var(--accent-link)' }} />
                    <p className="font-semibold text-sm" style={{ color: 'var(--accent-link)' }}>Pusti súbor sem!</p>
                  </div>
                ) : (
                  <div>
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: 'var(--surface-3)' }}>
                      <CloudUpload size={20} style={{ color: 'var(--accent-link)' }} />
                    </div>
                    <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Pretiahni súbor sem</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>alebo klikni pre výber zo zariadenia</p>
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

            {/* ── Správa priečinkov (zobrazí sa po výbere triedy) ── */}
            {uploadClass && (
              <div className="card shadow-card hover:shadow-card-hover transition-all duration-200">
                {/* Hlavička */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                      <FolderOpen size={16} className="text-amber-500" />
                    </div>
                    <div>
                      <h3 className="font-bold text-school-navy text-sm">Priečinky triedy {uploadClass}</h3>
                      <p className="text-xs text-school-muted">Kliknutím na priečinok ho vybereš ako cieľ nahrávanie • Max 3 úrovne</p>
                    </div>
                  </div>
                  {adminFolderPath.length < 3 && (
                    <button
                      onClick={() => { setShowAdminCreateFolder(true); setAdminFolderError(''); setNewAdminFolderName(''); }}
                      className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors">
                      <FolderPlus size={13} /> Nový priečinok
                    </button>
                  )}
                </div>

                {/* Breadcrumbs */}
                <div className="flex items-center gap-1 flex-wrap mb-4 text-sm">
                  <button
                    onClick={() => adminNavigateToFolder(null)}
                    className={`px-2 py-1 rounded-lg transition-colors ${
                      !adminCurrentFolder ? 'bg-school-navy text-white font-semibold' : 'text-school-muted hover:text-school-navy hover:bg-gray-100'
                    }`}>
                    Trieda {uploadClass}
                  </button>
                  {adminFolderPath.map((f, i) => (
                    <span key={f.id} className="flex items-center gap-1">
                      <ChevronRight size={13} className="text-gray-300" />
                      <button
                        onClick={() => adminNavigateToFolder(f)}
                        className={`px-2 py-1 rounded-lg transition-colors ${
                          i === adminFolderPath.length - 1 ? 'bg-school-navy text-white font-semibold' : 'text-school-muted hover:text-school-navy hover:bg-gray-100'
                        }`}>
                        {f.name}
                      </button>
                    </span>
                  ))}
                </div>

                {/* Formulár na vytvorenie priečinka */}
                {showAdminCreateFolder && (
                  <form onSubmit={adminCreateFolder}
                    className="flex items-center gap-2 mb-4 p-3 bg-amber-50/60 rounded-2xl border border-amber-100">
                    <Folder size={16} className="text-amber-500 flex-shrink-0" />
                    <input
                      type="text"
                      className="input-field py-1.5 text-sm flex-1"
                      placeholder="Názov priečinka..."
                      value={newAdminFolderName}
                      onChange={e => setNewAdminFolderName(e.target.value)}
                      autoFocus
                      maxLength={60}
                    />
                    <button type="submit" disabled={adminFolderSaving} className="btn-primary py-1.5 px-3 text-sm">
                      {adminFolderSaving ? '...' : 'Vytvoriť'}
                    </button>
                    <button type="button" onClick={() => setShowAdminCreateFolder(false)}
                      className="w-7 h-7 rounded-lg hover:bg-gray-200 flex items-center justify-center text-school-muted transition-colors">
                      <X size={14} />
                    </button>
                  </form>
                )}
                {adminFolderError && (
                  <div className="mb-3 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-xl text-sm">
                    <AlertCircle size={13} /> {adminFolderError}
                  </div>
                )}

                {/* Mriežka priečinkov */}
                {adminVisibleFolders.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {adminVisibleFolders.map(folder => {
                      const childCount = uploadClassFolders.filter(f => f.parent_id === folder.id).length;
                      const isSelected = uploadFolderId === folder.id;
                      return (
                        <AdminFolderCard
                          key={folder.id}
                          folder={folder}
                          childCount={childCount}
                          isSelected={isSelected}
                          onOpen={() => adminNavigateToFolder(folder)}
                          onDelete={() => adminDeleteFolder(folder)}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-2">
                      <Folder size={20} className="text-gray-300" />
                    </div>
                    <p className="text-school-muted text-sm">
                      {adminCurrentFolder ? 'Tento priečinok neobsahuje podpriečinky.' : `Trieda ${uploadClass} nemá žiadne priečinky.`}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Zoznam všetkých súborov */}
            <div className="card shadow-card hover:shadow-card-hover transition-all duration-200">
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="input-with-icon flex-1">
                  <Search size={15} className="input-icon" />
                  <input className="input-inner text-sm" placeholder="Hľadaj súbor..."
                    value={fileSearch} onChange={e => setFileSearch(e.target.value)} />
                </div>
                <div className="input-with-icon">
                  <Filter size={15} className="input-icon" />
                  <select className="input-inner text-sm" value={classFilter} onChange={e => setClassFilter(e.target.value)}>
                    <option value="">Všetky triedy</option>
                    {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Súbor', 'Nahrál', 'Trieda', 'Veľkosť', 'Dátum', ''].map(h => (
                        <th key={h} className="text-left py-2 px-3 font-semibold text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFiles.map(file => (
                      <tr key={file.id} className="transition-colors" style={{ borderBottom: '1px solid var(--border)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{getFileIcon(file.file_type)}</span>
                            <div>
                              <p className="font-semibold line-clamp-1" style={{ maxWidth: '180px', color: 'var(--text)' }}>{file.original_name}</p>
                              {file.description && <p className="text-xs line-clamp-1" style={{ color: 'var(--text-muted)' }}>{file.description}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-sm" style={{ color: 'var(--text-muted)' }}>{file.profiles?.first_name} {file.profiles?.last_name}</td>
                        <td className="py-3 px-3"><span className="bg-school-blue text-white text-xs px-2 py-0.5 rounded-full font-medium">{file.class}</span></td>
                        <td className="py-3 px-3 text-xs" style={{ color: 'var(--text-muted)' }}>{file.file_size ? formatFileSize(file.file_size) : '—'}</td>
                        <td className="py-3 px-3 text-xs" style={{ color: 'var(--text-muted)' }}>{new Date(file.created_at).toLocaleDateString('sk-SK')}</td>
                        <td className="py-3 px-3">
                          <div className="flex items-center justify-end gap-2">
                            <a href={file.file_url} target="_blank" rel="noopener noreferrer"
                              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                              style={{ color: 'var(--accent-link)' }}>
                              <Download size={14} />
                            </a>
                            <button onClick={() => deleteFile(file)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:text-red-600 transition-all">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredFiles.length === 0 && <p className="text-center py-10 text-sm" style={{ color: 'var(--text-muted)' }}>Žiadne súbory nezodpovedajú filtru.</p>}
              </div>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-school-muted/50 mt-6">
          © 2026 RU-MONT s. r. o., Spojená škola Sečovce
        </p>
      </main>
    </div>
  );
}

function AdminFolderCard({ folder, childCount, isSelected, onOpen, onDelete }) {
  return (
    <div className="group relative">
      <button
        onClick={onOpen}
        className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 hover:shadow-sm
          ${isSelected
            ? 'border-amber-400 bg-gradient-to-br from-amber-100 to-orange-100 ring-2 ring-amber-300'
            : 'border-amber-100 bg-gradient-to-br from-amber-50/60 to-orange-50/30 hover:from-amber-100/80 hover:to-orange-100/50 hover:border-amber-200'
          }`}>
        <div className="flex items-start justify-between mb-2">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSelected ? 'bg-amber-200' : 'bg-amber-100'}`}>
            <Folder size={20} className="text-amber-600" />
          </div>
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onDelete(); }}
            className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg hover:bg-red-50 flex items-center justify-center text-red-400 hover:text-red-600 transition-all">
            <Trash2 size={12} />
          </button>
        </div>
        <p className="font-semibold text-school-navy text-sm leading-tight line-clamp-2 mb-1">{folder.name}</p>
        <p className="text-xs text-school-muted">
          {childCount > 0 ? `${childCount} podpriečinkov` : 'Bez podpriečinkov'}
          {isSelected && <span className="ml-1 text-amber-600 font-semibold">✓ Vybraný</span>}
        </p>
      </button>
    </div>
  );
}

function StatCard({ icon, label, value, color, hint }) {
  const colors = {
    amber: 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100 text-amber-600',
    blue: 'bg-gradient-to-br from-blue-50 to-sky-50 border-blue-100 text-blue-600',
    emerald: 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-100 text-emerald-600',
    violet: 'bg-gradient-to-br from-violet-50 to-purple-50 border-violet-100 text-violet-600',
  };
  return (
    <article className={`rounded-3xl border p-5 shadow-card hover:shadow-card-hover transition-all duration-200 ${colors[color] || colors.blue}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-2xl bg-white/80 flex items-center justify-center shadow-sm">{icon}</div>
        <span className="text-[11px] uppercase tracking-[0.18em] text-school-muted">{label}</span>
      </div>
      <p className="text-3xl font-bold text-school-navy" style={{ fontFamily: 'Sora, sans-serif' }}>{value}</p>
      {hint && <p className="text-xs text-school-muted mt-1">{hint}</p>}
    </article>
  );
}
