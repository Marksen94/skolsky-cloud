'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase, MAX_FILE_SIZE, ALLOWED_TYPES, ALLOWED_EXTS, formatFileSize, getFileIcon, getSignedUrl } from '@/lib/supabase';
import { useDropzone } from 'react-dropzone';
import {
  Upload, LogOut, Trash2, Download, Clock, User, CloudUpload, BookOpen,
  Search, AlertCircle, FolderOpen, X, Eye, EyeOff, CheckCircle, Folder,
  ChevronRight, FolderPlus, KeyRound, UserX, ChevronDown, ZoomIn, Menu,
  Star, BarChart2, ArrowUpDown, Filter, MoveRight, Pencil, Bell,
  CheckSquare, Megaphone, History, PackageOpen, WifiOff, GripVertical,
} from 'lucide-react';
import ThemeToggle from '@/app/components/ThemeToggle';

// ─── KONŠTANTY ────────────────────────────────────────────────────────────────
const SORT_OPTIONS = [
  { value: 'date_desc', label: 'Najnovšie' },
  { value: 'date_asc', label: 'Najstaršie' },
  { value: 'name_asc', label: 'Názov A–Z' },
  { value: 'name_desc', label: 'Názov Z–A' },
  { value: 'size_desc', label: 'Veľkosť ↓' },
  { value: 'size_asc', label: 'Veľkosť ↑' },
  { value: 'author_asc', label: 'Autor A–Z' },
];

const TYPE_FILTERS = [
  { value: '', label: 'Všetky typy' },
  { value: 'pdf', label: '📕 PDF' },
  { value: 'image', label: '🖼️ Obrázky' },
  { value: 'presentation', label: '📊 PowerPoint' },
  { value: 'word', label: '📝 Word' },
  { value: 'spreadsheet', label: '📈 Excel' },
];

function matchesTypeFilter(file, typeFilter) {
  if (!typeFilter) return true;
  const t = file.file_type || '';
  if (typeFilter === 'pdf') return t.includes('pdf');
  if (typeFilter === 'image') return t.startsWith('image/');
  if (typeFilter === 'presentation') return t.includes('presentation') || t.includes('powerpoint');
  if (typeFilter === 'word') return t.includes('word') || t === 'application/msword';
  if (typeFilter === 'spreadsheet') return t.includes('excel') || t.includes('spreadsheet');
  return true;
}

function sortFiles(files, sortKey) {
  if (sortKey === 'date_desc' || sortKey === 'date_asc') {
    const withTs = files.map(f => ({ f, ts: new Date(f.created_at).getTime() }));
    withTs.sort((a, b) => sortKey === 'date_desc' ? b.ts - a.ts : a.ts - b.ts);
    return withTs.map(x => x.f);
  }
  return [...files].sort((a, b) => {
    switch (sortKey) {
      case 'name_asc':  return a.original_name.localeCompare(b.original_name, 'sk');
      case 'name_desc': return b.original_name.localeCompare(a.original_name, 'sk');
      case 'size_desc': return (b.file_size || 0) - (a.file_size || 0);
      case 'size_asc':  return (a.file_size || 0) - (b.file_size || 0);
      case 'author_asc': {
        const nameA = `${a.profiles?.first_name} ${a.profiles?.last_name}`;
        const nameB = `${b.profiles?.first_name} ${b.profiles?.last_name}`;
        return nameA.localeCompare(nameB, 'sk');
      }
      default: return 0;
    }
  });
}

// ─── HLAVNÁ STRÁNKA ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [files, setFiles] = useState([]);
  const [allFiles, setAllFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const searchDebounceRef = useRef(null);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });

  const userMenuRef = useRef(null);
  const userMenuBtnRef = useRef(null);
  const messageTimeoutsRef = useRef({});

  // ─── Školský rok ───
  const schoolYearEndBanner = useMemo(() => {
    const now = new Date();
    const year = now.getMonth() >= 8 ? now.getFullYear() + 1 : now.getFullYear();
    const endDate = new Date(year, 7, 31); // 31. august
    const diffMs = endDate - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays > 30 || diffDays < 0) return null;
    return diffDays;
  }, []);

  // ─── Modaly / panely ───
  const [showProfile, setShowProfile] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showDeleteRequest, setShowDeleteRequest] = useState(false);
  const [deleteRequestSent, setDeleteRequestSent] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ─── Heslo ───
  const [editPw, setEditPw] = useState('');
  const [editPwConfirm, setEditPwConfirm] = useState('');
  const [currentPw, setCurrentPw] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  // ─── Priečinky ───
  const [folders, setFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [folderPath, setFolderPath] = useState([]);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [folderSaving, setFolderSaving] = useState(false);
  const [folderError, setFolderError] = useState('');

  // ─── Premenovanie priečinka ───
  const [renamingFolder, setRenamingFolder] = useState(null); // { id, name }
  const [renameFolderName, setRenameFolderName] = useState('');
  const [renameFolderSaving, setRenameFolderSaving] = useState(false);
  const [renameFolderError, setRenameFolderError] = useState('');

  // ─── Presun súboru ───
  const [moveFileModal, setMoveFileModal] = useState(null); // file object
  const [moveTargetFolderId, setMoveTargetFolderId] = useState('');
  const [moveSaving, setMoveSaving] = useState(false);
  const [moveError, setMoveError] = useState('');

  // ─── Obľúbené ───
  const [favorites, setFavorites] = useState([]);
  const [showFavorites, setShowFavorites] = useState(false);

  // ─── Notifikácie ───
  const [notifCount, setNotifCount] = useState(0);
  const [lastSeenAt, setLastSeenAt] = useState(null);

  // ─── Zoraďovanie a filtrovanie ───
  const [sortKey, setSortKey] = useState('date_desc');
  const [typeFilter, setTypeFilter] = useState('');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const sortMenuRef = useRef(null);
  const typeMenuRef = useRef(null);

  // ─── Bulk akcie ───
  const [bulkSelected, setBulkSelected] = useState(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkDownloading, setBulkDownloading] = useState(false);

  // ─── Lightbox ───
  const [lightboxFile, setLightboxFile] = useState(null);

  // ─── Naposledy zobrazené ───
  const [recentFiles, setRecentFiles] = useState([]);

  // ─── Oznamovacia tabuľa ───
  const [announcement, setAnnouncement] = useState(null);
  const [announcementDismissed, setAnnouncementDismissed] = useState(false);

  // ─── Drag & drop na priečinok ───
  const [dragOverFolderId, setDragOverFolderId] = useState(null);
  const [draggingFileId, setDraggingFileId] = useState(null);

  // ─── Paginacia ───
  const [selectedFiles, setSelectedFiles] = useState([]); // upload front
  const [fileLimit, setFileLimit] = useState(20);
  const [hasMoreFiles, setHasMoreFiles] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [deletingFolder, setDeletingFolder] = useState(false);

  // ─── Confirm modal ───
  const [confirmModal, setConfirmModal] = useState(null);
  function askConfirm({ title, message, danger = true, onConfirm }) {
    setConfirmModal({ title, message, danger, onConfirm });
  }

  // ─── Online/offline ───
  const [isOnline, setIsOnline] = useState(true);

  // ─── Spotlight search (Cmd/Ctrl+K) ───
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [spotlightQuery, setSpotlightQuery] = useState('');
  const spotlightInputRef = useRef(null);

  // ─── ZIP download ───
  const [folderZipping, setFolderZipping] = useState(null); // folder.id

  // ─── Poradie priečinkov (drag & drop reorder) ───
  const [folderOrderMap, setFolderOrderMap] = useState({});
  const [draggingFolderId, setDraggingFolderId] = useState(null);
  const [folderReorderOver, setFolderReorderOver] = useState(null);

  // ══════════════════════════════════════════════════════════
  // COMPUTED – filtrovanie + zoraďovanie
  // ══════════════════════════════════════════════════════════
  const globalSearch = search.trim().length > 0;

  function handleSearchInput(val) {
    setSearchInput(val);
    if (val) setShowFavorites(false);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => setSearch(val), 300);
  }

  const filteredFiles = useMemo(() => {
    let base;
    if (showFavorites) {
      base = allFiles.filter(f => favorites.includes(f.id));
    } else if (globalSearch) {
      base = allFiles.filter(f =>
        f.original_name.toLowerCase().includes(search.toLowerCase()) ||
        (f.description || '').toLowerCase().includes(search.toLowerCase()) ||
        (`${f.profiles?.first_name} ${f.profiles?.last_name}`).toLowerCase().includes(search.toLowerCase())
      );
    } else {
      base = files.filter(f => (f.folder_id || null) === (currentFolder ? currentFolder.id : null));
    }
    if (typeFilter) base = base.filter(f => matchesTypeFilter(f, typeFilter));
    return sortFiles(base, sortKey);
  }, [showFavorites, globalSearch, search, files, allFiles, currentFolder, typeFilter, sortKey, favorites]);

  // ══════════════════════════════════════════════════════════
  // SPOTLIGHT – výsledky hľadania Cmd+K
  // ══════════════════════════════════════════════════════════
  const spotlightResults = useMemo(() => {
    if (!spotlightQuery.trim()) return [];
    const q = spotlightQuery.toLowerCase();
    return allFiles.filter(f =>
      f.original_name.toLowerCase().includes(q) ||
      (f.description || '').toLowerCase().includes(q) ||
      (`${f.profiles?.first_name || ''} ${f.profiles?.last_name || ''}`).toLowerCase().includes(q)
    ).slice(0, 8);
  }, [allFiles, spotlightQuery]);

  // ══════════════════════════════════════════════════════════
  // PORADIE PRIEČINKOV
  // ══════════════════════════════════════════════════════════
  function getFolderOrderKey(parentId) { return parentId ? `f_${parentId}` : 'root'; }

  function getOrderedFolders(list, parentId) {
    const order = folderOrderMap[getFolderOrderKey(parentId)];
    if (!order || !order.length) return list;
    return [...list].sort((a, b) => {
      const ia = order.indexOf(a.id); const ib = order.indexOf(b.id);
      if (ia === -1 && ib === -1) return 0;
      if (ia === -1) return 1; if (ib === -1) return -1;
      return ia - ib;
    });
  }

  function saveFolderOrder(parentId, orderedIds) {
    const key = getFolderOrderKey(parentId);
    const newMap = { ...folderOrderMap, [key]: orderedIds };
    setFolderOrderMap(newMap);
    try { if (profile?.id) localStorage.setItem(`sc_folder_order_${profile.id}`, JSON.stringify(newMap)); } catch {}
  }

  // Vyčistí záznamy pre priečinky, ktoré už neexistujú (napr. boli zmazané) —
  // bez tohto by sc_folder_order_* v localStorage rástol neobmedzene.
  function pruneFolderOrderMap(map, folderList) {
    const existingIds = new Set(folderList.map(f => f.id));
    let changed = false;
    const pruned = {};
    for (const [key, ids] of Object.entries(map)) {
      // Klúč 'f_<id>' patrí priečinku — ak ten priečinok už neexistuje, celý záznam zahodíme
      if (key !== 'root' && !existingIds.has(key.slice(2))) { changed = true; continue; }
      const filteredIds = Array.isArray(ids) ? ids.filter(id => existingIds.has(id)) : [];
      if (!Array.isArray(ids) || filteredIds.length !== ids.length) changed = true;
      if (filteredIds.length > 0) pruned[key] = filteredIds;
      else changed = true;
    }
    return { pruned, changed };
  }

  function onFolderDragStart(folderId, e) {
    e.dataTransfer.setData('dragType', 'folder');
    e.dataTransfer.effectAllowed = 'move';
    setDraggingFolderId(folderId);
    setDraggingFileId(null); // zabráni kolizi s file drag
  }

  function onFolderDragEnd() {
    setDraggingFolderId(null);
    setFolderReorderOver(null);
  }

  function onFolderDragOverReorder(targetFolderId, e) {
    if (!draggingFolderId) return; // je to file drag, nie folder reorder
    e.preventDefault();
    e.stopPropagation();
    setFolderReorderOver(targetFolderId);
    setDragOverFolderId(null); // vypni file-drop highlight
  }

  function onFolderDropReorder(targetFolderId) {
    if (!draggingFolderId || draggingFolderId === targetFolderId) {
      setFolderReorderOver(null); setDraggingFolderId(null); return;
    }
    const parentId = currentFolder ? currentFolder.id : null;
    const raw = folders.filter(f => (f.parent_id || null) === (parentId || null));
    const current = getOrderedFolders(raw, parentId);
    const fromIdx = current.findIndex(f => f.id === draggingFolderId);
    const toIdx = current.findIndex(f => f.id === targetFolderId);
    if (fromIdx === -1 || toIdx === -1) { setFolderReorderOver(null); setDraggingFolderId(null); return; }
    const reordered = [...current];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    saveFolderOrder(parentId, reordered.map(f => f.id));
    setFolderReorderOver(null); setDraggingFolderId(null);
  }

  // Po načítaní/zmene priečinkov vyčistí staré záznamy poradia v localStorage
  // (zmazané priečinky), aby sc_folder_order_* nerástol neobmedzene.
  useEffect(() => {
    if (!profile?.id) return;
    if (Object.keys(folderOrderMap).length === 0) return;
    const { pruned, changed } = pruneFolderOrderMap(folderOrderMap, folders);
    if (changed) {
      setFolderOrderMap(pruned);
      try { localStorage.setItem(`sc_folder_order_${profile.id}`, JSON.stringify(pruned)); } catch {}
    }
  }, [folders, profile?.id, folderOrderMap]);

  // ══════════════════════════════════════════════════════════
  // ZIP SŤAHOVANIE PRIEČINKA
  // ══════════════════════════════════════════════════════════
  async function downloadFolderAsZip(folder) {
    setFolderZipping(folder.id);
    try {
      const getAllDescendantIds = (fId) => {
        const ids = [fId];
        folders.filter(f => f.parent_id === fId).forEach(child => ids.push(...getAllDescendantIds(child.id)));
        return ids;
      };
      const folderIds = getAllDescendantIds(folder.id);
      const filesToZip = allFiles.filter(f => folderIds.includes(f.folder_id));
      if (filesToZip.length === 0) {
        askConfirm({ title: 'Prázdny priečinok', message: 'Priečinok neobsahuje žiadne súbory.', danger: false, onConfirm: () => {} });
        return;
      }
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      for (const file of filesToZip) {
        const url = await getSignedUrl(file.file_name, 120);
        if (!url) continue;
        try {
          const resp = await fetch(url);
          if (!resp.ok) continue;
          const blob = await resp.blob();
          zip.file(file.original_name, blob);
        } catch {}
      }
      const content = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
      const objUrl = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = objUrl; a.download = `${folder.name.replace(/[\/\\:*?"<>|]/g, '_')}.zip`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(objUrl);
    } catch (err) {
      askConfirm({ title: 'Chyba', message: 'ZIP sa nepodarilo vytvoriť: ' + err.message, danger: false, onConfirm: () => {} });
    } finally {
      setFolderZipping(null);
    }
  }

  // ══════════════════════════════════════════════════════════
  // NOTIFIKÁCIE – real-time cez Supabase channel
  // ══════════════════════════════════════════════════════════
  useEffect(() => {
    if (!profile) return;
    // Počet nových súborov od posledného navštívenia
    if (lastSeenAt) {
      const count = allFiles.filter(f =>
        f.uploaded_by !== profile.id &&
        new Date(f.created_at) > new Date(lastSeenAt)
      ).length;
      setNotifCount(count);
    }
  }, [allFiles, profile, lastSeenAt]);

  useEffect(() => {
    if (!profile) return;
    const channel = supabase
      .channel(`class-files-${profile.class}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'files',
        filter: `class=eq.${profile.class}`,
      }, async payload => {
        if (payload.new.uploaded_by !== profile.id) {
          // Načítame profil nahrávača aby sa zobrazilo meno
          const { data: authorProfile } = await supabase
            .from('profiles').select('first_name, last_name').eq('id', payload.new.uploaded_by).single();
          const newFile = { ...payload.new, profiles: authorProfile || null };
          setNotifCount(prev => prev + 1);
          setAllFiles(prev => [newFile, ...prev]);
          setFiles(prev => [newFile, ...prev]);
        }
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [profile]);

  function markNotifSeen() {
    const now = new Date().toISOString();
    setLastSeenAt(now);
    setNotifCount(0);
    try { if (profile?.id) localStorage.setItem(`sc_last_seen_${profile.id}`, now); } catch {}
  }

  // ══════════════════════════════════════════════════════════
  // OBĽÚBENÉ
  // ══════════════════════════════════════════════════════════
  function toggleFavorite(fileId) {
    setFavorites(prev => {
      const next = prev.includes(fileId)
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId];
      try { if (profile?.id) localStorage.setItem(`sc_favorites_${profile.id}`, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  // ══════════════════════════════════════════════════════════
  // BULK AKCIE
  // ══════════════════════════════════════════════════════════

  // Keď user prepne na obľúbené/vyhľadávanie, vypneme bulk mode
  function toggleFavoritesView() {
    setShowFavorites(v => !v);
    setSearch('');
    setSearchInput('');
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    setBulkSelected(new Set());
    setBulkMode(false);
  }

  function toggleBulkSelect(fileId) {
    setBulkSelected(prev => {
      const next = new Set(prev);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
  }

  function selectAllVisible() {
    setBulkSelected(new Set(filteredFiles.map(f => f.id)));
  }

  function clearBulkSelection() {
    setBulkSelected(new Set());
    setBulkMode(false);
  }

  async function bulkDownload() {
    if (bulkSelected.size === 0) return;
    setBulkDownloading(true);
    // Použijeme filteredFiles ako zdroj — obsahuje len aktuálne viditeľné súbory
    const toDownload = filteredFiles.filter(f => bulkSelected.has(f.id));
    for (const file of toDownload) {
      try {
        const url = await getSignedUrl(file.file_name, 120);
        if (!url) continue;
        await new Promise(res => setTimeout(res, 300)); // throttle
        const a = document.createElement('a');
        a.href = url; a.download = file.original_name; a.target = '_blank';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
      } catch {}
    }
    setBulkDownloading(false);
  }

  function bulkDelete() {
    const toDelete = allFiles.filter(f => bulkSelected.has(f.id) && f.uploaded_by === profile.id);
    const notOwned = bulkSelected.size - toDelete.length;
    if (toDelete.length === 0) {
      askConfirm({ title: 'Chyba', message: 'Môžeš vymazať iba vlastné súbory.', danger: false, onConfirm: () => {} });
      return;
    }
    askConfirm({
      title: `Vymazať ${toDelete.length} súbor${toDelete.length > 1 ? 'ov' : ''}?`,
      message: `${toDelete.length} súbor${toDelete.length > 1 ? 'ov' : ''} bude natrvalo vymazaných.${notOwned > 0 ? ` (${notOwned} cudzie súbory preskočené)` : ''}`,
      onConfirm: async () => {
        const failed = [];
        const deleted = [];
        for (const file of toDelete) {
          try {
            await supabase.storage.from('class-files').remove([file.file_name]);
            const { error: dbErr } = await supabase.from('files').delete().eq('id', file.id);
            if (dbErr) throw dbErr;
            deleted.push(file.id);
          } catch { failed.push(file.original_name); }
        }
        const ids = new Set(deleted);
        setFiles(prev => prev.filter(f => !ids.has(f.id)));
        setAllFiles(prev => prev.filter(f => !ids.has(f.id)));
        clearBulkSelection();
        if (failed.length > 0) askConfirm({ title: 'Chyba', message: `${failed.length} súbor${failed.length > 1 ? 'y' : ''} sa nepodarilo vymazať.`, danger: false, onConfirm: () => {} });
      },
    });
  }

  // ══════════════════════════════════════════════════════════
  // PRESUN SÚBORU
  // ══════════════════════════════════════════════════════════
  async function moveFile() {
    if (!moveFileModal) return;
    setMoveSaving(true); setMoveError('');
    try {
      const newFolderId = moveTargetFolderId === '__root__' ? null : (moveTargetFolderId || null);
      const { error } = await supabase.from('files')
        .update({ folder_id: newFolderId })
        .eq('id', moveFileModal.id);
      if (error) throw error;
      setFiles(prev => prev.map(f => f.id === moveFileModal.id ? { ...f, folder_id: newFolderId } : f));
      setAllFiles(prev => prev.map(f => f.id === moveFileModal.id ? { ...f, folder_id: newFolderId } : f));
      setMoveFileModal(null);
    } catch (err) {
      setMoveError('Chyba: ' + err.message);
    } finally {
      setMoveSaving(false);
    }
  }

  // ══════════════════════════════════════════════════════════
  // PREMENOVANIE PRIEČINKA
  // ══════════════════════════════════════════════════════════
  async function saveRenameFolder(e) {
    e.preventDefault();
    if (!renameFolderName.trim() || !renamingFolder) return;
    setRenameFolderSaving(true); setRenameFolderError('');
    try {
      const { error } = await supabase.from('folders')
        .update({ name: renameFolderName.trim().slice(0, 60) })
        .eq('id', renamingFolder.id);
      if (error) throw error;
      setFolders(prev => prev.map(f => f.id === renamingFolder.id ? { ...f, name: renameFolderName.trim() } : f));
      // Update folderPath ak sme v tomto priečinku
      setFolderPath(prev => prev.map(f => f.id === renamingFolder.id ? { ...f, name: renameFolderName.trim() } : f));
      if (currentFolder?.id === renamingFolder.id) {
        setCurrentFolder(prev => ({ ...prev, name: renameFolderName.trim() }));
      }
      setRenamingFolder(null);
    } catch (err) {
      setRenameFolderError('Chyba: ' + err.message);
    } finally {
      setRenameFolderSaving(false);
    }
  }

  // ══════════════════════════════════════════════════════════
  // ZATVÁRANIE DROPDOWNOV KLIKNUTÍM VON
  // ══════════════════════════════════════════════════════════
  useEffect(() => {
    function handle(e) {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target)) setShowSortMenu(false);
      if (typeMenuRef.current && !typeMenuRef.current.contains(e.target)) setShowTypeMenu(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
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

  useEffect(() => {
    return () => {
      if (messageTimeoutsRef.current.error) clearTimeout(messageTimeoutsRef.current.error);
      if (messageTimeoutsRef.current.success) clearTimeout(messageTimeoutsRef.current.success);
    };
  }, []);

  useEffect(() => { loadUser(); }, []);

  // Per-uzivatelske localStorage data (oblubene, naposledy zobrazene,
  // notifikacie, poradie priecinkov) — namespace podla profile.id,
  // aby sa nezdielali medzi ziakmi na jednom (skolskom) PC.
  useEffect(() => {
    if (!profile?.id) return;
    try { setFavorites(JSON.parse(localStorage.getItem(`sc_favorites_${profile.id}`) || '[]')); } catch {}
    try { setLastSeenAt(localStorage.getItem(`sc_last_seen_${profile.id}`) || null); } catch {}
    try { setRecentFiles(JSON.parse(localStorage.getItem(`sc_recent_${profile.id}`) || '[]')); } catch {}
    try { setFolderOrderMap(JSON.parse(localStorage.getItem(`sc_folder_order_${profile.id}`) || '{}')); } catch {}
  }, [profile?.id]);

  // Online/offline detekčcia
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsOnline(navigator.onLine);
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);

  // Cmd/Ctrl+K – spotlight search
  useEffect(() => {
    function handleKeydown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSpotlightOpen(v => { if (!v) setSpotlightQuery(''); return !v; });
      }
      if (e.key === 'Escape') setSpotlightOpen(false);
    }
    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, []);

  // Načítaj oznam pre danú triedu
  useEffect(() => {
    if (!profile) return;
    async function loadAnnouncement() {
      const { data } = await supabase
        .from('announcements')
        .select('*')
        .eq('class', profile.class)
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) setAnnouncement(data);
    }
    loadAnnouncement();
    // Real-time update
    const ch = supabase.channel(`announce-${profile.class}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements', filter: `class=eq.${profile.class}` }, () => {
        loadAnnouncement();
      }).subscribe();
    return () => supabase.removeChannel(ch);
  }, [profile]);

  useEffect(() => {
    const isOverlayOpen = !!(
      mobileMenuOpen || lightboxFile || showProfile || confirmModal ||
      showDeleteRequest || renamingFolder || moveFileModal || deletingFolder || spotlightOpen
    );
    document.body.style.overflow = isOverlayOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen, lightboxFile, showProfile, confirmModal, showDeleteRequest, renamingFolder, moveFileModal, deletingFolder, spotlightOpen]);

  // Escape pre lightbox
  useEffect(() => {
    if (!lightboxFile) return;
    function onKey(e) { if (e.key === 'Escape') setLightboxFile(null); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [lightboxFile]);

  // ══════════════════════════════════════════════════════════
  // NAČÍTANIE DÁT
  // ══════════════════════════════════════════════════════════
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
      const [pagedRes, allFilesRes, foldersRes] = await Promise.all([
        supabase.from('files')
          .select(`*, profiles(first_name, last_name)`, { count: 'exact' })
          .eq('class', className).order('created_at', { ascending: false }).range(0, limit - 1),
        supabase.from('files')
          .select(`*, profiles(first_name, last_name)`)
          .eq('class', className).order('created_at', { ascending: false }),
        supabase.from('folders')
          .select('*').eq('class', className).order('name', { ascending: true }),
      ]);
      if (pagedRes.error) throw pagedRes.error;
      if (allFilesRes.error) throw allFilesRes.error;
      if (foldersRes.error) throw foldersRes.error;
      setFiles(pagedRes.data || []);
      setAllFiles(allFilesRes.data || []);
      setHasMoreFiles((pagedRes.count || 0) > limit);
      setFolders(foldersRes.data || []);
    } catch (err) {
      console.error('Error loading files:', err);
    }
  }

  // Po úspechné upload/mazání aktualizuj lokálne bez full-reload
  function addFileLocally(newFile) {
    setAllFiles(prev => [newFile, ...prev]);
    setFiles(prev => [newFile, ...prev]);
  }
  function removeFileLocally(fileId) {
    setFiles(prev => prev.filter(f => f.id !== fileId));
    setAllFiles(prev => prev.filter(f => f.id !== fileId));
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
      setAllFiles(filesData || []);
      setHasMoreFiles((count || 0) > newLimit);
      setFileLimit(newLimit);
    } catch (err) {
      console.error('Error loading more files:', err);
    } finally {
      setLoadingMore(false);
    }
  }

  // ══════════════════════════════════════════════════════════
  // PRIEČINKY
  // ══════════════════════════════════════════════════════════
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
    if (folderPath.length >= 3) { setFolderError('Max 3 úrovne priečinkov.'); return; }
    setFolderSaving(true); setFolderError('');
    try {
      const { error } = await supabase.from('folders').insert({
        name: newFolderName.trim().slice(0, 60), class: profile.class,
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
        setDeletingFolder(true);
        try {
          const { data: allFoldersData, error: foldersErr } = await supabase.from('folders').select('id, parent_id').eq('class', profile.class);
          if (foldersErr) throw foldersErr;
          const getDescendantIds = (folderId, list, visited = new Set()) => {
            if (visited.has(folderId)) return [];
            visited.add(folderId);
            let ids = [folderId];
            for (const f of list.filter(f => f.parent_id === folderId)) ids = [...ids, ...getDescendantIds(f.id, list, visited)];
            return ids;
          };
          const folderIdsToDelete = getDescendantIds(folder.id, allFoldersData || []);
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
            const parentFolder = folder.parent_id ? folders.find(f => f.id === folder.parent_id) : null;
            navigateToFolder(parentFolder || null);
          }
          await loadFiles(profile.class);
        } catch (err) {
          askConfirm({ title: 'Chyba', message: err.message, danger: false, onConfirm: () => {} });
        } finally { setDeletingFolder(false); }
      },
    });
  }

  // ══════════════════════════════════════════════════════════
  // PROFIL / HESLO
  // ══════════════════════════════════════════════════════════
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
      // Overenie starého hesla bez nahradzania session: re-signIn môže prepísať tokeny
      // a spustiť nekonžistený stav. Používame pomocný jednorazový klient.
      const { createClient } = await import('@supabase/supabase-js');
      const tempClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        { auth: { persistSession: false } }
      );
      const { error: verifyErr } = await tempClient.auth.signInWithPassword({ email: session.user.email, password: currentPw });
      if (verifyErr) { setProfileError('Aktuálne heslo je nesprávne.'); setProfileSaving(false); return; }
      const { error: pwErr } = await supabase.auth.updateUser({ password: editPw });
      if (pwErr) { setProfileError('Heslo sa nepodarilo zmeniť: ' + pwErr.message); setProfileSaving(false); return; }
      setCurrentPw(''); setEditPw(''); setEditPwConfirm('');
      setProfileSuccess('Heslo bolo úspešne zmenené!');
    } catch (err) {
      console.error(err);
      setProfileError('Nastala neočakávaná chyba.');
    } finally { setProfileSaving(false); }
  }

  async function requestDeletion() {
    try {
      const { error } = await supabase.from('profiles').update({ deletion_requested: true }).eq('id', profile.id);
      if (error) throw error;
      setDeleteRequestSent(true);
    } catch (err) {
      askConfirm({ title: 'Chyba', message: 'Nepodarilo sa odoslať žiadosť: ' + err.message, danger: false, onConfirm: () => {} });
    }
  }

  function openProfile() {
    setShowUserMenu(false); setEditPw(''); setEditPwConfirm(''); setCurrentPw('');
    setProfileError(''); setProfileSuccess('');
    setShowCurrentPw(false); setShowNewPw(false); setShowConfirmPw(false);
    setShowProfile(true);
  }

  // ══════════════════════════════════════════════════════════
  // UPLOAD
  // ══════════════════════════════════════════════════════════
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
      return [...prev, ...accepted.filter(f => !existingNames.includes(f.name))];
    });
  }, []);

  const handleUpload = useCallback(async () => {
    if (selectedFiles.length === 0 || uploading) return;
    setUploadError(''); setUploadSuccess('');
    setUploading(true);

    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const { count: todayCount, error: countErr } = await supabase
      .from('files').select('id', { count: 'exact', head: true })
      .eq('uploaded_by', profile.id).gte('created_at', startOfDay.toISOString());
    if (countErr) { setUploadError('Chyba pri kontrole denného limitu.'); setUploading(false); return; }
    if (todayCount + selectedFiles.length > 20) {
      setUploadError(`Denný limit 20 súborov by bol prekročený. Môžeš nahrať ešte ${Math.max(0, 20 - todayCount)} súborov.`);
      setUploading(false); return;
    }

    let successCount = 0;
    const errors = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      // Nastav progress pred začiatkom uploadu tohto súboru (nie počečas)
      setUploadProgress({ current: i, total: selectedFiles.length });
      const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
      if (!ALLOWED_TYPES.includes(file.type) || !ALLOWED_EXTS.includes(fileExt)) { errors.push(`${file.name}: Nepovolený typ.`); continue; }
      const safeOrigName = file.name.slice(0, 200);
      const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const path = `${profile.class}/${safeName}`;
      const { error: uploadErr } = await supabase.storage.from('class-files').upload(path, file, { cacheControl: '3600', upsert: false });
      if (uploadErr) { errors.push(`${file.name}: ${uploadErr.message}`); continue; }
      setUploadProgress({ current: i + 1, total: selectedFiles.length }); // file nahratý
      const { data: inserted, error: dbErr } = await supabase.from('files').insert({
        uploaded_by: profile.id, class: profile.class, file_name: path,
        original_name: safeOrigName, file_url: path, file_type: file.type, file_size: file.size,
        description: null, folder_id: currentFolder ? currentFolder.id : null,
      }).select(`*, profiles(first_name, last_name)`).single();
      if (dbErr) { await supabase.storage.from('class-files').remove([path]); errors.push(`${file.name}: ${dbErr.message}`); continue; }
      // Lokálny update bez full-reload — rýchlejšie a bez bliknutia
      if (inserted) addFileLocally(inserted);
      successCount++;
    }

    setSelectedFiles([]); setUploading(false); setUploadProgress({ current: 0, total: 0 });

    if (errors.length > 0) {
      setUploadError('Chyba: ' + errors.join(' | '));
      if (messageTimeoutsRef.current.error) clearTimeout(messageTimeoutsRef.current.error);
      messageTimeoutsRef.current.error = setTimeout(() => setUploadError(''), 5000);
    }
    if (successCount > 0) {
      setUploadSuccess(successCount === 1 ? 'Súbor bol úspešne nahraný!' : `${successCount} súborov bolo nahraných!`);
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

  // ══════════════════════════════════════════════════════════
  // VYMAZANIE SÚBORU
  // ══════════════════════════════════════════════════════════
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
          askConfirm({ title: 'Chyba', message: 'Súbor sa nepodarilo vymazať: ' + err.message, danger: false, onConfirm: () => {} });
        }
      },
    });
  }

  // ══════════════════════════════════════════════════════════
  // DOWNLOAD
  // ══════════════════════════════════════════════════════════
  async function downloadFile(file) {
    try {
      const url = await getSignedUrl(file.file_name, 120);
      if (!url) return;
      const a = document.createElement('a');
      a.href = url; a.download = file.original_name; a.target = '_blank';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } catch (err) { console.error('Error downloading file:', err); }
  }

  async function openLightbox(file) {
    try {
      const signedUrl = await getSignedUrl(file.file_name, 600);
      if (!signedUrl) { askConfirm({ title: 'Chyba', message: 'URL sa nepodarilo vygenerovať.', danger: false, onConfirm: () => {} }); return; }
      setLightboxFile({ ...file, signedUrl });
      // Pridaj do naposledy zobrazených
      setRecentFiles(prev => {
        const filtered = prev.filter(f => f.id !== file.id);
        const next = [{ id: file.id, original_name: file.original_name, file_type: file.file_type, seenAt: new Date().toISOString() }, ...filtered].slice(0, 8);
        try { if (profile?.id) localStorage.setItem(`sc_recent_${profile.id}`, JSON.stringify(next)); } catch {}
        return next;
      });
    } catch (err) {
      askConfirm({ title: 'Chyba', message: 'Náhľad sa nepodarilo načítať: ' + err.message, danger: false, onConfirm: () => {} });
    }
  }

  // ══════════════════════════════════════════════════════════
  // DRAG & DROP NA PRIEČINOK
  // ══════════════════════════════════════════════════════════
  function onFileDragStart(fileId) {
    setDraggingFileId(fileId);
  }

  function onFileDragEnd() {
    setDraggingFileId(null);
    setDragOverFolderId(null);
  }

  async function onDropOnFolder(folderId) {
    if (!draggingFileId) return;
    setDragOverFolderId(null);
    setDraggingFileId(null);
    const file = allFiles.find(f => f.id === draggingFileId);
    if (!file || file.folder_id === folderId) return;
    try {
      const { error } = await supabase.from('files').update({ folder_id: folderId }).eq('id', draggingFileId);
      if (error) throw error;
      setFiles(prev => prev.map(f => f.id === draggingFileId ? { ...f, folder_id: folderId } : f));
      setAllFiles(prev => prev.map(f => f.id === draggingFileId ? { ...f, folder_id: folderId } : f));
    } catch (err) {
      askConfirm({ title: 'Chyba', message: 'Presun zlyhal: ' + err.message, danger: false, onConfirm: () => {} });
    }
  }

  // ══════════════════════════════════════════════════════════
  // ŠTATISTIKY – upload chart za 30 dní
  // ══════════════════════════════════════════════════════════
  const statsData = useMemo(() => {
    if (!allFiles.length) return { days: [], topUploaders: [] };
    const now = new Date();
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const count = allFiles.filter(f => f.created_at.slice(0, 10) === key).length;
      days.push({ key, label: `${d.getDate()}.${d.getMonth() + 1}.`, count });
    }
    const uploaderMap = {};
    for (const f of allFiles) {
      const name = `${f.profiles?.first_name || ''} ${f.profiles?.last_name || ''}`.trim() || 'Neznámy';
      uploaderMap[name] = (uploaderMap[name] || 0) + 1;
    }
    const topUploaders = Object.entries(uploaderMap)
      .sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([name, count]) => ({ name, count }));
    return { days, topUploaders };
  }, [allFiles]);

  // ══════════════════════════════════════════════════════════
  // COMPUTED
  // ══════════════════════════════════════════════════════════
  const currentFolderId = currentFolder ? currentFolder.id : null;
  const visibleFolders = (globalSearch || showFavorites) ? [] : folders.filter(f => (f.parent_id || null) === currentFolderId);

  // ══════════════════════════════════════════════════════════
  // LOADING
  // ══════════════════════════════════════════════════════════
  if (loading) return <DashboardSkeleton />;

  // ══════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>

      {/* ── LIGHTBOX ──────────────────────────────────────── */}
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
          {lightboxFile.file_type?.startsWith('image/') ? (
            <img src={lightboxFile.signedUrl} alt={lightboxFile.original_name}
              onClick={e => e.stopPropagation()}
              className="animate-fade-in"
              style={{ maxWidth: '92vw', maxHeight: '86vh', objectFit: 'contain', borderRadius: '12px', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }} />
          ) : lightboxFile.file_type?.includes('pdf') ? (
            <div onClick={e => e.stopPropagation()}
              style={{ width: 'min(92vw, 900px)', height: '86vh', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
              <iframe src={lightboxFile.signedUrl + '#toolbar=1&navpanes=0'}
                title={lightboxFile.original_name}
                style={{ width: '100%', height: '100%', border: 'none', background: 'white' }} />
            </div>
          ) : (
            <div onClick={e => e.stopPropagation()}
              className="flex flex-col items-center justify-center gap-4 p-10 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}>
              <span className="text-6xl">{getFileIcon(lightboxFile.file_type)}</span>
              <p className="text-white font-semibold">{lightboxFile.original_name}</p>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>Náhľad nie je dostupný — stiahni súbor</p>
            </div>
          )}
          <a href={lightboxFile.signedUrl} download={lightboxFile.original_name} target="_blank" rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold text-white"
            style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}>
            <Download size={15} /> Stiahnuť
          </a>
          <p className="absolute bottom-5 right-5 text-xs hidden sm:block" style={{ color: 'rgba(255,255,255,0.4)' }}>Esc alebo klikni mimo pre zatvorenie</p>
          <p className="absolute bottom-5 right-5 text-xs sm:hidden" style={{ color: 'rgba(255,255,255,0.4)' }}>Klikni mimo pre zatvorenie</p>
        </div>
      )}

      {/* ── MOBILE MENU ───────────────────────────────────── */}
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
            <button onClick={() => { setMobileMenuOpen(false); setShowStats(true); }}
              className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left font-semibold text-white"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <BarChart2 size={18} style={{ color: '#a855f7' }} /> Štatistiky triedy
            </button>
            <button onClick={() => { setMobileMenuOpen(false); openProfile(); }}
              className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left font-semibold text-white"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <KeyRound size={18} style={{ color: 'var(--accent-link)' }} /> Zmena hesla
            </button>
            <button onClick={() => { setMobileMenuOpen(false); setShowDeleteRequest(true); }}
              className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left font-semibold"
              style={{ background: 'rgba(200,32,10,0.1)', border: '1px solid rgba(200,32,10,0.2)', color: '#ef4444' }}>
              <UserX size={18} /> Zrušenie účtu
            </button>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', margin: '8px 0' }} />
            {/* Theme toggle riadok */}
            <div className="flex items-center justify-between px-4 py-3 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <span className="font-semibold text-white text-sm">Tmavý režim</span>
              <ThemeToggle />
            </div>
            <button onClick={async () => { setMobileMenuOpen(false); await supabase.auth.signOut(); router.push('/'); }}
              className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left font-semibold text-white"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <LogOut size={18} style={{ color: 'rgba(255,255,255,0.6)' }} /> Odhlásiť
            </button>
          </div>
        </div>
      )}

      {/* ── CONFIRM MODAL ─────────────────────────────────── */}
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
                <button onClick={() => setConfirmModal(null)} className="w-full py-2.5 rounded-xl font-semibold text-sm"
                  style={{ background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)' }}>
                  Zatvoriť
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── ZRUŠENIE ÚČTU MODAL ───────────────────────────── */}
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
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Správca školy dostane tvoju žiadosť a rozhodne o nej čo najskôr.</p>
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

      {/* ── PROFIL MODAL ──────────────────────────────────── */}
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
                <h2 className="text-xl font-bold" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>Môj profil</h2>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Trieda {profile?.class}</p>
              </div>
            </div>
            <form onSubmit={saveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Meno</label>
                  <input type="text" className="input-field" value={profile?.first_name || ''} disabled />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Priezvisko</label>
                  <input type="text" className="input-field" value={profile?.last_name || ''} disabled />
                </div>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Meno môže zmeniť iba správca školy.</p>
              <div className="border-t pt-3 space-y-3" style={{ borderColor: 'var(--border)' }}>
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Zmena hesla</p>
                {[
                  { label: 'Aktuálne heslo', val: currentPw, set: setCurrentPw, show: showCurrentPw, toggle: () => setShowCurrentPw(v => !v), ac: 'current-password', ph: 'vaše aktuálne heslo' },
                  { label: 'Nové heslo', val: editPw, set: setEditPw, show: showNewPw, toggle: () => setShowNewPw(v => !v), ac: 'new-password', ph: 'min. 6 znakov' },
                  { label: 'Zopakujte nové heslo', val: editPwConfirm, set: setEditPwConfirm, show: showConfirmPw, toggle: () => setShowConfirmPw(v => !v), ac: 'new-password', ph: 'zopakujte heslo' },
                ].map(({ label, val, set, show, toggle, ac, ph }) => (
                  <div key={label}>
                    <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text)' }}>{label}</label>
                    <div className="relative">
                      <input type={show ? 'text' : 'password'} className="input-field pr-10"
                        autoComplete={ac} placeholder={ph} value={val} onChange={e => set(e.target.value)} required />
                      <button type="button" onClick={toggle} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                        {show ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {profileError && <div className="px-3 py-2.5 rounded-xl text-sm flex items-center gap-2" style={{ background: 'rgba(200,32,10,0.1)', color: '#ef4444', border: '1px solid rgba(200,32,10,0.25)' }}><AlertCircle size={14} /> {profileError}</div>}
              {profileSuccess && <div className="px-3 py-2.5 rounded-xl text-sm flex items-center gap-2" style={{ background: 'rgba(5,150,105,0.1)', color: '#10b981', border: '1px solid rgba(5,150,105,0.25)' }}><CheckCircle size={14} /> {profileSuccess}</div>}
              <button type="submit" disabled={profileSaving} className="btn-primary w-full flex items-center justify-center gap-2">
                {profileSaving ? 'Ukladám...' : 'Zmeniť heslo'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── ŠTATISTIKY MODAL ──────────────────────────────── */}
      {showStats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" style={{ background: 'var(--overlay)' }}>
          <div className="rounded-3xl shadow-2xl w-full max-w-2xl p-6 relative animate-slide-up overflow-y-auto" style={{ background: 'var(--surface)', border: '1px solid var(--border)', maxHeight: '90vh' }}>
            <button onClick={() => setShowStats(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--surface-2)' }}>
              <X size={16} style={{ color: 'var(--text-muted)' }} />
            </button>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(168,85,247,0.12)' }}>
                <BarChart2 size={18} style={{ color: '#a855f7' }} />
              </div>
              <div>
                <h2 className="text-xl font-bold" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>Štatistiky triedy {profile?.class}</h2>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Uploady za posledných 30 dní</p>
              </div>
            </div>

            {/* Bar chart – uploady za 30 dní */}
            <div className="mb-6">
              <UploadChart days={statsData.days} />
            </div>

            {/* Top uploaders */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Top nahrávači</p>
              {statsData.topUploaders.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Zatiaľ žiadne dáta.</p>
              ) : (
                <div className="space-y-2">
                  {statsData.topUploaders.map(({ name, count }, i) => {
                    const max = statsData.topUploaders[0].count;
                    const pct = Math.round((count / max) * 100);
                    const medals = ['🥇', '🥈', '🥉', '4.', '5.'];
                    return (
                      <div key={name} className="flex items-center gap-3">
                        <span className="text-sm w-6 text-center">{medals[i]}</span>
                        <span className="text-sm font-medium flex-1 truncate" style={{ color: 'var(--text)' }}>{name}</span>
                        <div className="flex items-center gap-2 w-36">
                          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                            <div className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #1A3A6B, #a855f7)' }} />
                          </div>
                          <span className="text-xs font-semibold w-8 text-right" style={{ color: 'var(--text-muted)' }}>{count}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── PREMENOVANIE PRIEČINKA MODAL ──────────────────── */}
      {renamingFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" style={{ background: 'var(--overlay)' }}>
          <div className="rounded-3xl shadow-2xl w-full max-w-sm p-6 relative animate-slide-up" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <button onClick={() => setRenamingFolder(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--surface-2)' }}>
              <X size={16} style={{ color: 'var(--text-muted)' }} />
            </button>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.12)' }}>
                <Pencil size={16} style={{ color: '#f59e0b' }} />
              </div>
              <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>Premenovať priečinok</h2>
            </div>
            <form onSubmit={saveRenameFolder} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text)' }}>Nový názov</label>
                <input type="text" className="input-field" placeholder="Názov priečinka..."
                  value={renameFolderName} onChange={e => setRenameFolderName(e.target.value)}
                  autoFocus maxLength={60} required />
              </div>
              {renameFolderError && <div className="px-3 py-2 rounded-xl text-sm flex items-center gap-2" style={{ background: 'rgba(200,32,10,0.1)', color: '#ef4444', border: '1px solid rgba(200,32,10,0.25)' }}><AlertCircle size={13} /> {renameFolderError}</div>}
              <div className="flex gap-2">
                <button type="button" onClick={() => setRenamingFolder(null)}
                  className="flex-1 py-2.5 rounded-xl font-semibold text-sm"
                  style={{ background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)' }}>
                  Zrušiť
                </button>
                <button type="submit" disabled={renameFolderSaving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {renameFolderSaving ? 'Ukladám...' : 'Premenovať'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── PRESUN SÚBORU MODAL ───────────────────────────── */}
      {moveFileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" style={{ background: 'var(--overlay)' }}>
          <div className="rounded-3xl shadow-2xl w-full max-w-sm p-6 relative animate-slide-up" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <button onClick={() => setMoveFileModal(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--surface-2)' }}>
              <X size={16} style={{ color: 'var(--text-muted)' }} />
            </button>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(26,58,107,0.1)' }}>
                <MoveRight size={16} style={{ color: 'var(--accent-link)' }} />
              </div>
              <div>
                <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>Presunúť súbor</h2>
                <p className="text-xs truncate max-w-[200px]" style={{ color: 'var(--text-muted)' }}>{moveFileModal.original_name}</p>
              </div>
            </div>
            <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
              <button onClick={() => setMoveTargetFolderId('__root__')}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-medium transition-all"
                style={{
                  background: moveTargetFolderId === '__root__' ? 'rgba(26,58,107,0.15)' : 'var(--surface-2)',
                  border: moveTargetFolderId === '__root__' ? '1.5px solid var(--accent-link)' : '1px solid var(--border)',
                  color: 'var(--text)'
                }}>
                <FolderOpen size={15} style={{ color: 'var(--accent-link)', flexShrink: 0 }} />
                Koreň triedy (bez priečinka)
              </button>
              {folders.map(folder => (
                <button key={folder.id} onClick={() => setMoveTargetFolderId(folder.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-medium transition-all"
                  style={{
                    background: moveTargetFolderId === folder.id ? 'rgba(245,158,11,0.12)' : 'var(--surface-2)',
                    border: moveTargetFolderId === folder.id ? '1.5px solid #f59e0b' : '1px solid var(--border)',
                    color: 'var(--text)'
                  }}>
                  <Folder size={15} style={{ color: '#f59e0b', flexShrink: 0 }} />
                  <span className="truncate">{folder.parent_id ? `  └ ${folder.name}` : folder.name}</span>
                </button>
              ))}
            </div>
            {moveError && <div className="mb-3 px-3 py-2 rounded-xl text-sm flex items-center gap-2" style={{ background: 'rgba(200,32,10,0.1)', color: '#ef4444', border: '1px solid rgba(200,32,10,0.25)' }}><AlertCircle size={13} /> {moveError}</div>}
            <div className="flex gap-2">
              <button onClick={() => setMoveFileModal(null)}
                className="flex-1 py-2.5 rounded-xl font-semibold text-sm"
                style={{ background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)' }}>
                Zrušiť
              </button>
              <button onClick={moveFile} disabled={moveSaving || !moveTargetFolderId}
                className="btn-primary flex-1 flex items-center justify-center gap-2">
                {moveSaving ? 'Presúvam...' : 'Presunúť'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── OFFLINE BANNER ───────────────────────────────── */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white animate-fade-in"
          style={{ background: 'linear-gradient(90deg, #dc2626, #ef4444)', boxShadow: '0 2px 12px rgba(220,38,38,0.4)' }}>
          <WifiOff size={15} /> Ste offline — zmeny sa neuložia
        </div>
      )}

      {/* ── SPOTLIGHT SEARCH MODAL ──────────────────────── */}
      {spotlightOpen && (
        <div className="fixed inset-0 z-[9000] flex items-start justify-center pt-[12vh] px-4 animate-fade-in"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
          onClick={() => setSpotlightOpen(false)}>
          <div className="w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden animate-slide-up"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <Search size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input ref={spotlightInputRef} autoFocus
                className="flex-1 bg-transparent outline-none text-base font-medium"
                style={{ color: 'var(--text)' }}
                placeholder="Hľadaj súbory, autora..."
                value={spotlightQuery}
                onChange={e => setSpotlightQuery(e.target.value)} />
              <div className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded text-xs font-mono" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>Esc</kbd>
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {spotlightResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <PackageOpen size={28} style={{ color: 'var(--text-dim)', opacity: 0.5 }} />
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    {spotlightQuery.trim() ? 'Žiadne výsledky' : 'Začni písať...'}
                  </p>
                </div>
              ) : (
                spotlightResults.map(file => (
                  <button key={file.id}
                    className="w-full flex items-center gap-3 px-5 py-3 text-left transition-all"
                    style={{ borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    onClick={() => { setSpotlightOpen(false); openLightbox(file); }}>
                    <span className="text-xl flex-shrink-0">{getFileIcon(file.file_type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate" style={{ color: 'var(--text)' }}>{file.original_name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {file.profiles?.first_name} {file.profiles?.last_name}
                        {file.folder_id && folders.find(f => f.id === file.folder_id) && (
                          <span> · 📁 {folders.find(f => f.id === file.folder_id)?.name}</span>
                        )}
                      </p>
                    </div>
                    <Download size={13} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
                  </button>
                ))
              )}
            </div>
            <div className="px-5 py-2.5 flex items-center gap-4" style={{ borderTop: '1px solid var(--border)' }}>
              <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
                <kbd className="px-1 py-0.5 rounded font-mono" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>↵</kbd> otvoriť
              </span>
              <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
                <kbd className="px-1 py-0.5 rounded font-mono" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>Cmd K</kbd> zatvoriť
              </span>
              <span className="ml-auto text-xs" style={{ color: 'var(--text-dim)' }}>{spotlightResults.length} výsledkov</span>
            </div>
          </div>
        </div>
      )}

      {/* ── HEADER ────────────────────────────────────────── */}
      <header className="school-header" style={{ marginTop: isOnline ? 0 : '40px' }}>
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
              <p className="text-white font-bold text-sm sm:hidden" style={{ fontFamily: 'Sora, sans-serif' }}>SS Sečovce</p>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <p className="text-blue-200 text-xs">Trieda {profile?.class}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Notifikácia bell */}
            {/* Cmd+K spotlight */}
            <button onClick={() => { setSpotlightOpen(true); setSpotlightQuery(''); }}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm transition-colors"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.12)' }}
              title="Spotlight vyhľadávanie (Cmd+K)">
              <Search size={13} />
              <span>Hľadaj</span>
              <kbd className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-mono" style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>⌘K</kbd>
            </button>

            <button onClick={markNotifSeen}
              className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
              style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}
              title="Nové súbory od spolužiakov">
              <Bell size={16} />
              {notifCount > 0 && (
                <span key={notifCount} className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white animate-pop"
                  style={{ background: '#ef4444' }}>
                  {notifCount > 9 ? '9+' : notifCount}
                </span>
              )}
            </button>

            <div className="relative hidden sm:block">
              <button ref={userMenuBtnRef} onClick={() => setShowUserMenu(v => !v)}
                className="flex items-center gap-2 rounded-xl px-3 py-1.5 transition-colors"
                style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(4px)' }}>
                <User size={13} className="text-blue-200" />
                <span className="text-white text-sm font-medium">{profile?.first_name} {profile?.last_name}</span>
                <ChevronDown size={12} className={`text-blue-300 transition-transform duration-300 ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>
              {showUserMenu && (
                <div ref={userMenuRef} className="absolute right-0 top-full mt-2 z-50 rounded-2xl shadow-2xl py-1.5 min-w-[200px] animate-fade-in"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <button onClick={() => { setShowUserMenu(false); setShowStats(true); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors text-left"
                    style={{ color: 'var(--text)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <BarChart2 size={15} style={{ color: '#a855f7' }} /> Štatistiky triedy
                  </button>
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
            </div>
            <div className="hidden sm:flex items-center gap-3">
              <ThemeToggle />
              <button onClick={async () => { await supabase.auth.signOut(); router.push('/'); }}
                className="flex items-center gap-1.5 text-blue-200 hover:text-white transition-colors text-sm">
                <LogOut size={15} /> Odhlásiť
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

      {/* ── MAIN ──────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="animate-slide-up">
          <h2 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>
            Trieda {profile?.class}
          </h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            {showFavorites ? `${filteredFiles.length} obľúbených súborov` : globalSearch ? `${filteredFiles.length} výsledkov hľadania` : `${filteredFiles.length} materiálov v tomto priečinku`}
          </p>
        </div>

        {/* ── OZNAM TRIEDY ──────────────────────────────── */}
        {announcement && !announcementDismissed && (
          <div className="animate-slide-up rounded-2xl p-4 flex items-start gap-3 relative"
            style={{
              background: announcement.color === 'red' ? 'rgba(220,38,38,0.1)'
                : announcement.color === 'green' ? 'rgba(5,150,105,0.1)'
                : announcement.color === 'purple' ? 'rgba(139,92,246,0.1)'
                : 'rgba(26,58,107,0.1)',
              border: `1px solid ${
                announcement.color === 'red' ? 'rgba(220,38,38,0.3)'
                : announcement.color === 'green' ? 'rgba(5,150,105,0.3)'
                : announcement.color === 'purple' ? 'rgba(139,92,246,0.3)'
                : 'rgba(26,58,107,0.3)'}`,
            }}>
            <Megaphone size={18} className="flex-shrink-0 mt-0.5"
              style={{ color: announcement.color === 'red' ? '#ef4444' : announcement.color === 'green' ? '#10b981' : announcement.color === 'purple' ? '#a855f7' : 'var(--accent-link)' }} />
            <div className="flex-1 min-w-0">
              {announcement.title && (
                <p className="font-bold text-sm mb-0.5" style={{ color: 'var(--text)' }}>{announcement.title}</p>
              )}
              <p className="text-sm" style={{ color: 'var(--text-muted)', whiteSpace: 'pre-wrap' }}>{announcement.message}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>
                {new Date(announcement.created_at).toLocaleDateString('sk-SK', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <button onClick={() => setAnnouncementDismissed(true)}
              className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.08)', color: 'var(--text-muted)' }}>
              <X size={12} />
            </button>
          </div>
        )}

        {/* ── NAPOSLEDY ZOBRAZENÉ ───────────────────────── */}
        {recentFiles.length > 0 && !globalSearch && !showFavorites && (
          <div className="animate-slide-up">
            <div className="flex items-center gap-2 mb-3">
              <History size={14} style={{ color: 'var(--text-muted)' }} />
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Naposledy zobrazené</p>
              <button onClick={() => {
                setRecentFiles([]);
                try { if (profile?.id) localStorage.removeItem(`sc_recent_${profile.id}`); } catch {}
              }} className="ml-auto text-xs link-underline" style={{ color: 'var(--text-dim)' }}>Vymazať</button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {recentFiles.map(rf => {
                const full = allFiles.find(f => f.id === rf.id);
                return (
                  <button key={rf.id}
                    onClick={() => full && openLightbox(full)}
                    disabled={!full}
                    className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', opacity: full ? 1 : 0.5, maxWidth: '200px' }}>
                    <span className="text-lg">{getFileIcon(rf.file_type)}</span>
                    <span className="text-xs font-medium truncate" style={{ color: 'var(--text)' }}>{rf.original_name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── KONIEC ŠKOLSKÉHO ROKA BANNER ──────────────── */}
        {schoolYearEndBanner !== null && (
          <div className="animate-slide-up rounded-2xl p-4 flex items-center gap-3"
            style={{
              background: schoolYearEndBanner <= 7 ? 'rgba(220,38,38,0.1)' : schoolYearEndBanner <= 14 ? 'rgba(245,158,11,0.1)' : 'rgba(26,58,107,0.08)',
              border: `1px solid ${schoolYearEndBanner <= 7 ? 'rgba(220,38,38,0.3)' : schoolYearEndBanner <= 14 ? 'rgba(245,158,11,0.3)' : 'rgba(26,58,107,0.2)'}`,
            }}>
            <span className="text-2xl flex-shrink-0">
              {schoolYearEndBanner <= 7 ? '🚨' : schoolYearEndBanner <= 14 ? '⚠️' : '📅'}
            </span>
            <div className="flex-1">
              <p className="font-bold text-sm" style={{ color: 'var(--text)' }}>
                {schoolYearEndBanner === 0 ? 'Dnes sa súbory triedy vymažú!' :
                 schoolYearEndBanner === 1 ? 'Zajtra sa súbory triedy vymažú!' :
                 `Za ${schoolYearEndBanner} dní sa súbory triedy vymažú`}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                31. augusta sa všetky súbory automaticky odstránia. Stiahni si dôležité súbory ešte dnes.
              </p>
            </div>
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={<BookOpen size={20} style={{ color: '#3b82f6' }} />} title="Súbory" value={allFiles.length} subtitle="celkom nahraných" color="blue" delayClass="delay-1" />
          <StatCard icon={<Folder size={20} style={{ color: '#f59e0b' }} />} title="Priečinky" value={folders.filter(f => !f.parent_id).length} subtitle="hlavných priečinkov" color="amber" delayClass="delay-2" />
          <StatCard icon={<CloudUpload size={20} style={{ color: '#10b981' }} />} title="Posledný upload" value={allFiles.length > 0 ? new Date(allFiles[0].created_at).toLocaleDateString('sk-SK', { day: '2-digit', month: 'short' }) : '--'} subtitle="dátum posledného" color="green" delayClass="delay-3" />
          <StatCard icon={<Clock size={20} style={{ color: '#a855f7' }} />} title="Veľkosť" value={allFiles.length > 0 ? formatFileSize(allFiles.reduce((sum, f) => sum + (f.file_size || 0), 0)) : '0 B'} subtitle="všetky súbory spolu" color="purple" delayClass="delay-4" />
        </div>

        {/* Upload karta */}
        <div className="card shadow-card animate-slide-up">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--surface-2)' }}>
              <CloudUpload size={18} style={{ color: 'var(--accent-link)' }} />
            </div>
            <div>
              <h3 className="font-bold text-lg" style={{ color: 'var(--text)' }}>Nahrať nový súbor</h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>PDF, obrázky, PowerPoint, Word, Excel – max 50 MB</p>
            </div>
          </div>
          <div {...getRootProps()} className={`border-2 border-dashed rounded-2xl p-4 sm:p-8 text-center cursor-pointer transition-all duration-300
            ${isDragActive ? 'scale-[1.02]' : ''} ${uploading ? 'opacity-60 cursor-not-allowed' : ''}`}
            style={{ borderColor: isDragActive ? 'var(--accent-link)' : 'var(--border)', background: isDragActive ? 'rgba(26,58,107,0.1)' : 'transparent' }}>
            <input {...getInputProps()} />
            {uploading ? (
              <div className="flex flex-col items-center w-full px-4">
                <div className="w-full max-w-xs mb-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="font-semibold text-sm" style={{ color: 'var(--accent-link)' }}>
                      {uploadProgress.total > 1 ? `Nahrávam ${uploadProgress.current} / ${uploadProgress.total}` : 'Nahrávam súbor...'}
                    </p>
                    {uploadProgress.total > 0 && (
                      <span className="text-xs font-bold" style={{ color: 'var(--accent-link)' }}>
                        {Math.round((uploadProgress.current / uploadProgress.total) * 100)}%
                      </span>
                    )}
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                    <div className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: uploadProgress.total > 0 ? `${Math.round((uploadProgress.current / uploadProgress.total) * 100)}%` : '0%',
                        background: 'linear-gradient(90deg, var(--accent-link), #a855f7)',
                      }} />
                  </div>
                  {uploadProgress.total > 1 && (
                    <p className="text-xs mt-1 text-center" style={{ color: 'var(--text-muted)' }}>
                      {selectedFiles[uploadProgress.current - 1]?.name || ''}
                    </p>
                  )}
                </div>
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
                      <button onClick={e => { e.stopPropagation(); setSelectedFiles(prev => prev.filter((_, idx) => idx !== i)); }}
                        className="w-5 h-5 rounded flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-center mt-3" style={{ color: 'var(--text-dim)' }}>Klikni alebo pretiahni ďalšie súbory</p>
              </div>
            ) : isDragActive ? (
              <div className="flex flex-col items-center">
                <Upload size={28} style={{ color: 'var(--accent-link)' }} className="mb-2 animate-pop" />
                <p className="font-semibold text-base" style={{ color: 'var(--accent-link)' }}>Pusti súbor sem!</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-float" style={{ background: 'var(--surface-2)' }}>
                  <Upload size={28} style={{ color: 'var(--accent-link)' }} />
                </div>
                <p className="font-semibold text-base" style={{ color: 'var(--text)' }}>Pretiahni súbor sem</p>
                <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>alebo klikni pre výber zo zariadenia</p>
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
                className="btn-primary group flex items-center justify-center gap-2 text-sm px-6 py-2.5 rounded-xl font-semibold text-white flex-1">
                <span className="icon-shift"><Upload size={15} /></span>
                Odoslať {selectedFiles.length > 1 ? `${selectedFiles.length} súborov` : 'súbor'}
              </button>
            </div>
          )}
          {uploadError && <div className="mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm" style={{ background: 'rgba(200,32,10,0.1)', color: '#ef4444', border: '1px solid rgba(200,32,10,0.25)' }}><AlertCircle size={15} /> {uploadError}</div>}
          {uploadSuccess && <div className="mt-3 px-4 py-2.5 rounded-xl text-sm" style={{ background: 'rgba(5,150,105,0.1)', color: '#10b981', border: '1px solid rgba(5,150,105,0.25)' }}>{uploadSuccess}</div>}
        </div>

        {/* Súbory karta */}
        <div className="card shadow-card animate-slide-up">

          {/* Header riadok */}
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--surface-2)' }}>
                <FolderOpen size={16} style={{ color: 'var(--accent-link)' }} />
              </div>
              <h3 className="font-bold truncate max-w-[200px] sm:max-w-xs" style={{ color: 'var(--text)' }}>
                {showFavorites ? '⭐ Obľúbené' : globalSearch ? `Výsledky: "${search}"` : 'Priečinky a súbory triedy'}
              </h3>
              {/* Obľúbené toggle */}
              <button onClick={toggleFavoritesView}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all"
                style={showFavorites
                  ? { background: 'rgba(245,158,11,0.2)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.4)' }
                  : { background: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                <Star size={11} fill={showFavorites ? '#f59e0b' : 'none'} /> Obľúbené
                {favorites.length > 0 && <span className="ml-0.5">({favorites.length})</span>}
              </button>
              {/* Bulk mode toggle */}
              <button onClick={() => { setBulkMode(v => !v); setBulkSelected(new Set()); }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all"
                style={bulkMode
                  ? { background: 'rgba(26,58,107,0.2)', color: 'var(--accent-link)', border: '1px solid rgba(26,58,107,0.3)' }
                  : { background: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                <CheckSquare size={11} /> Vybrať viac
              </button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Nový priečinok */}
              {!globalSearch && !showFavorites && folderPath.length < 3 && (
                <button onClick={() => { setShowCreateFolder(true); setFolderError(''); setNewFolderName(''); }}
                  className="group flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold flex-shrink-0 transition-transform hover:-translate-y-0.5"
                  style={{ background: 'var(--surface-2)', color: 'var(--accent-link)' }}>
                  <span className="icon-shift"><FolderPlus size={13} /></span> Nový priečinok
                </button>
              )}
              {/* Sort dropdown */}
              <div className="relative" ref={sortMenuRef}>
                <button onClick={() => setShowSortMenu(v => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
                  style={{ background: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                  <ArrowUpDown size={12} />
                  {SORT_OPTIONS.find(o => o.value === sortKey)?.label}
                </button>
                {showSortMenu && (
                  <div className="absolute right-0 top-full mt-1 z-30 rounded-2xl shadow-2xl py-1 min-w-[150px] animate-fade-in"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    {SORT_OPTIONS.map(opt => (
                      <button key={opt.value} onClick={() => { setSortKey(opt.value); setShowSortMenu(false); }}
                        className="w-full text-left px-4 py-2 text-xs font-medium transition-colors"
                        style={{ color: sortKey === opt.value ? 'var(--accent-link)' : 'var(--text)', fontWeight: sortKey === opt.value ? '700' : '500' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* Typ filter dropdown */}
              <div className="relative" ref={typeMenuRef}>
                <button onClick={() => setShowTypeMenu(v => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
                  style={typeFilter
                    ? { background: 'rgba(26,58,107,0.15)', color: 'var(--accent-link)', border: '1px solid rgba(26,58,107,0.3)' }
                    : { background: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                  <Filter size={12} />
                  {TYPE_FILTERS.find(o => o.value === typeFilter)?.label}
                </button>
                {showTypeMenu && (
                  <div className="absolute right-0 top-full mt-1 z-30 rounded-2xl shadow-2xl py-1 min-w-[150px] animate-fade-in"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    {TYPE_FILTERS.map(opt => (
                      <button key={opt.value} onClick={() => { setTypeFilter(opt.value); setShowTypeMenu(false); }}
                        className="w-full text-left px-4 py-2 text-xs font-medium transition-colors"
                        style={{ color: typeFilter === opt.value ? 'var(--accent-link)' : 'var(--text)', fontWeight: typeFilter === opt.value ? '700' : '500' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* Hľadaj */}
              <div className="input-with-icon flex-1" style={{ minWidth: '120px', maxWidth: '220px' }}>
                <Search size={15} className="input-icon" />
                <input className="input-inner text-sm" style={{ minWidth: 0 }}
                  placeholder="Hľadaj..." value={searchInput} onChange={e => handleSearchInput(e.target.value)} />
                {searchInput && (
                  <button onClick={() => { setSearchInput(''); setSearch(''); }} style={{ color: 'var(--text-muted)' }}><X size={13} /></button>
                )}
              </div>
            </div>
          </div>

          {/* Bulk akcie bar */}
          {bulkMode && (
            <div className="flex items-center gap-2 flex-wrap mb-4 px-3 py-2.5 rounded-2xl"
              style={{ background: 'rgba(26,58,107,0.08)', border: '1px solid rgba(26,58,107,0.15)' }}>
              <button onClick={selectAllVisible} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl"
                style={{ background: 'var(--surface)', color: 'var(--accent-link)', border: '1px solid var(--border)' }}>
                <CheckSquare size={12} /> Vybrať všetky ({filteredFiles.length})
              </button>
              {bulkSelected.size > 0 && (
                <>
                  <span className="text-xs font-semibold px-2 py-1 rounded-lg" style={{ background: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                    {bulkSelected.size} vybraných
                  </span>
                  <button onClick={bulkDownload} disabled={bulkDownloading}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl"
                    style={{ background: 'rgba(26,58,107,0.15)', color: 'var(--accent-link)', border: '1px solid rgba(26,58,107,0.25)' }}>
                    <Download size={12} /> {bulkDownloading ? 'Sťahujem...' : 'Stiahnuť vybrané'}
                  </button>
                  <button onClick={bulkDelete}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl"
                    style={{ background: 'rgba(200,32,10,0.1)', color: '#ef4444', border: '1px solid rgba(200,32,10,0.25)' }}>
                    <Trash2 size={12} /> Vymazať vybrané
                  </button>
                </>
              )}
              <button onClick={clearBulkSelection} className="ml-auto" style={{ color: 'var(--text-muted)' }}>
                <X size={14} />
              </button>
            </div>
          )}

          {/* Info banner pri hľadaní */}
          {globalSearch && (
            <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium"
              style={{ background: 'rgba(26,58,107,0.08)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
              <Search size={12} /> Hľadám vo všetkých priečinkoch — {filteredFiles.length} výsledkov
            </div>
          )}

          {/* Breadcrumb */}
          {!globalSearch && !showFavorites && (
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

          {/* Vytvoriť priečinok inline form */}
          {!globalSearch && !showFavorites && showCreateFolder && (
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

          {/* Priečinky grid */}
          {visibleFolders.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
              {getOrderedFolders(visibleFolders, currentFolderId).map((folder, i) => {
                const childCount = folders.filter(f => f.parent_id === folder.id).length;
                const fileCount = allFiles.filter(f => f.folder_id === folder.id).length;
                return (
                  <FolderCard key={folder.id} folder={folder} childCount={childCount} fileCount={fileCount}
                    isOwner={folder.created_by === profile?.id}
                    delayClass={`delay-${Math.min(i + 1, 6)}`}
                    isDragOver={dragOverFolderId === folder.id}
                    isReorderOver={folderReorderOver === folder.id}
                    isDragging={draggingFolderId === folder.id}
                    isZipping={folderZipping === folder.id}
                    onOpen={() => navigateToFolder(folder)}
                    onDelete={() => deleteFolder(folder)}
                    onRename={() => { setRenamingFolder(folder); setRenameFolderName(folder.name); setRenameFolderError(''); }}
                    onZipDownload={() => downloadFolderAsZip(folder)}
                    onDragOver={e => {
                      if (draggingFolderId) { onFolderDragOverReorder(folder.id, e); }
                      else { e.preventDefault(); setDragOverFolderId(folder.id); }
                    }}
                    onDragLeave={() => { setDragOverFolderId(null); setFolderReorderOver(null); }}
                    onDrop={() => {
                      if (draggingFolderId) onFolderDropReorder(folder.id);
                      else onDropOnFolder(folder.id);
                    }}
                    onFolderDragStart={e => onFolderDragStart(folder.id, e)}
                    onFolderDragEnd={onFolderDragEnd}
                  />
                );
              })}
            </div>
          )}

          {visibleFolders.length > 0 && filteredFiles.length > 0 && <div style={{ borderTop: '1px solid var(--border)', marginBottom: '20px' }} />}

          {/* Prázdny stav */}
          {filteredFiles.length === 0 && visibleFolders.length === 0 ? (
            <EmptyState type={showFavorites ? 'favorites' : globalSearch ? 'search' : currentFolder ? 'folder' : 'class'} />
          ) : filteredFiles.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredFiles.map((file, i) => (
                <FileCard key={file.id} file={file}
                  isOwner={file.uploaded_by === profile?.id}
                  isFavorite={favorites.includes(file.id)}
                  isSelected={bulkMode && bulkSelected.has(file.id)}
                  bulkMode={bulkMode}
                  delayClass={`delay-${Math.min(i + 1, 6)}`}
                  onDelete={() => deleteFile(file)}
                  showFolder={globalSearch || showFavorites}
                  onPreview={openLightbox}
                  onDownload={() => downloadFile(file)}
                  onToggleFavorite={() => toggleFavorite(file.id)}
                  onMove={() => { setMoveFileModal(file); setMoveTargetFolderId(file.folder_id || '__root__'); setMoveError(''); }}
                  onToggleSelect={() => toggleBulkSelect(file.id)}
                  folderName={(globalSearch || showFavorites) && file.folder_id ? folders.find(f => f.id === file.folder_id)?.name : null}
                  onDragStart={() => onFileDragStart(file.id)}
                  onDragEnd={onFileDragEnd}
                />
              ))}
            </div>
          ) : null}

          {/* Načítať viac */}
          {!globalSearch && !showFavorites && hasMoreFiles && (
            <div className="text-center pt-4">
              <button onClick={loadMoreFiles} disabled={loadingMore}
                className="px-6 py-2.5 rounded-2xl text-sm font-semibold transition-all disabled:opacity-50"
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

// ─── DASHBOARD SKELETON ─────────────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      {/* Header skeleton */}
      <div className="school-header">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl" style={{ background: 'rgba(255,255,255,0.15)' }} />
            <div className="space-y-1.5">
              <div className="h-3.5 w-44 rounded-lg" style={{ background: 'rgba(255,255,255,0.18)' }} />
              <div className="h-2.5 w-20 rounded-lg" style={{ background: 'rgba(255,255,255,0.1)' }} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl" style={{ background: 'rgba(255,255,255,0.12)' }} />
            <div className="hidden sm:flex items-center gap-3">
              <div className="h-8 w-32 rounded-xl" style={{ background: 'rgba(255,255,255,0.12)' }} />
              <div className="w-9 h-9 rounded-xl" style={{ background: 'rgba(255,255,255,0.12)' }} />
              <div className="h-5 w-20 rounded-lg" style={{ background: 'rgba(255,255,255,0.1)' }} />
            </div>
          </div>
        </div>
      </div>
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Title */}
        <div className="space-y-2">
          <div className="h-8 w-48 rounded-2xl skeleton" />
          <div className="h-4 w-64 rounded-xl skeleton" />
        </div>
        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-3xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-2xl skeleton" />
                <div className="h-3 w-16 rounded-lg skeleton" />
              </div>
              <div className="h-7 w-20 rounded-xl skeleton mb-1.5" />
              <div className="h-3 w-28 rounded-lg skeleton" />
            </div>
          ))}
        </div>
        {/* Upload card */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl skeleton" />
            <div className="space-y-1.5">
              <div className="h-5 w-40 rounded-lg skeleton" />
              <div className="h-3 w-64 rounded-lg skeleton" />
            </div>
          </div>
          <div className="border-2 border-dashed rounded-2xl p-8 flex flex-col items-center gap-3" style={{ borderColor: 'var(--border)' }}>
            <div className="w-14 h-14 rounded-2xl skeleton" />
            <div className="h-4 w-44 rounded-lg skeleton" />
            <div className="h-3 w-52 rounded-lg skeleton" />
          </div>
        </div>
        {/* Files card */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg skeleton" />
              <div className="h-5 w-48 rounded-lg skeleton" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-7 w-24 rounded-xl skeleton" />
              <div className="h-7 w-24 rounded-xl skeleton" />
              <div className="h-8 w-32 rounded-xl skeleton" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl skeleton" />
                  <div className="w-6 h-6 rounded-lg skeleton" />
                </div>
                <div className="h-4 w-3/4 rounded-lg skeleton mb-1.5" />
                <div className="h-3 w-1/2 rounded-lg skeleton mb-4" />
                <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                  <div className="space-y-1">
                    <div className="h-3 w-24 rounded-lg skeleton" />
                    <div className="h-2.5 w-28 rounded-lg skeleton" />
                  </div>
                  <div className="flex gap-1.5">
                    <div className="h-7 w-16 rounded-lg skeleton" />
                    <div className="h-7 w-20 rounded-lg skeleton" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────
function EmptyState({ type = 'class' }) {
  const configs = {
    search: {
      svg: (
        <svg viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '120px', height: '100px' }}>
          <circle cx="50" cy="45" r="28" stroke="var(--border)" strokeWidth="4" fill="var(--surface-2)" />
          <circle cx="50" cy="45" r="18" fill="var(--surface-3)" />
          <line x1="70" y1="65" x2="90" y2="85" stroke="var(--border)" strokeWidth="5" strokeLinecap="round" />
          <line x1="42" y1="45" x2="58" y2="45" stroke="var(--text-dim)" strokeWidth="3" strokeLinecap="round" />
          <line x1="50" y1="37" x2="50" y2="53" stroke="var(--text-dim)" strokeWidth="3" strokeLinecap="round" />
        </svg>
      ),
      title: 'Žiadne výsledky',
      text: 'Skús iný výraz alebo skontroluj pravopis.',
    },
    favorites: {
      svg: (
        <svg viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '120px', height: '100px' }}>
          <path d="M60 75 L30 50 C20 42 20 28 30 22 C38 17 48 20 60 32 C72 20 82 17 90 22 C100 28 100 42 90 50 Z" stroke="var(--border)" strokeWidth="4" fill="var(--surface-2)" strokeLinejoin="round" />
          <path d="M60 65 L38 48 C32 43 32 34 38 30 C43 27 50 30 60 40 C70 30 77 27 82 30 C88 34 88 43 82 48 Z" fill="var(--surface-3)" />
        </svg>
      ),
      title: 'Žiadne obľúbené',
      text: 'Klikni na hviezdičku pri súbore a pridáš ho sem.',
    },
    folder: {
      svg: (
        <svg viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '120px', height: '100px' }}>
          <rect x="15" y="35" width="90" height="55" rx="8" fill="var(--surface-2)" stroke="var(--border)" strokeWidth="3" />
          <path d="M15 45 L105 45" stroke="var(--border)" strokeWidth="3" />
          <rect x="15" y="28" width="40" height="17" rx="6" fill="var(--surface-3)" stroke="var(--border)" strokeWidth="3" />
          <line x1="42" y1="60" x2="78" y2="60" stroke="var(--text-dim)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="6 4" />
          <line x1="42" y1="70" x2="65" y2="70" stroke="var(--text-dim)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="6 4" />
        </svg>
      ),
      title: 'Prázdny priečinok',
      text: 'Pretiahni sem súbory alebo klikni na nahranie vyššie.',
    },
    class: {
      svg: (
        <svg viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '120px', height: '100px' }}>
          <rect x="20" y="20" width="35" height="45" rx="5" fill="var(--surface-2)" stroke="var(--border)" strokeWidth="3" />
          <rect x="65" y="30" width="35" height="35" rx="5" fill="var(--surface-3)" stroke="var(--border)" strokeWidth="3" />
          <line x1="28" y1="33" x2="47" y2="33" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round" />
          <line x1="28" y1="41" x2="47" y2="41" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round" />
          <line x1="28" y1="49" x2="38" y2="49" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round" />
          <line x1="73" y1="42" x2="92" y2="42" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round" />
          <line x1="73" y1="50" x2="85" y2="50" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round" />
          <circle cx="60" cy="80" r="10" fill="var(--surface-2)" stroke="var(--border)" strokeWidth="2.5" />
          <line x1="60" y1="75" x2="60" y2="81" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round" />
          <circle cx="60" cy="84" r="1.2" fill="var(--text-dim)" />
        </svg>
      ),
      title: 'Trieda je zatiaľ prázdna',
      text: 'Buď prvý, kto nahrá materiál pre spolužiakov!',
    },
  };

  const c = configs[type] || configs.class;

  return (
    <div className="flex flex-col items-center justify-center py-14 gap-4 animate-fade-in">
      <div style={{ opacity: 0.7 }} className="animate-float">{c.svg}</div>
      <div className="text-center">
        <p className="font-bold text-base mb-1" style={{ color: 'var(--text)' }}>{c.title}</p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{c.text}</p>
      </div>
    </div>
  );
}

// ─── UPLOAD CHART KOMPONENT ───────────────────────────────────────────────────
function UploadChart({ days }) {
  const maxCount = Math.max(...days.map(d => d.count), 1);
  // Zobrazíme len posledných 14 dní aby sa zmestilo
  const visible = days.slice(-14);

  return (
    <div>
      <div className="flex items-end gap-1 h-32">
        {visible.map(d => {
          const pct = (d.count / maxCount) * 100;
          return (
            <div key={d.key} className="flex-1 flex flex-col items-center gap-1 group" title={`${d.label} — ${d.count} uploadov`}>
              <div className="w-full relative flex items-end" style={{ height: '96px' }}>
                <div className="w-full rounded-t-lg transition-all duration-300"
                  style={{
                    height: `${Math.max(pct, d.count > 0 ? 8 : 2)}%`,
                    background: d.count > 0 ? 'linear-gradient(180deg, #a855f7, #1A3A6B)' : 'var(--surface-3)',
                    minHeight: '3px',
                    opacity: d.count > 0 ? 1 : 0.4,
                  }} />
                {d.count > 0 && (
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: 'var(--text-muted)' }}>
                    {d.count}
                  </span>
                )}
              </div>
              <span className="text-[9px] font-medium" style={{ color: 'var(--text-dim)', fontSize: '9px' }}>{d.label}</span>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-center mt-2" style={{ color: 'var(--text-dim)' }}>Posledných 14 dní — hover pre detaily</p>
    </div>
  );
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({ icon, title, value, subtitle, color, delayClass }) {
  const colorMap = { blue: 'rgba(26,58,107,0.15)', amber: 'rgba(180,100,0,0.12)', green: 'rgba(5,150,105,0.12)', purple: 'rgba(109,40,217,0.12)' };
  return (
    <article className={`rounded-3xl border p-4 shadow-card hover:shadow-card-hover transition-all duration-150 animate-slide-up group ${delayClass || ''}`}
      style={{ background: colorMap[color] || colorMap.blue, borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6" style={{ background: 'var(--surface)' }}>{icon}</div>
        <span className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>{title}</span>
      </div>
      <p className="text-xl sm:text-2xl font-bold truncate" style={{ color: 'var(--text)' }}>{value}</p>
      <p className="text-xs mt-1 truncate" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
    </article>
  );
}

// ─── FOLDER CARD ──────────────────────────────────────────────────────────────
function FolderCard({ folder, childCount, fileCount, isOwner, onOpen, onDelete, onRename, onZipDownload,
  isDragOver, isReorderOver, isDragging, isZipping, delayClass,
  onDragOver, onDragLeave, onDrop, onFolderDragStart, onFolderDragEnd }) {
  return (
    <div className={`group relative animate-rise ${delayClass || ''}`}
      draggable
      onDragStart={onFolderDragStart}
      onDragEnd={onFolderDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      style={{ opacity: isDragging ? 0.45 : 1, transition: 'opacity 0.15s' }}>
      <button onClick={onOpen} className="w-full text-left p-4 rounded-2xl border transition-all duration-200 hover:shadow-sm"
        style={{
          borderColor: isReorderOver ? '#a855f7' : isDragOver ? '#f59e0b' : 'var(--border)',
          background: isReorderOver ? 'rgba(168,85,247,0.14)' : isDragOver ? 'rgba(245,158,11,0.18)' : 'rgba(180,100,0,0.08)',
          transform: isReorderOver ? 'scale(1.04)' : isDragOver ? 'scale(1.03)' : 'scale(1)',
          boxShadow: isReorderOver ? '0 0 0 2px rgba(168,85,247,0.4)' : isDragOver ? '0 0 0 2px rgba(245,158,11,0.4)' : 'none',
        }}>
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="hidden sm:inline-flex cursor-grab opacity-0 group-hover:opacity-50 group-hover:-translate-y-0.5 transition-all"
              style={{ color: 'var(--text-dim)' }}>
              <GripVertical size={13} />
            </span>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6" style={{ background: 'rgba(180,100,0,0.2)' }}>
              <Folder size={18} style={{ color: '#f59e0b' }} />
            </div>
          </div>
          {isOwner && (
            <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all">
              <button type="button" onClick={e => { e.stopPropagation(); onRename(); }}
                className="w-6 h-6 rounded-lg flex items-center justify-center transition-all"
                style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                <Pencil size={11} />
              </button>
              <button type="button" onClick={e => { e.stopPropagation(); onDelete(); }}
                className="w-6 h-6 rounded-lg flex items-center justify-center text-red-400 hover:text-red-600 transition-all"
                style={{ background: 'rgba(200,32,10,0.1)' }}>
                <Trash2 size={11} />
              </button>
            </div>
          )}
        </div>
        <p className="font-semibold text-sm leading-tight line-clamp-2 mb-1" style={{ color: 'var(--text)' }}>{folder.name}</p>
        <div className="flex items-center justify-between">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {childCount > 0 && `${childCount} podpriec. `}{fileCount > 0 && `${fileCount} súb.`}
            {childCount === 0 && fileCount === 0 && 'Prázdny'}
          </p>
          <button type="button"
            onClick={e => { e.stopPropagation(); onZipDownload(); }}
            disabled={isZipping}
            className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold opacity-0 group-hover:opacity-100 transition-all"
            style={{ background: 'rgba(26,58,107,0.12)', color: 'var(--accent-link)', border: '1px solid rgba(26,58,107,0.2)' }}
            title="Stiahnuť priečinok ako ZIP">
            {isZipping
              ? <span className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
              : <Download size={10} />}
            ZIP
          </button>
        </div>
      </button>
    </div>
  );
}

// ─── FILE CARD ────────────────────────────────────────────────────────────────
function FileCard({ file, isOwner, onDelete, showFolder, folderName, onPreview, onDownload, isFavorite, onToggleFavorite, onMove, isSelected, bulkMode, onToggleSelect, onDragStart, onDragEnd, delayClass }) {
  const date = new Date(file.created_at).toLocaleDateString('sk-SK', { day: '2-digit', month: 'short', year: 'numeric' });
  const isImage = file.file_type?.startsWith('image/');
  const isPdf = file.file_type?.includes('pdf');
  const [thumbUrl, setThumbUrl] = useState(null);

  // Miniatúra pre obrázky — načítaj signed URL len raz
  useEffect(() => {
    if (!isImage) return;
    let cancelled = false;
    getSignedUrl(file.file_name, 600).then(url => { if (!cancelled) setThumbUrl(url); });
    return () => { cancelled = true; };
  }, [file.file_name, isImage]);

  return (
    <div className={`file-card group relative animate-slide-up ${delayClass || ''}`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      style={isSelected ? { border: '2px solid var(--accent-link)', background: 'rgba(26,58,107,0.06)' } : {}}>
      {/* Miniatúra pre obrázky */}
      {isImage && thumbUrl && (
        <div className="w-full h-28 rounded-xl overflow-hidden mb-3 -mt-1 cursor-pointer"
          onClick={() => onPreview(file)}
          style={{ background: 'var(--surface-2)' }}>
          <img src={thumbUrl} alt={file.original_name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
        </div>
      )}
      {isImage && !thumbUrl && (
        <div className="w-full h-28 rounded-xl mb-3 -mt-1 skeleton" />
      )}

      {/* Bulk checkbox */}
      {bulkMode && (
        <button onClick={onToggleSelect}
          className="absolute top-3 left-3 z-10 w-5 h-5 rounded flex items-center justify-center transition-all"
          style={{ background: isSelected ? 'var(--accent-link)' : 'var(--surface-2)', border: '1.5px solid var(--border)' }}>
          {isSelected && <CheckCircle size={12} color="white" />}
        </button>
      )}

      <div className="flex items-start justify-between gap-2 mb-3">
        <span className="text-2xl" style={{ marginLeft: bulkMode ? '24px' : '0' }}>{getFileIcon(file.file_type)}</span>
        <div className="flex items-center gap-1">
          {/* Hviezdička – obľúbené */}
          <button onClick={onToggleFavorite}
            className="w-6 h-6 rounded-lg flex items-center justify-center transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:scale-110"
            style={{ color: isFavorite ? '#f59e0b' : 'var(--text-dim)' }}
            title={isFavorite ? 'Odstrániť z obľúbených' : 'Pridať do obľúbených'}>
            <Star key={isFavorite ? 'fav' : 'unfav'} size={13} fill={isFavorite ? '#f59e0b' : 'none'} className="animate-pop" />
          </button>
          {/* Presun */}
          {isOwner && (
            <button onClick={onMove}
              className="w-6 h-6 rounded-lg flex items-center justify-center transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
              style={{ background: 'rgba(26,58,107,0.08)', color: 'var(--accent-link)' }}
              title="Presunúť do priečinka">
              <MoveRight size={12} />
            </button>
          )}
          {/* Vymazať */}
          {isOwner && (
            <button onClick={onDelete}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:text-red-600 transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
              style={{ background: 'rgba(200,32,10,0.1)' }}>
              <Trash2 size={14} />
            </button>
          )}
        </div>
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
            {file.file_size && <span>– {formatFileSize(file.file_size)}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {(isImage || isPdf) && (
            <button onClick={() => onPreview(file)}
              className="group/btn flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-transform hover:-translate-y-0.5"
              style={{ background: 'rgba(139,92,246,0.12)', color: '#a855f7' }}>
              <ZoomIn size={12} className="transition-transform duration-300 group-hover/btn:scale-110" /> Náhľad
            </button>
          )}
          <button onClick={onDownload}
            className="group/btn flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-transform hover:-translate-y-0.5"
            style={{ background: 'rgba(26,58,107,0.15)', color: 'var(--accent-link)' }}>
            <Download size={12} className="transition-transform duration-300 group-hover/btn:translate-y-0.5" /> Stiahnuť
          </button>
        </div>
      </div>
    </div>
  );
}
