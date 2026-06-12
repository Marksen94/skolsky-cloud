'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase, CLASSES, MAX_FILE_SIZE, formatFileSize, getFileIcon, getSignedUrl } from '@/lib/supabase';
import { useDropzone } from 'react-dropzone';
import {
  Users, FileText, CheckCircle, XCircle, Trash2, LogOut, Shield, Clock,
  Search, Filter, Download, CloudUpload, AlertCircle, Folder,
  FolderOpen, X, ChevronRight, FolderPlus, KeyRound, ChevronDown, Eye, EyeOff,
  Megaphone, Plus, ToggleLeft, ToggleRight, Copy,
} from 'lucide-react';
import ThemeToggle from '@/app/components/ThemeToggle';

const TABS = ['Žiadosti', 'Žiaci', 'Súbory', 'Oznamy'];

export default function AdminPage() {
  const router = useRouter();
  const mountedRef = useRef(true);
  const [adminProfile, setAdminProfile] = useState(null);
  const [tab, setTab] = useState('Žiadosti');
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState([]);
  const [approved, setApproved] = useState([]);
  const [deletionRequests, setDeletionRequests] = useState([]);
  const [files, setFiles] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [userClassFilter, setUserClassFilter] = useState('');
  const [fileSearch, setFileSearch] = useState('');
  const [fileClassFilter, setFileClassFilter] = useState('');

  const [confirmModal, setConfirmModal] = useState(null);
  function askConfirm({ title, message, danger = true, onConfirm }) {
    setConfirmModal({ title, message, danger, onConfirm });
  }

  // Oznamy
  const [announcements, setAnnouncements] = useState([]);
  const [announceSaving, setAnnounceSaving] = useState(false);
  const [announceError, setAnnounceError] = useState('');
  const [newAnnounce, setNewAnnounce] = useState({ title: '', message: '', class: '', color: 'blue', active: true });

  async function loadAnnouncements() {
    const { data, error } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
    if (!error) setAnnouncements(data || []);
  }

  async function saveAnnouncement(e) {
    e.preventDefault();
    if (!newAnnounce.message.trim() || !newAnnounce.class) { setAnnounceError('Vyplň triedu a správu.'); return; }
    setAnnounceSaving(true); setAnnounceError('');
    try {
      const { error } = await supabase.from('announcements').insert({
        title: newAnnounce.title.trim() || null,
        message: newAnnounce.message.trim(),
        class: newAnnounce.class,
        color: newAnnounce.color,
        active: newAnnounce.active,
        created_by: adminProfile.id,
      });
      if (error) throw error;
      setNewAnnounce({ title: '', message: '', class: '', color: 'blue', active: true });
      await loadAnnouncements();
    } catch (err) {
      setAnnounceError('Chyba: ' + err.message);
    } finally {
      setAnnounceSaving(false);
    }
  }

  async function toggleAnnouncement(id, active) {
    await supabase.from('announcements').update({ active }).eq('id', id);
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, active } : a));
  }

  async function deleteAnnouncement(id) {
    askConfirm({
      title: 'Vymazať oznam?',
      message: 'Oznam bude natrvalo vymazaný.',
      onConfirm: async () => {
        await supabase.from('announcements').delete().eq('id', id);
        setAnnouncements(prev => prev.filter(a => a.id !== id));
      },
    });
  }

  // Admin profil modal
  const [showProfile, setShowProfile] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [newPwConfirm, setNewPwConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const userMenuRef = useRef(null);
  const userMenuBtnRef = useRef(null);

  // Upload
  const [uploadClass, setUploadClass] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadFolderId, setUploadFolderId] = useState('');
  const [uploadClassFolders, setUploadClassFolders] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  // Export všetkých súborov ako ZIP
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  // Kopírovanie súboru do inej triedy
  const [copyFileModal, setCopyFileModal] = useState(null); // file object
  const [copyTargetClass, setCopyTargetClass] = useState('');
  const [copySaving, setCopySaving] = useState(false);
  const [copyError, setCopyError] = useState('');
  const [copySuccess, setCopySuccess] = useState('');

  async function copyFileToClass() {
    if (!copyFileModal || !copyTargetClass) return;
    if (copyTargetClass === copyFileModal.class) {
      setCopyError('Súbor je už v tejto triede.');
      return;
    }
    setCopySaving(true); setCopyError(''); setCopySuccess('');
    try {
      // 1. Stiahneme blob z existujúcej URL
      const signedUrl = await getSignedUrl(copyFileModal.file_name, 60);
      if (!signedUrl) throw new Error('Nepodarilo sa získať URL súboru.');
      const resp = await fetch(signedUrl);
      if (!resp.ok) throw new Error('Stiahnutie súboru zlyhalo.');
      const blob = await resp.blob();
      // 2. Nahráme do novej triedy
      const newName = `${copyTargetClass}/${Date.now()}_${copyFileModal.original_name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const { error: uploadErr } = await supabase.storage
        .from('class-files')
        .upload(newName, blob, { cacheControl: '3600', upsert: false, contentType: copyFileModal.file_type });
      if (uploadErr) throw uploadErr;
      // 3. Záznam v DB
      const { error: dbErr } = await supabase.from('files').insert({
        uploaded_by: adminProfile.id,
        class: copyTargetClass,
        file_name: newName,
        original_name: copyFileModal.original_name,
        file_url: newName,
        file_type: copyFileModal.file_type,
        file_size: copyFileModal.file_size,
        description: copyFileModal.description || null,
        folder_id: null,
      });
      if (dbErr) { await supabase.storage.from('class-files').remove([newName]); throw dbErr; }
      setCopySuccess(`Súbor bol skopírovaný do triedy ${copyTargetClass}.`);
      // Refresh files list
      const { data: newFiles } = await supabase.from('files')
        .select('*, profiles(first_name, last_name)')
        .order('created_at', { ascending: false });
      if (newFiles) setFiles(newFiles);
    } catch (err) {
      setCopyError('Chyba: ' + (err.message || err));
    } finally {
      setCopySaving(false);
    }
  }

  async function handleExportAll() {
    setExporting(true);
    setExportError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/export-archive', {
        headers: { 'Authorization': `Bearer ${session?.access_token}` },
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setExportError(d.error || 'Export zlyhal.');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `school-cloud-export-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError('Neočakávaná chyba: ' + err.message);
    } finally {
      setExporting(false);
    }
  }

  // Zisti či je 31. august (zvýraznenie export tlačidla)
  const isAugust31 = (() => { const d = new Date(); return d.getMonth() === 7 && d.getDate() === 31; })();

  const [adminFolderPath, setAdminFolderPath] = useState([]);
  const [showAdminCreateFolder, setShowAdminCreateFolder] = useState(false);
  const [newAdminFolderName, setNewAdminFolderName] = useState('');
  const [adminFolderSaving, setAdminFolderSaving] = useState(false);
  const [adminFolderError, setAdminFolderError] = useState('');

  const [adminCurrentFolder, setAdminCurrentFolder] = useState(null);

  useEffect(() => {
    checkAdmin();
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('admin-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, () => {
        loadPending();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (payload) => {
        if (payload.new.deletion_requested) loadPending();
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

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

  async function saveAdminPassword(e) {
    e.preventDefault();
    setProfileError(''); setProfileSuccess('');
    if (!currentPw) { setProfileError('Zadaj aktuálne heslo.'); return; }
    if (!newPw) { setProfileError('Zadaj nové heslo.'); return; }
    if (newPw.length < 6) { setProfileError('Nové heslo musí mať aspoň 6 znakov.'); return; }
    if (newPw !== newPwConfirm) { setProfileError('Heslá sa nezhodujú.'); return; }
    setProfileSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) { setProfileError('Relácia vypršala. Prihlás sa znova.'); return; }
      // Pomocný jednorazový klient — overenie starého hesla bez prepisu aktualnej session
      const { createClient } = await import('@supabase/supabase-js');
      const tempClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        { auth: { persistSession: false } }
      );
      const { error: signInErr } = await tempClient.auth.signInWithPassword({ email: session.user.email, password: currentPw });
      if (signInErr) { setProfileError('Aktuálne heslo je nesprávne.'); return; }
      const { error: pwErr } = await supabase.auth.updateUser({ password: newPw });
      if (pwErr) { setProfileError('Heslo sa nepodarilo zmeniť: ' + pwErr.message); return; }
      setCurrentPw(''); setNewPw(''); setNewPwConfirm('');
      setProfileSuccess('Heslo bolo úspešne zmenené!');
    } catch (err) {
      setProfileError('Nastala neočakávaná chyba.');
    } finally {
      setProfileSaving(false);
    }
  }

  useEffect(() => {
    const isOverlayOpen = !!(showProfile || confirmModal || copyFileModal);
    document.body.style.overflow = isOverlayOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showProfile, confirmModal, copyFileModal]);

  async function checkAdmin() {
    try {
      const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) throw sessionErr;
      if (!session) { router.push('/'); return; }
      const { data: prof, error: profErr } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (profErr) throw profErr;
      if (!prof?.is_admin) { router.push('/dashboard'); return; }
      setAdminProfile(prof);
      await Promise.all([loadPending(), loadApproved(), loadFiles(), loadAnnouncements()]);
    } catch (err) {
      console.error('Error checking admin:', err);
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  }

  async function loadPending() {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('status', 'pending').order('created_at', { ascending: false });
      if (error) throw error;
      setPending(data || []);
      const { data: dr, error: drErr } = await supabase.from('profiles').select('*').eq('deletion_requested', true).order('created_at', { ascending: false });
      if (drErr) throw drErr;
      setDeletionRequests(dr || []);
    } catch (err) {
      console.error('Error loading pending:', err);
    }
  }

  async function loadApproved() {
    try {
      const { data, error } = await supabase.from('profiles').select('*').in('status', ['approved', 'rejected']).eq('is_admin', false).order('created_at', { ascending: false });
      if (error) throw error;
      setApproved(data || []);
    } catch (err) {
      console.error('Error loading approved users:', err);
    }
  }

  async function loadFiles() {
    try {
      const { data, error } = await supabase.from('files').select(`*, profiles(first_name, last_name)`).order('created_at', { ascending: false });
      if (error) throw error;
      setFiles(data || []);
    } catch (err) {
      console.error('Error loading files:', err);
    }
  }

  async function rejectDeletion(id) {
    try {
      const { error } = await supabase.from('profiles').update({ deletion_requested: false }).eq('id', id);
      if (error) throw error;
      setDeletionRequests(prev => prev.filter(u => u.id !== id));
      setApproved(prev => prev.map(u => u.id === id ? { ...u, deletion_requested: false } : u));
    } catch (err) {
      console.error('Error rejecting deletion:', err);
    }
  }

  async function confirmDeletion(user) {
    askConfirm({
      title: `Vymazať účet?`,
      message: `Účet ${user.first_name} ${user.last_name} bude natrvalo vymazaný vrátane všetkých súborov.`,
      onConfirm: async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const res = await fetch('/api/admin/delete-user', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
            body: JSON.stringify({ userId: user.id }),
          });
          if (res.ok) {
            setDeletionRequests(prev => prev.filter(u => u.id !== user.id));
            await loadApproved();
            await loadFiles();
          } else {
            try {
              const d = await res.json();
              askConfirm({ title: 'Chyba', message: d.error || 'Neznáma chyba', danger: false, onConfirm: () => {} });
            } catch {
              askConfirm({ title: 'Chyba', message: 'Chyba pri spracovaní odpovede servera', danger: false, onConfirm: () => {} });
            }
          }
        } catch (err) {
          askConfirm({ title: 'Chyba', message: err.message, danger: false, onConfirm: () => {} });
        }
      },
    });
  }

  async function approveUser(id) {
    try {
      const { error } = await supabase.from('profiles').update({ status: 'approved' }).eq('id', id);
      if (error) throw error;
      await loadPending();
      await loadApproved();
    } catch (err) {
      console.error('Error approving user:', err);
    }
  }

  function rejectUser(id, name) {
    askConfirm({
      title: 'Zamietnuť žiadosť?',
      message: `Žiadosť od ${name} bude zamietnutá.`,
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('profiles').update({ status: 'rejected' }).eq('id', id);
          if (error) throw error;
          await loadPending();
          await loadApproved();
        } catch (err) {
          console.error('Error rejecting user:', err);
        }
      },
    });
  }

  function deleteUser(id, name) {
    askConfirm({
      title: 'Vymazať žiaka?',
      message: `Žiak ${name} bude vymazaný. Bude môcť znova použiť rovnaký email pri novej registrácii.`,
      onConfirm: async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const res = await fetch('/api/admin/delete-user', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
            body: JSON.stringify({ userId: id }),
          });
          const data = await res.json();
          if (!res.ok) { askConfirm({ title: 'Chyba', message: data.error || 'Neznáma chyba', danger: false, onConfirm: () => {} }); return; }
          await loadApproved(); await loadFiles();
        } catch (err) {
          askConfirm({ title: 'Chyba', message: err.message, danger: false, onConfirm: () => {} });
        }
      },
    });
  }

  function deleteFile(file) {
    askConfirm({
      title: 'Vymazať súbor?',
      message: `„${file.original_name}" bude natrvalo vymazaný.`,
      onConfirm: async () => {
        try {
          const { error: storageErr } = await supabase.storage.from('class-files').remove([file.file_name]);
          if (storageErr) throw storageErr;
          const { error: dbErr } = await supabase.from('files').delete().eq('id', file.id);
          if (dbErr) throw dbErr;
          setFiles(prev => prev.filter(f => f.id !== file.id));
        } catch (err) {
          console.error(err);
          askConfirm({ title: 'Chyba', message: 'Nepodarilo sa vymazať súbor: ' + err.message, danger: false, onConfirm: () => {} });
        }
      },
    });
  }

  async function handleUploadClassChange(cls) {
    setUploadClass(cls); setUploadFolderId('');
    setAdminCurrentFolder(null); setAdminFolderPath([]);
    setShowAdminCreateFolder(false); setAdminFolderError('');
    setUploadClassFolders([]);
    if (!cls) return;
    try {
      const { data, error } = await supabase.from('folders').select('id, name, parent_id, created_by').eq('class', cls).order('name', { ascending: true });
      if (error) throw error;
      setUploadClassFolders(data || []);
    } catch (err) {
      console.error('Error loading folders for class:', err);
    }
  }

  function adminNavigateToFolder(folder) {
    setShowAdminCreateFolder(false); setAdminFolderError('');
    if (!folder) {
      setAdminCurrentFolder(null); setAdminFolderPath([]); setUploadFolderId('');
    } else {
      const path = [];
      let temp = folder;
      while (temp) {
        path.unshift(temp);
        const parentId = temp.parent_id;
        temp = parentId ? uploadClassFolders?.find(f => f.id === parentId) : null;
      }
      setAdminCurrentFolder(folder); setAdminFolderPath(path); setUploadFolderId(folder.id);
    }
  }

  async function adminCreateFolder(e) {
    e.preventDefault();
    if (!newAdminFolderName.trim()) return;
    if (adminFolderPath.length >= 3) { setAdminFolderError('Dosiahli ste maximálnu úroveň vnorenia (3).'); return; }
    setAdminFolderSaving(true); setAdminFolderError('');
    try {
      const { data: newFolder, error } = await supabase.from('folders').insert({
        name: newAdminFolderName.trim(), class: uploadClass,
        parent_id: adminCurrentFolder ? adminCurrentFolder.id : null, created_by: adminProfile.id,
      }).select('id, name, parent_id, created_by').single();
      if (error) throw error;
      if (newFolder) setUploadClassFolders(prev => [...prev, newFolder]);
      setNewAdminFolderName(''); setShowAdminCreateFolder(false);
    } catch (error) {
      setAdminFolderError('Nepodarilo sa vytvoriť priečinok: ' + error.message);
    } finally {
      setAdminFolderSaving(false);
    }
  }

  function adminDeleteFolder(folder) {
    askConfirm({
      title: `Vymazať priečinok?`,
      message: `Priečinok „${folder.name}" a všetok jeho obsah bude natrvalo vymazaný.`,
      onConfirm: async () => {
        if (!mountedRef.current) return;
        try {
          const getDescendantIds = (folderId, list) => {
            let ids = [folderId];
            for (const f of list.filter(f => f.parent_id === folderId)) ids = [...ids, ...getDescendantIds(f.id, list)];
            return ids;
          };
          const folderIdsToDelete = getDescendantIds(folder.id, uploadClassFolders);
          const { data: filesToDelete, error: filesErr } = await supabase.from('files').select('file_name').in('folder_id', folderIdsToDelete);
          if (filesErr) throw filesErr;
          if (filesToDelete?.length > 0) {
            const names = filesToDelete.map(f => f.file_name);
            for (let i = 0; i < names.length; i += 100) {
              const { error: storageErr } = await supabase.storage.from('class-files').remove(names.slice(i, i + 100));
              if (storageErr) throw storageErr;
            }
            const { error: deleteFilesErr } = await supabase.from('files').delete().in('folder_id', folderIdsToDelete);
            if (deleteFilesErr) throw deleteFilesErr;
            if (mountedRef.current) setFiles(prev => prev.filter(f => !folderIdsToDelete.includes(f.folder_id)));
          }
          const { error: dbErr } = await supabase.from('folders').delete().in('id', folderIdsToDelete);
          if (dbErr) throw dbErr;
          if (mountedRef.current) {
            setUploadClassFolders(prev => prev.filter(f => !folderIdsToDelete.includes(f.id)));
            if (uploadFolderId && folderIdsToDelete.includes(uploadFolderId)) setUploadFolderId('');
            if (adminCurrentFolder && folderIdsToDelete.includes(adminCurrentFolder.id)) {
              const parent = folder.parent_id ? uploadClassFolders?.find(f => f.id === folder.parent_id) : null;
              adminNavigateToFolder(parent || null);
            }
          }
        } catch (err) {
          if (mountedRef.current) askConfirm({ title: 'Chyba', message: 'Nepodarilo sa vymazať priečinok: ' + err.message, danger: false, onConfirm: () => {} });
        }
      },
    });
  }

  const onDrop = useCallback(async (accepted, rejected) => {
    setUploadError(''); setUploadSuccess('');
    if (!uploadClass) { setUploadError('Najskôr vyber triedu.'); return; }
    if (rejected.length > 0) {
      const err = rejected[0]?.errors?.[0];
      if (err?.code === 'file-too-large') setUploadError('Jeden zo súborov je príliš veľký. Max 50 MB.');
      else setUploadError('Nepovolený typ súboru.');
    }
    if (accepted.length === 0) return;
    setUploading(true);
    const folderName = uploadFolderId ? uploadClassFolders?.find(f => f.id === uploadFolderId)?.name : null;
    let successCount = 0;
    let firstError = '';
    for (const file of accepted) {
      try {
        const safeName = `${Date.now()}_${Math.random().toString(36).slice(2)}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const path = `${uploadClass}/${safeName}`;
        const { error: uploadErr } = await supabase.storage.from('class-files').upload(path, file, { cacheControl: '3600', upsert: false });
        if (uploadErr) { firstError = firstError || `„${file.name}": ${uploadErr.message}`; continue; }
        const { data: inserted, error: dbErr } = await supabase.from('files').insert({
          uploaded_by: adminProfile.id, class: uploadClass, file_name: path,
          original_name: file.name, file_url: path, file_type: file.type,
          file_size: file.size, description: uploadDesc.trim() || null,
          folder_id: uploadFolderId || null,
        }).select('*').single();
        if (dbErr) {
          await supabase.storage.from('class-files').remove([path]);
          firstError = firstError || `„${file.name}": ${dbErr.message}`;
          continue;
        }
        if (inserted) setFiles(prev => [{ ...inserted, profiles: { first_name: adminProfile.first_name, last_name: adminProfile.last_name } }, ...prev]);
        successCount++;
      } catch (err) {
        firstError = firstError || `„${file.name}": ${err.message}`;
      }
    }
    setUploading(false);
    if (successCount > 0) {
      setUploadSuccess(`${successCount} súbor${successCount > 1 ? 'y' : ''} nahratý do triedy ${uploadClass}${folderName ? ` → „${folderName}"` : ''}!`);
      setUploadDesc('');
    }
    if (firstError) setUploadError('Chyba pri nahrávaní: ' + firstError);
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
    maxSize: MAX_FILE_SIZE, multiple: true, disabled: uploading || !uploadClass,
  });

  const filteredUsers = approved.filter(u => {
    const name = `${u.first_name} ${u.last_name} ${u.email} ${u.class}`.toLowerCase();
    return name.includes(userSearch.toLowerCase()) && (userClassFilter ? u.class === userClassFilter : true) && !u.deletion_requested;
  });
  const uniqueClasses = new Set(approved.map(u => u.class)).size;
  const filteredFiles = files.filter(f => {
    const text = `${f.original_name} ${f.description || ''} ${f.profiles?.first_name || ''} ${f.class}`.toLowerCase();
    return text.includes(fileSearch.toLowerCase()) && (fileClassFilter ? f.class === fileClassFilter : true);
  });

  const adminCurrentFolderId = adminCurrentFolder ? adminCurrentFolder.id : null;
  const adminVisibleFolders = uploadClassFolders.filter(f => (f.parent_id || null) === adminCurrentFolderId);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="w-10 h-10 border-t-transparent rounded-full animate-spin" style={{ borderWidth: '3px', borderStyle: 'solid', borderColor: 'var(--accent-link)', borderTopColor: 'transparent' }} />
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>

      {showProfile && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" style={{ background: 'var(--overlay)' }}>
          <div className="rounded-3xl shadow-2xl w-full max-w-md p-6 relative animate-slide-up" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <button onClick={() => { setShowProfile(false); setProfileError(''); setProfileSuccess(''); }}
              className="absolute top-4 right-4 w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--surface-2)' }}>
              <X size={16} style={{ color: 'var(--text-muted)' }} />
            </button>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'var(--surface-2)' }}>
                <KeyRound size={22} style={{ color: 'var(--accent-link)' }} />
              </div>
              <div>
                <h2 className="text-xl font-bold" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>Zmena hesla</h2>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{adminProfile?.first_name} {adminProfile?.last_name} — administrátor</p>
              </div>
            </div>
            <form onSubmit={saveAdminPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text)' }}>Aktuálne heslo</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} className="input-field pr-10"
                    autoComplete="current-password" placeholder="vaše aktuálne heslo"
                    value={currentPw} onChange={e => setCurrentPw(e.target.value)} required />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text)' }}>Nové heslo</label>
                <input type={showPw ? 'text' : 'password'} className="input-field"
                  autoComplete="new-password" placeholder="min. 6 znakov"
                  value={newPw} onChange={e => setNewPw(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text)' }}>Zopakuj nové heslo</label>
                <input type={showPw ? 'text' : 'password'} className="input-field"
                  autoComplete="new-password" placeholder="zopakuj heslo"
                  value={newPwConfirm} onChange={e => setNewPwConfirm(e.target.value)} required />
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

      {confirmModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" style={{ background: 'var(--overlay)' }}>
          <div className="rounded-3xl shadow-2xl w-full max-w-sm p-6 animate-slide-up" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h3 className="font-bold text-lg mb-2" style={{ color: 'var(--text)' }}>{confirmModal.title}</h3>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>{confirmModal.message}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmModal(null)}
                className="flex-1 py-2.5 rounded-xl font-semibold text-sm"
                style={{ background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)' }}>
                {confirmModal.danger ? 'Zrušiť' : 'Zatvoriť'}
              </button>
              {confirmModal.danger && (
                <button onClick={() => { const fn = confirmModal.onConfirm; setConfirmModal(null); fn(); }}
                  className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-white"
                  style={{ background: 'linear-gradient(135deg,#dc2626,#ef4444)' }}>
                  Potvrdiť
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── KOPÍROVANIE SÚBORU MODAL ──────────────────── */}
      {copyFileModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" style={{ background: 'var(--overlay)' }}>
          <div className="rounded-3xl shadow-2xl w-full max-w-sm p-6 relative animate-slide-up" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <button onClick={() => setCopyFileModal(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--surface-2)' }}>
              <X size={16} style={{ color: 'var(--text-muted)' }} />
            </button>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(5,150,105,0.12)' }}>
                <Copy size={16} style={{ color: '#10b981' }} />
              </div>
              <div>
                <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>Skopírovať do triedy</h2>
                <p className="text-xs truncate max-w-[200px]" style={{ color: 'var(--text-muted)' }}>{copyFileModal.original_name}</p>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>Cieľová trieda</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-52 overflow-y-auto">
                {CLASSES.filter(c => c !== copyFileModal.class).map(cls => (
                  <button key={cls} onClick={() => setCopyTargetClass(cls)}
                    className="px-3 py-2 rounded-xl text-sm font-semibold transition-all text-center"
                    style={copyTargetClass === cls
                      ? { background: 'rgba(5,150,105,0.2)', color: '#10b981', border: '1.5px solid #10b981' }
                      : { background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)' }}>
                    {cls}
                  </button>
                ))}
              </div>
              <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                Aktuálna trieda: <span className="font-bold" style={{ color: 'var(--accent-link)' }}>{copyFileModal.class}</span>
              </p>
            </div>
            {copyError && (
              <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-xl text-sm" style={{ background: 'rgba(200,32,10,0.1)', color: '#ef4444', border: '1px solid rgba(200,32,10,0.25)' }}>
                <AlertCircle size={13} /> {copyError}
              </div>
            )}
            {copySuccess && (
              <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-xl text-sm" style={{ background: 'rgba(5,150,105,0.1)', color: '#10b981', border: '1px solid rgba(5,150,105,0.25)' }}>
                <CheckCircle size={13} /> {copySuccess}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => setCopyFileModal(null)}
                className="flex-1 py-2.5 rounded-xl font-semibold text-sm"
                style={{ background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)' }}>
                {copySuccess ? 'Zatvoriť' : 'Zrušiť'}
              </button>
              {!copySuccess && (
                <button onClick={copyFileToClass} disabled={copySaving || !copyTargetClass}
                  className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {copySaving ? 'Kopírujem...' : <><Copy size={14} /> Skopírovať</>}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <header className="school-header">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm p-1"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
              <Image src="/logo.png" alt="Logo" width={32} height={32} className="object-contain" />
            </div>
            <div>
              <p className="text-white font-bold text-sm" style={{ fontFamily: 'Sora, sans-serif' }}>Spojená škola Kollárova 17, Sečovce</p>
              <div className="flex items-center gap-1.5">
                <Shield size={10} className="text-red-400" />
                <p className="text-red-300 text-xs font-medium">Správcovský panel</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="relative hidden sm:block">
              <button ref={userMenuBtnRef} onClick={() => setShowUserMenu(v => !v)}
                className="flex items-center gap-2 rounded-xl px-3 py-1.5 transition-colors"
                style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(4px)' }}>
                <span className="text-white text-sm font-medium">{adminProfile?.first_name} {adminProfile?.last_name}</span>
                <ChevronDown size={12} className="text-blue-300" />
              </button>
              {showUserMenu && (
                <div ref={userMenuRef} className="absolute right-0 top-full mt-2 z-50 rounded-2xl shadow-2xl py-1.5 min-w-[180px] animate-fade-in"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <button onClick={() => { setShowUserMenu(false); setCurrentPw(''); setNewPw(''); setNewPwConfirm(''); setProfileError(''); setProfileSuccess(''); setShowProfile(true); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-left transition-colors"
                    style={{ color: 'var(--text)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <KeyRound size={15} style={{ color: 'var(--accent-link)' }} /> Zmena hesla
                  </button>
                </div>
              )}
            </div>
            <ThemeToggle />
            <button onClick={async () => { await supabase.auth.signOut(); router.push('/'); }}
              className="flex items-center gap-1.5 text-blue-200 hover:text-white transition-colors text-sm">
              <LogOut size={15} /> <span className="hidden sm:inline">Odhlásiť</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8 animate-slide-up">
          <StatCard color="amber" icon={<Clock size={18} />} label="Čakajúce žiadosti" value={pending.length + deletionRequests.length} hint="Na schválenie" />
          <StatCard color="blue" icon={<Users size={18} />} label="Schválení žiaci" value={approved.filter(u => u.status === 'approved').length} hint="Aktívni používatelia" />
          <StatCard color="emerald" icon={<FileText size={18} />} label="Nahratých súborov" value={files.length} hint="Všetky triedy" />
          <StatCard color="violet" icon={<Shield size={18} />} label="Aktívne triedy" value={uniqueClasses} hint="Rozdelenie používateľov" />
        </div>

        <div className="flex flex-wrap gap-1 mb-6 rounded-3xl p-1.5 shadow-card w-fit animate-fade-in" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 sm:px-5 py-2 rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-200 ${tab === t ? 'bg-gradient-to-r from-school-navy to-school-blue text-white shadow-md' : 'hover:opacity-80'}`}
              style={tab !== t ? { color: 'var(--text-muted)' } : {}}>
              {t}
              {t === 'Žiadosti' && (pending.length + deletionRequests.length) > 0 && (
                <span className="ml-2 bg-red-500 text-white text-[10px] sm:text-xs rounded-full px-1.5 py-0.5">{pending.length + deletionRequests.length}</span>
              )}
            </button>
          ))}
        </div>

        {tab === 'Žiadosti' && (
          <div className="card shadow-card animate-fade-in">
            <h3 className="font-bold mb-5 flex items-center gap-2" style={{ fontFamily: 'Sora, sans-serif', fontSize: '1.1rem', color: 'var(--text)' }}>
              <Clock size={18} className="text-amber-500" /> Prichádzajúce žiadosti
            </h3>
            {pending.length === 0 && deletionRequests.length === 0 ? (
              <div className="text-center py-14">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(5,150,105,0.1)' }}>
                  <CheckCircle size={24} style={{ color: '#10b981' }} />
                </div>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Žiadne čakajúce žiadosti. Všetko vybavené!</p>
              </div>
            ) : (
              <div className="space-y-5">
                {pending.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Nové registrácie</p>
                    <div className="space-y-3">
                      {pending.map(user => (
                        <div key={user.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-3xl transition-all duration-200"
                          style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.12), rgba(249,115,22,0.08))', border: '1px solid rgba(251,191,36,0.25)' }}>
                          <div>
                            <p className="font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
                              {user.first_name} {user.last_name}
                              <span className="bg-school-blue text-white text-xs px-2 py-0.5 rounded-full font-medium">{user.class}</span>
                            </p>
                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>{new Date(user.created_at).toLocaleString('sk-SK')}</p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => approveUser(user.id)} className="btn-success flex items-center gap-1.5"><CheckCircle size={14} /> Schváliť</button>
                            <button onClick={() => rejectUser(user.id, `${user.first_name} ${user.last_name}`)} className="btn-danger flex items-center gap-1.5"><XCircle size={14} /> Zamietnuť</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {deletionRequests.length > 0 && (
                  <div>
                    {pending.length > 0 && <div style={{ borderTop: '1px solid var(--border)', margin: '8px 0' }} />}
                    <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Zrušenie účtu</p>
                    <div className="space-y-3">
                      {deletionRequests.map(user => (
                        <div key={user.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-3xl transition-all duration-200"
                          style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(109,40,217,0.06))', border: '1px solid rgba(139,92,246,0.28)' }}>
                          <div>
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                              <p className="font-bold" style={{ color: 'var(--text)' }}>{user.first_name} {user.last_name}</p>
                              <span className="bg-school-blue text-white text-xs px-2 py-0.5 rounded-full font-medium">{user.class}</span>
                              <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(139,92,246,0.15)', color: '#a855f7', border: '1px solid rgba(139,92,246,0.3)' }}>žiad. o zrušenie</span>
                            </div>
                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => confirmDeletion(user)} className="btn-danger flex items-center gap-1.5"><Trash2 size={14} /> Vymazať</button>
                            <button onClick={() => rejectDeletion(user.id)}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-sm transition-all"
                              style={{ background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)' }}>
                              <XCircle size={14} /> Zamietnuť
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {tab === 'Žiaci' && (
          <div className="card shadow-card hover:shadow-card-hover transition-all duration-150 animate-fade-in">
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <div className="input-with-icon flex-1">
                <Search size={15} className="input-icon" />
                <input className="input-inner text-sm" placeholder="Hľadaj meno alebo email..."
                  value={userSearch} onChange={e => setUserSearch(e.target.value)} />
              </div>
              <div className="input-with-icon">
                <Filter size={15} className="input-icon" />
                <select className="input-inner text-sm" value={userClassFilter} onChange={e => setUserClassFilter(e.target.value)}>
                  <option value="">Všetky triedy</option>
                  {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-sm min-w-[500px]" style={{ tableLayout: 'fixed' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Meno', 'Email', 'Trieda', 'Stav', ''].map(h => (
                      <th key={h} className={`text-left py-2 px-3 font-semibold text-xs uppercase tracking-wide${h === 'Email' ? ' hidden sm:table-cell' : ''}`} style={{ color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(user => (
                    <tr key={user.id} className="transition-colors" style={{ borderBottom: '1px solid var(--border)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td className="py-3 px-3 font-semibold" style={{ color: 'var(--text)' }}>
                        <div className="flex items-center gap-2 flex-wrap">
                          {user.first_name} {user.last_name}
                          {user.deletion_requested && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                              style={{ background: 'rgba(139,92,246,0.15)', color: '#a855f7', border: '1px solid rgba(139,92,246,0.3)' }}>
                              žiad. o zrušenie
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 hidden sm:table-cell" style={{ color: 'var(--text-muted)' }}>{user.email}</td>
                      <td className="py-3 px-3"><span className="bg-school-blue text-white text-xs px-2 py-0.5 rounded-full font-medium">{user.class}</span></td>
                      <td className="py-3 px-3">
                        <span className={user.status === 'approved' ? 'badge-approved' : 'badge-rejected'}>
                          {user.status === 'approved' ? 'Schválený' : 'Zamietnutý'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center justify-end gap-2">
                          {user.status === 'rejected' && (
                            <button onClick={() => approveUser(user.id)} className="text-xs font-semibold" style={{ color: '#059669' }}>Schváliť</button>
                          )}
                          <button onClick={() => deleteUser(user.id, `${user.first_name} ${user.last_name}`)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:text-red-600 transition-all">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredUsers.length === 0 && <p className="text-center py-10 text-sm" style={{ color: 'var(--text-muted)' }}>Žiadni žiaci nezodpovedajú filtru.</p>}
            </div>
          </div>
        )}

        {tab === 'Súbory' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={handleExportAll}
                disabled={exporting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-semibold text-sm transition-all duration-200 shadow-sm"
                style={isAugust31
                  ? { background: 'linear-gradient(135deg,#dc2626,#ef4444)', color: 'white', border: '1px solid rgba(220,38,38,0.5)', boxShadow: '0 0 0 3px rgba(220,38,38,0.2)' }
                  : { background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }
                }
              >
                <Download size={15} style={{ color: isAugust31 ? 'white' : 'var(--accent-link)' }} />
                {exporting ? 'Exportujem...' : isAugust31 ? '⚠️ Stiahnuť všetko ako ZIP (dnes sa maže!)' : 'Stiahnuť všetky súbory ako ZIP'}
              </button>

              {/* Export CSV žiakov */}
              <button
                onClick={() => {
                  const rows = [['Meno', 'Priezvisko', 'Email', 'Trieda', 'Stav']];
                  approved.filter(u => !u.deletion_requested).forEach(u => {
                    rows.push([u.first_name, u.last_name, u.email, u.class, u.status === 'approved' ? 'Schválený' : 'Zamietnutý']);
                  });
                  const csv = rows.map(r => r.map(v => `"${(v||'').replace(/"/g, '""')}"`).join(',')).join('\n');
                  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url; a.download = `ziaci-${new Date().toISOString().split('T')[0]}.csv`;
                  document.body.appendChild(a); a.click(); document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-semibold text-sm transition-all duration-200 shadow-sm"
                style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}
              >
                <FileText size={15} style={{ color: '#10b981' }} />
                Export žiakov CSV
              </button>

              {exportError && (
                <span className="text-sm flex items-center gap-1.5" style={{ color: '#ef4444' }}>
                  <AlertCircle size={14} /> {exportError}
                </span>
              )}
            </div>
            <div className="card shadow-card hover:shadow-card-hover transition-all duration-150">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--surface-2)' }}>
                  <CloudUpload size={16} style={{ color: 'var(--accent-link)' }} />
                </div>
                <div>
                  <h3 className="font-bold" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>Nahrať súbor do triedy</h3>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>PDF, obrázky, PowerPoint, Word, Excel • max 50 MB • viacero súborov naraz</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text)' }}>Trieda *</label>
                  <select className="input-field py-2 text-sm" value={uploadClass} onChange={e => handleUploadClassChange(e.target.value)} disabled={uploading}>
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

              <div className={`grid gap-4 ${uploadClass ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
                <div className="flex flex-col gap-3">
                  {uploadClass && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                      <Folder size={13} className="text-amber-500 flex-shrink-0" />
                      {adminCurrentFolder ? (
                        <>
                          <span style={{ color: 'var(--text)' }}>{adminFolderPath.map(f => f.name).join(' › ')}</span>
                          <button type="button" onClick={() => adminNavigateToFolder(null)} className="ml-auto text-red-400 hover:text-red-600"><X size={13} /></button>
                        </>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>Koreň triedy — vyber priečinok vpravo</span>
                      )}
                    </div>
                  )}
                  <div {...getRootProps()} className={`flex-1 border-2 border-dashed rounded-2xl p-4 sm:p-8 text-center transition-all duration-200 ${!uploadClass ? 'cursor-not-allowed opacity-50' : isDragActive ? 'scale-[1.01] cursor-pointer' : 'cursor-pointer'} ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    style={{ borderColor: !uploadClass ? 'var(--border)' : isDragActive ? 'var(--accent-link)' : 'var(--border)', background: !uploadClass ? 'var(--surface-3)' : isDragActive ? 'rgba(26,58,107,0.08)' : 'var(--surface-2)', minHeight: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <input {...getInputProps()} />
                    {uploading ? (
                      <div><div className="w-8 h-8 rounded-full animate-spin mx-auto mb-2" style={{ borderWidth: '3px', borderStyle: 'solid', borderColor: 'var(--accent-link)', borderTopColor: 'transparent' }} /><p className="font-semibold text-sm" style={{ color: 'var(--accent-link)' }}>Nahrávam...</p></div>
                    ) : isDragActive ? (
                      <div><CloudUpload size={24} className="mx-auto mb-1" style={{ color: 'var(--accent-link)' }} /><p className="font-semibold text-sm" style={{ color: 'var(--accent-link)' }}>Pusti súbory sem!</p></div>
                    ) : (
                      <div>
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: 'var(--surface-3)' }}><CloudUpload size={20} style={{ color: 'var(--accent-link)' }} /></div>
                        <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Pretiahni súbory sem</p>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>alebo klikni pre výber zo zariadenia (viacero naraz)</p>
                      </div>
                    )}
                  </div>
                  {uploadError && <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm" style={{ background: 'rgba(200,32,10,0.1)', color: '#ef4444', border: '1px solid rgba(200,32,10,0.25)' }}><AlertCircle size={15} /> {uploadError}</div>}
                  {uploadSuccess && <div className="px-4 py-2.5 rounded-xl text-sm" style={{ background: 'rgba(5,150,105,0.1)', color: '#10b981', border: '1px solid rgba(5,150,105,0.25)' }}>✅ {uploadSuccess}</div>}
                </div>

                {uploadClass && (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                        <FolderOpen size={14} className="text-amber-500" /> Priečinky — {uploadClass}
                      </div>
                      {adminFolderPath.length < 3 && (
                        <button onClick={() => { setShowAdminCreateFolder(true); setAdminFolderError(''); setNewAdminFolderName(''); }}
                          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-xl"
                          style={{ background: 'var(--surface-2)', color: 'var(--accent-link)', border: '1px solid var(--border)' }}>
                          <FolderPlus size={12} /> Nový
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-wrap text-xs">
                      <button onClick={() => adminNavigateToFolder(null)} className="px-2 py-1 rounded-lg font-medium"
                        style={!adminCurrentFolder ? { background: 'var(--accent-link)', color: 'white' } : { color: 'var(--text-muted)' }}>
                        {uploadClass}
                      </button>
                      {adminFolderPath.map((f, i) => (
                        <span key={f.id} className="flex items-center gap-1">
                          <ChevronRight size={11} style={{ color: 'var(--text-dim)' }} />
                          <button onClick={() => adminNavigateToFolder(f)} className="px-2 py-1 rounded-lg font-medium"
                            style={i === adminFolderPath.length - 1 ? { background: 'var(--accent-link)', color: 'white' } : { color: 'var(--text-muted)' }}>
                            {f.name}
                          </button>
                        </span>
                      ))}
                    </div>
                    {showAdminCreateFolder && (
                      <form onSubmit={adminCreateFolder} className="flex items-center gap-2 p-2.5 rounded-xl" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                        <Folder size={14} className="text-amber-500 flex-shrink-0" />
                        <input type="text" className="input-field py-1.5 text-sm flex-1" placeholder="Názov priečinka..."
                          value={newAdminFolderName} onChange={e => setNewAdminFolderName(e.target.value)} autoFocus maxLength={60} />
                        <button type="submit" disabled={adminFolderSaving} className="btn-primary py-1.5 px-3 text-xs">{adminFolderSaving ? '...' : 'OK'}</button>
                        <button type="button" onClick={() => setShowAdminCreateFolder(false)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ color: 'var(--text-muted)' }}><X size={13} /></button>
                      </form>
                    )}
                    {adminFolderError && <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs" style={{ background: 'rgba(200,32,10,0.1)', color: '#ef4444', border: '1px solid rgba(200,32,10,0.25)' }}><AlertCircle size={13} /> {adminFolderError}</div>}
                    <div className="flex-1 overflow-y-auto" style={{ maxHeight: '260px' }}>
                      {adminVisibleFolders.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {adminVisibleFolders.map(folder => {
                            const childCount = uploadClassFolders.filter(f => f.parent_id === folder.id).length;
                            const isSelected = uploadFolderId === folder.id;
                            return <AdminFolderCard key={folder.id} folder={folder} childCount={childCount} isSelected={isSelected} onOpen={() => adminNavigateToFolder(folder)} onDelete={() => adminDeleteFolder(folder)} />;
                          })}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8" style={{ color: 'var(--text-muted)' }}>
                          <Folder size={28} style={{ opacity: 0.3 }} className="mb-2" />
                          <p className="text-xs text-center">{adminCurrentFolder ? 'Bez podpriečinkov' : `Trieda ${uploadClass} nemá priečinky`}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Zoznam súborov */}
            <div className="card shadow-card hover:shadow-card-hover transition-all duration-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>
                  Všetky súbory
                </h3>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                  {filteredFiles.length} / {files.length}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="input-with-icon flex-1">
                  <Search size={15} className="input-icon" />
                  <input className="input-inner text-sm" placeholder="Hľadaj súbor..." value={fileSearch} onChange={e => setFileSearch(e.target.value)} />
                </div>
                <div className="input-with-icon">
                  <Filter size={15} className="input-icon" />
                  <select className="input-inner text-sm" value={fileClassFilter} onChange={e => setFileClassFilter(e.target.value)}>
                    <option value="">Všetky triedy</option>
                    {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full text-sm min-w-[440px]">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th className="text-left py-2 px-3 font-semibold text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Súbor</th>
                      <th className="text-left py-2 px-3 font-semibold text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Nahrál</th>
                      <th className="text-left py-2 px-3 font-semibold text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Trieda</th>
                      <th className="hidden sm:table-cell text-left py-2 px-3 font-semibold text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Veľkosť</th>
                      <th className="hidden md:table-cell text-left py-2 px-3 font-semibold text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Dátum</th>
                      <th className="text-left py-2 px-3"></th>
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
                        <td className="py-3 px-3 text-sm" style={{ color: 'var(--text-muted)' }}>{file.profiles?.first_name || ''} {file.profiles?.last_name || ''}</td>
                        <td className="py-3 px-3"><span className="bg-school-blue text-white text-xs px-2 py-0.5 rounded-full font-medium">{file.class}</span></td>
                        <td className="hidden sm:table-cell py-3 px-3 text-xs" style={{ color: 'var(--text-muted)' }}>{file.file_size ? formatFileSize(file.file_size) : '—'}</td>
                        <td className="hidden md:table-cell py-3 px-3 text-xs" style={{ color: 'var(--text-muted)' }}>{new Date(file.created_at).toLocaleDateString('sk-SK')}</td>
                        <td className="py-3 px-3">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={async () => {
                              const url = await getSignedUrl(file.file_name, 120);
                              if (!url) return;
                              const a = document.createElement('a');
                              a.href = url; a.download = file.original_name; a.target = '_blank';
                              document.body.appendChild(a); a.click(); document.body.removeChild(a);
                            }} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ color: 'var(--accent-link)' }}><Download size={14} /></button>
                            <button
                              onClick={() => { setCopyFileModal(file); setCopyTargetClass(''); setCopyError(''); setCopySuccess(''); }}
                              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                              style={{ color: '#10b981', background: 'rgba(5,150,105,0.1)' }}
                              title="Skopírovať do inej triedy">
                              <Copy size={13} />
                            </button>
                            <button onClick={() => deleteFile(file)} className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:text-red-600 transition-all"><Trash2 size={14} /></button>
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

        {tab === 'Oznamy' && (
          <div className="space-y-5 animate-fade-in">
            {/* Nový oznam form */}
            <div className="card shadow-card">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(168,85,247,0.12)' }}>
                  <Megaphone size={16} style={{ color: '#a855f7' }} />
                </div>
                <h3 className="font-bold" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>Nový oznam pre triedu</h3>
              </div>
              <form onSubmit={saveAnnouncement} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text)' }}>Trieda *</label>
                    <select className="input-field py-2 text-sm" value={newAnnounce.class} onChange={e => setNewAnnounce(p => ({ ...p, class: e.target.value }))} required>
                      <option value="">-- Vyber triedu --</option>
                      {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text)' }}>Farba</label>
                    <select className="input-field py-2 text-sm" value={newAnnounce.color} onChange={e => setNewAnnounce(p => ({ ...p, color: e.target.value }))}>
                      <option value="blue">🔵 Modrá (info)</option>
                      <option value="green">🟢 Zelená (ok)</option>
                      <option value="red">🔴 Červená (dôležité)</option>
                      <option value="purple">🟣 Fialová (udalosť)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text)' }}>Nadpis (voliteľné)</label>
                  <input type="text" className="input-field py-2 text-sm" placeholder="napr. Zajtra nie je škola"
                    value={newAnnounce.title} onChange={e => setNewAnnounce(p => ({ ...p, title: e.target.value }))} maxLength={80} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text)' }}>Správa *</label>
                  <textarea className="input-field py-2 text-sm resize-none" rows={3} placeholder="Text oznamu..."
                    value={newAnnounce.message} onChange={e => setNewAnnounce(p => ({ ...p, message: e.target.value }))} maxLength={500} required />
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <button type="button" onClick={() => setNewAnnounce(p => ({ ...p, active: !p.active }))}>
                      {newAnnounce.active
                        ? <ToggleRight size={24} style={{ color: '#10b981' }} />
                        : <ToggleLeft size={24} style={{ color: 'var(--text-muted)' }} />}
                    </button>
                    <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{newAnnounce.active ? 'Aktívny (viditeľný)' : 'Neaktívny (skrytý)'}</span>
                  </label>
                  <button type="submit" disabled={announceSaving}
                    className="btn-primary flex items-center gap-2 ml-auto">
                    <Plus size={15} /> {announceSaving ? 'Ukladám...' : 'Zverejniť oznam'}
                  </button>
                </div>
                {announceError && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm" style={{ background: 'rgba(200,32,10,0.1)', color: '#ef4444', border: '1px solid rgba(200,32,10,0.25)' }}>
                    <AlertCircle size={13} /> {announceError}
                  </div>
                )}
              </form>
            </div>

            {/* Zoznam oznamov */}
            <div className="card shadow-card">
              <h3 className="font-bold mb-4" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>Všetky oznamy</h3>
              {announcements.length === 0 ? (
                <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>Žiadne oznamy.</p>
              ) : (
                <div className="space-y-3">
                  {announcements.map(a => {
                    const color = a.color === 'red' ? '#ef4444' : a.color === 'green' ? '#10b981' : a.color === 'purple' ? '#a855f7' : 'var(--accent-link)';
                    const bg = a.color === 'red' ? 'rgba(220,38,38,0.08)' : a.color === 'green' ? 'rgba(5,150,105,0.08)' : a.color === 'purple' ? 'rgba(139,92,246,0.08)' : 'rgba(26,58,107,0.08)';
                    return (
                      <div key={a.id} className="flex items-start gap-3 p-4 rounded-2xl"
                        style={{ background: bg, border: `1px solid ${bg.replace('0.08', '0.25')}`, opacity: a.active ? 1 : 0.55 }}>
                        <Megaphone size={16} className="flex-shrink-0 mt-0.5" style={{ color }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: 'var(--accent-link)' }}>{a.class}</span>
                            {a.title && <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{a.title}</span>}
                            {!a.active && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>skrytý</span>}
                          </div>
                          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{a.message}</p>
                          <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>{new Date(a.created_at).toLocaleDateString('sk-SK')}</p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button onClick={() => toggleAnnouncement(a.id, !a.active)} title={a.active ? 'Skryť' : 'Zobraziť'}>
                            {a.active
                              ? <ToggleRight size={20} style={{ color: '#10b981' }} />
                              : <ToggleLeft size={20} style={{ color: 'var(--text-muted)' }} />}
                          </button>
                          <button onClick={() => deleteAnnouncement(a.id)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:text-red-600 transition-all"
                            style={{ background: 'rgba(200,32,10,0.08)' }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        <p className="text-center text-xs mt-6" style={{ color: 'var(--text-dim)' }}>© 2026 RU-MONT s. r. o., Spojená škola Sečovce</p>
      </main>
    </div>
  );
}

function AdminFolderCard({ folder, childCount, isSelected, onOpen, onDelete }) {
  return (
    <div className="group relative">
      <button onClick={onOpen} className="w-full text-left p-4 rounded-2xl border transition-all duration-200 hover:shadow-sm"
        style={{ borderColor: isSelected ? 'rgba(251,191,36,0.6)' : 'var(--border)', background: isSelected ? 'rgba(251,191,36,0.12)' : 'rgba(180,100,0,0.08)' }}>
        <div className="flex items-start justify-between mb-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(180,100,0,0.2)' }}>
            <Folder size={20} style={{ color: '#f59e0b' }} />
          </div>
          <button type="button" onClick={e => { e.stopPropagation(); onDelete(); }}
            className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 w-6 h-6 rounded-lg flex items-center justify-center text-red-400 hover:text-red-600 transition-all"
            style={{ background: 'rgba(200,32,10,0.1)' }}>
            <Trash2 size={12} />
          </button>
        </div>
        <p className="font-semibold text-sm leading-tight line-clamp-2 mb-1" style={{ color: 'var(--text)' }}>{folder.name}</p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {childCount > 0 ? `${childCount} podpriečinkov` : 'Prázdny'}
          {isSelected && <span className="ml-1 font-semibold" style={{ color: '#f59e0b' }}> ✓</span>}
        </p>
      </button>
    </div>
  );
}

function StatCard({ icon, label, value, color, hint }) {
  const colors = {
    amber: { bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.2)', icon: '#d97706' },
    blue:  { bg: 'rgba(26,58,107,0.1)',  border: 'rgba(26,58,107,0.2)',  icon: '#1A3A6B' },
    emerald:{ bg: 'rgba(5,150,105,0.1)', border: 'rgba(5,150,105,0.2)', icon: '#059669' },
    violet:{ bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.2)',icon: '#7c3aed' },
  };
  const c = colors[color] || colors.blue;
  return (
    <article className="rounded-3xl p-5 shadow-card hover:shadow-card-hover transition-all duration-150"
      style={{ background: c.bg, border: `1px solid ${c.border}` }}>
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm" style={{ background: 'var(--surface)', color: c.icon }}>{icon}</div>
        <span className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>{label}</span>
      </div>
      <p className="text-2xl sm:text-3xl font-bold truncate" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>{value}</p>
      {hint && <p className="text-xs mt-1 truncate" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
    </article>
  );
}
