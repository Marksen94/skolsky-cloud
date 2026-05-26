'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase, CLASSES, formatFileSize, getFileIcon } from '@/lib/supabase';
import { Users, FileText, CheckCircle, XCircle, Trash2, LogOut, Shield, Clock, Search, Filter, Download, LayoutDashboard } from 'lucide-react';

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
    if (!confirm(`Zamietnuť žiadosť od ${name}?`)) return;
    await supabase.from('profiles').update({ status: 'rejected' }).eq('id', id);
    await loadPending(); await loadApproved();
  }
  async function deleteUser(id, name) {
    if (!confirm(`Vymazať žiaka ${name}?`)) return;
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

  const filteredUsers = approved.filter(u => {
    const name = `${u.first_name} ${u.last_name} ${u.email} ${u.class}`.toLowerCase();
    return name.includes(userSearch.toLowerCase()) && (classFilter ? u.class === classFilter : true);
  });
  const filteredFiles = files.filter(f => {
    const text = `${f.original_name} ${f.description || ''} ${f.profiles?.first_name || ''} ${f.class}`.toLowerCase();
    return text.includes(fileSearch.toLowerCase()) && (classFilter ? f.class === classFilter : true);
  });

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/40 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-school-blue border-t-transparent rounded-full animate-spin" style={{borderWidth:'3px'}} />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
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
            <button onClick={async () => { await supabase.auth.signOut(); router.push('/'); }}
              className="flex items-center gap-1.5 text-blue-200 hover:text-white transition-colors text-sm">
              <LogOut size={15} /> Odhlásiť
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8 animate-slide-up">
          <StatCard color="amber" icon={<Clock size={18} />} label="Čakajúce žiadosti" value={pending.length} />
          <StatCard color="blue" icon={<Users size={18} />} label="Schválení žiaci" value={approved.filter(u => u.status === 'approved').length} />
          <StatCard color="emerald" icon={<FileText size={18} />} label="Nahratých súborov" value={files.length} />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 w-fit animate-fade-in">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200
                ${tab === t ? 'bg-school-navy text-white shadow-sm' : 'text-school-muted hover:text-school-navy'}`}>
              {t}
              {t === 'Žiadosti' && pending.length > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">{pending.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Žiadosti */}
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
                  <div key={user.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
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

        {/* Žiaci */}
        {tab === 'Žiaci' && (
          <div className="card shadow-card animate-fade-in">
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-school-muted" />
                <input className="input-field pl-9 py-2 text-sm" placeholder="Hľadaj meno alebo email..."
                  value={userSearch} onChange={e => setUserSearch(e.target.value)} />
              </div>
              <div className="relative">
                <Filter size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-school-muted" />
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
                    {['Meno', 'Email', 'Trieda', 'Stav', ''].map(h => (
                      <th key={h} className="text-left py-2 px-3 text-school-muted font-semibold text-xs uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredUsers.map(user => (
                    <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-3 font-semibold text-school-navy">{user.first_name} {user.last_name}</td>
                      <td className="py-3 px-3 text-school-muted">{user.email}</td>
                      <td className="py-3 px-3"><span className="bg-school-blue text-white text-xs px-2 py-0.5 rounded-full font-medium">{user.class}</span></td>
                      <td className="py-3 px-3"><span className={user.status === 'approved' ? 'badge-approved' : 'badge-rejected'}>{user.status === 'approved' ? 'Schválený' : 'Zamietnutý'}</span></td>
                      <td className="py-3 px-3 text-right flex items-center justify-end gap-2">
                        {user.status === 'rejected' && (
                          <button onClick={() => approveUser(user.id)} className="text-emerald-600 hover:text-emerald-800 text-xs font-semibold">Schváliť</button>
                        )}
                        <button onClick={() => deleteUser(user.id, `${user.first_name} ${user.last_name}`)} className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-red-400 hover:text-red-600 transition-all">
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

        {/* Súbory */}
        {tab === 'Súbory' && (
          <div className="card shadow-card animate-fade-in">
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-school-muted" />
                <input className="input-field pl-9 py-2 text-sm" placeholder="Hľadaj súbor..."
                  value={fileSearch} onChange={e => setFileSearch(e.target.value)} />
              </div>
              <div className="relative">
                <Filter size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-school-muted" />
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
                    {['Súbor', 'Nahrál', 'Trieda', 'Veľkosť', 'Dátum', ''].map(h => (
                      <th key={h} className="text-left py-2 px-3 text-school-muted font-semibold text-xs uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredFiles.map(file => (
                    <tr key={file.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{getFileIcon(file.file_type)}</span>
                          <div>
                            <p className="font-semibold text-school-navy line-clamp-1" style={{ maxWidth: '180px' }}>{file.original_name}</p>
                            {file.description && <p className="text-xs text-school-muted line-clamp-1">{file.description}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-school-muted">{file.profiles?.first_name} {file.profiles?.last_name}</td>
                      <td className="py-3 px-3"><span className="bg-school-blue text-white text-xs px-2 py-0.5 rounded-full font-medium">{file.class}</span></td>
                      <td className="py-3 px-3 text-school-muted text-xs">{file.file_size ? formatFileSize(file.file_size) : '—'}</td>
                      <td className="py-3 px-3 text-school-muted text-xs">{new Date(file.created_at).toLocaleDateString('sk-SK')}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center justify-end gap-2">
                          <a href={file.file_url} target="_blank" rel="noopener noreferrer" className="w-7 h-7 rounded-lg hover:bg-blue-50 flex items-center justify-center text-school-blue transition-all">
                            <Download size={14} />
                          </a>
                          <button onClick={() => deleteFile(file)} className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-red-400 hover:text-red-600 transition-all">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredFiles.length === 0 && <p className="text-center text-school-muted py-10 text-sm">Žiadne súbory nezodpovedajú filtru.</p>}
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

function StatCard({ icon, label, value, color }) {
  const colors = {
    amber: 'bg-amber-50 border-amber-100 text-amber-600',
    blue: 'bg-blue-50 border-blue-100 text-blue-600',
    emerald: 'bg-emerald-50 border-emerald-100 text-emerald-600',
  };
  return (
    <div className={`rounded-2xl border p-5 ${colors[color]}`}>
      <div className="flex items-center justify-between mb-3">{icon}<span className="text-xs font-semibold opacity-60 uppercase tracking-wide">{label}</span></div>
      <p className="text-3xl font-bold text-school-navy" style={{ fontFamily: 'Sora, sans-serif' }}>{value}</p>
    </div>
  );
}
