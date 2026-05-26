'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, CLASSES, formatFileSize, getFileIcon } from '@/lib/supabase';
import {
  Users, FileText, CheckCircle, XCircle, Trash2,
  LogOut, Shield, Clock, Search, Filter, Download
} from 'lucide-react';

const TABS = ['Žiadosti', 'Žiaci', 'Súbory'];

export default function AdminPage() {
  const router = useRouter();
  const [adminProfile, setAdminProfile] = useState(null);
  const [tab, setTab] = useState('Žiadosti');
  const [loading, setLoading] = useState(true);

  // Data
  const [pending, setPending] = useState([]);
  const [approved, setApproved] = useState([]);
  const [files, setFiles] = useState([]);

  // Filters
  const [userSearch, setUserSearch] = useState('');
  const [fileSearch, setFileSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');

  useEffect(() => { checkAdmin(); }, []);

  async function checkAdmin() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/'); return; }

    const { data: prof } = await supabase
      .from('profiles').select('*').eq('id', session.user.id).single();

    if (!prof?.is_admin) { router.push('/dashboard'); return; }

    setAdminProfile(prof);
    await Promise.all([loadPending(), loadApproved(), loadFiles()]);
    setLoading(false);
  }

  async function loadPending() {
    const { data } = await supabase
      .from('profiles').select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    setPending(data || []);
  }

  async function loadApproved() {
    const { data } = await supabase
      .from('profiles').select('*')
      .in('status', ['approved', 'rejected'])
      .eq('is_admin', false)
      .order('created_at', { ascending: false });
    setApproved(data || []);
  }

  async function loadFiles() {
    const { data } = await supabase
      .from('files')
      .select(`*, profiles(first_name, last_name)`)
      .order('created_at', { ascending: false });
    setFiles(data || []);
  }

  async function approveUser(id) {
    await supabase.from('profiles').update({ status: 'approved' }).eq('id', id);
    await loadPending(); await loadApproved();
  }

  async function rejectUser(id, name) {
    if (!confirm(`Zamietnuť žiadosť od ${name}?`)) return;
    await supabase.from('profiles').update({ status: 'rejected' }).eq('id', id);
    await loadPending(); await loadApproved();
  }

  async function deleteUser(id, name) {
    if (!confirm(`Vymazať žiaka ${name}? Toto vymaže aj všetky jeho súbory!`)) return;
    // Vymaž súbory
    const { data: userFiles } = await supabase.from('files').select('file_name').eq('uploaded_by', id);
    if (userFiles?.length) {
      await supabase.storage.from('class-files').remove(userFiles.map(f => f.file_name));
      await supabase.from('files').delete().eq('uploaded_by', id);
    }
    await supabase.from('profiles').delete().eq('id', id);
    await loadApproved();
  }

  async function deleteFile(file) {
    if (!confirm(`Vymazať "${file.original_name}"?`)) return;
    await supabase.storage.from('class-files').remove([file.file_name]);
    await supabase.from('files').delete().eq('id', file.id);
    await loadFiles();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/');
  }

  const filteredUsers = approved.filter(u => {
    const name = `${u.first_name} ${u.last_name} ${u.email} ${u.class}`.toLowerCase();
    const matchSearch = name.includes(userSearch.toLowerCase());
    const matchClass = classFilter ? u.class === classFilter : true;
    return matchSearch && matchClass;
  });

  const filteredFiles = files.filter(f => {
    const text = `${f.original_name} ${f.description || ''} ${f.profiles?.first_name || ''} ${f.class}`.toLowerCase();
    const matchSearch = text.includes(fileSearch.toLowerCase());
    const matchClass = classFilter ? f.class === classFilter : true;
    return matchSearch && matchClass;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-school-light flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-school-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-school-light">
      {/* Navbar */}
      <header style={{ background: 'linear-gradient(135deg, #0D1F3C, #1A3A6B)' }}>
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="school-emblem w-10 h-10">
              <span className="text-lg font-bold text-school-navy" style={{ fontFamily: 'serif' }}>Š</span>
            </div>
            <div>
              <p className="text-white font-semibold text-sm" style={{ fontFamily: 'Crimson Pro, serif' }}>
                Spojená škola Sečovce
              </p>
              <p className="text-school-accent text-xs flex items-center gap-1">
                <Shield size={10} /> Správcovský panel
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-blue-200 text-sm hidden sm:block">
              {adminProfile?.first_name} {adminProfile?.last_name}
            </span>
            <button onClick={handleLogout}
              className="flex items-center gap-2 text-blue-200 hover:text-white transition-colors text-sm">
              <LogOut size={16} /> Odhlásiť
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8 animate-slide-up">
          <StatCard color="yellow" icon={<Clock size={20} />}
            label="Čakajúce žiadosti" value={pending.length} />
          <StatCard color="blue" icon={<Users size={20} />}
            label="Schválení žiaci" value={approved.filter(u => u.status === 'approved').length} />
          <StatCard color="green" icon={<FileText size={20} />}
            label="Nahratých súborov" value={files.length} />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white rounded-xl p-1 shadow-sm border border-gray-100 w-fit animate-fade-in">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200
                ${tab === t
                  ? 'bg-school-navy text-white shadow-sm'
                  : 'text-school-muted hover:text-school-navy'}`}>
              {t}
              {t === 'Žiadosti' && pending.length > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                  {pending.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* TAB: Žiadosti */}
        {tab === 'Žiadosti' && (
          <div className="card animate-fade-in">
            <h3 className="font-semibold text-school-navy mb-4 flex items-center gap-2" style={{ fontFamily: 'Crimson Pro, serif', fontSize: '1.2rem' }}>
              <Clock size={18} className="text-yellow-500" />
              Čakajúce žiadosti o registráciu
            </h3>

            {pending.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle size={40} className="text-green-300 mx-auto mb-3" />
                <p className="text-school-muted">Žiadne čakajúce žiadosti. Všetko vybavené!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pending.map(user => (
                  <div key={user.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-yellow-50 border border-yellow-100 rounded-xl">
                    <div>
                      <p className="font-semibold text-school-navy">
                        {user.first_name} {user.last_name}
                        <span className="ml-2 bg-school-blue text-white text-xs px-2 py-0.5 rounded-full">
                          {user.class}
                        </span>
                      </p>
                      <p className="text-school-muted text-sm">{user.email}</p>
                      <p className="text-xs text-school-muted mt-0.5">
                        Zaregistroval sa: {new Date(user.created_at).toLocaleString('sk-SK')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => approveUser(user.id)} className="btn-success flex items-center gap-1">
                        <CheckCircle size={15} /> Schváliť
                      </button>
                      <button onClick={() => rejectUser(user.id, `${user.first_name} ${user.last_name}`)}
                        className="btn-danger flex items-center gap-1">
                        <XCircle size={15} /> Zamietnuť
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: Žiaci */}
        {tab === 'Žiaci' && (
          <div className="card animate-fade-in">
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-school-muted" />
                <input className="input-field pl-9 py-2 text-sm" placeholder="Hľadaj meno alebo email..."
                  value={userSearch} onChange={e => setUserSearch(e.target.value)} />
              </div>
              <div className="relative">
                <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-school-muted" />
                <select className="input-field pl-9 py-2 text-sm" value={classFilter} onChange={e => setClassFilter(e.target.value)}>
                  <option value="">Všetky triedy</option>
                  {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-3 text-school-muted font-medium">Meno</th>
                    <th className="text-left py-2 px-3 text-school-muted font-medium">Email</th>
                    <th className="text-left py-2 px-3 text-school-muted font-medium">Trieda</th>
                    <th className="text-left py-2 px-3 text-school-muted font-medium">Stav</th>
                    <th className="text-right py-2 px-3 text-school-muted font-medium">Akcie</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredUsers.map(user => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-3 font-medium text-school-navy">
                        {user.first_name} {user.last_name}
                      </td>
                      <td className="py-3 px-3 text-school-muted">{user.email}</td>
                      <td className="py-3 px-3">
                        <span className="bg-school-blue text-white text-xs px-2 py-0.5 rounded-full">
                          {user.class}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={user.status === 'approved' ? 'badge-approved' : 'badge-rejected'}>
                          {user.status === 'approved' ? 'Schválený' : 'Zamietnutý'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        {user.status === 'rejected' && (
                          <button onClick={() => approveUser(user.id)}
                            className="text-green-600 hover:text-green-800 text-xs mr-3 font-medium">
                            Schváliť
                          </button>
                        )}
                        <button onClick={() => deleteUser(user.id, `${user.first_name} ${user.last_name}`)}
                          className="text-red-400 hover:text-red-600 transition-colors">
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredUsers.length === 0 && (
                <p className="text-center text-school-muted py-8 text-sm">Žiadni žiaci nezodpovedajú filtru.</p>
              )}
            </div>
          </div>
        )}

        {/* TAB: Súbory */}
        {tab === 'Súbory' && (
          <div className="card animate-fade-in">
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-school-muted" />
                <input className="input-field pl-9 py-2 text-sm" placeholder="Hľadaj súbor..."
                  value={fileSearch} onChange={e => setFileSearch(e.target.value)} />
              </div>
              <div className="relative">
                <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-school-muted" />
                <select className="input-field pl-9 py-2 text-sm" value={classFilter} onChange={e => setClassFilter(e.target.value)}>
                  <option value="">Všetky triedy</option>
                  {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-3 text-school-muted font-medium">Súbor</th>
                    <th className="text-left py-2 px-3 text-school-muted font-medium">Nahrál</th>
                    <th className="text-left py-2 px-3 text-school-muted font-medium">Trieda</th>
                    <th className="text-left py-2 px-3 text-school-muted font-medium">Veľkosť</th>
                    <th className="text-left py-2 px-3 text-school-muted font-medium">Dátum</th>
                    <th className="text-right py-2 px-3 text-school-muted font-medium">Akcie</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredFiles.map(file => (
                    <tr key={file.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getFileIcon(file.file_type)}</span>
                          <div>
                            <p className="font-medium text-school-navy line-clamp-1" style={{ maxWidth: '200px' }}>
                              {file.original_name}
                            </p>
                            {file.description && (
                              <p className="text-xs text-school-muted line-clamp-1">{file.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-school-muted">
                        {file.profiles?.first_name} {file.profiles?.last_name}
                      </td>
                      <td className="py-3 px-3">
                        <span className="bg-school-blue text-white text-xs px-2 py-0.5 rounded-full">
                          {file.class}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-school-muted">
                        {file.file_size ? formatFileSize(file.file_size) : '—'}
                      </td>
                      <td className="py-3 px-3 text-school-muted text-xs">
                        {new Date(file.created_at).toLocaleDateString('sk-SK')}
                      </td>
                      <td className="py-3 px-3 text-right flex items-center justify-end gap-3">
                        <a href={file.file_url} target="_blank" rel="noopener noreferrer"
                          className="text-school-blue hover:text-school-navy transition-colors">
                          <Download size={15} />
                        </a>
                        <button onClick={() => deleteFile(file)}
                          className="text-red-400 hover:text-red-600 transition-colors">
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredFiles.length === 0 && (
                <p className="text-center text-school-muted py-8 text-sm">Žiadne súbory nezodpovedajú filtru.</p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  const colors = {
    yellow: 'bg-yellow-50 border-yellow-100 text-yellow-600',
    blue: 'bg-blue-50 border-blue-100 text-blue-600',
    green: 'bg-green-50 border-green-100 text-green-600',
  };
  return (
    <div className={`card border ${colors[color]} text-center`}>
      <div className="flex items-center justify-center mb-2">{icon}</div>
      <p className="text-3xl font-bold text-school-navy" style={{ fontFamily: 'Crimson Pro, serif' }}>{value}</p>
      <p className="text-school-muted text-xs mt-1">{label}</p>
    </div>
  );
}
