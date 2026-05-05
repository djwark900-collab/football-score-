import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy as TrophyIcon, 
  Users as UsersIcon, 
  Target as TargetIcon, 
  Calendar as CalendarIcon, 
  Plus as PlusIcon, 
  Trash2 as Trash2Icon, 
  Save as SaveIcon, 
  ChevronRight as ChevronRightIcon,
  Globe as GlobeIcon,
  MapPin as MapPinIcon,
  Image as LucideImage,
  Shield as ShieldIcon,
  Lock as LockIcon
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { League, Team, Game, Venue, Player } from '../types';
import { cn } from '../lib/utils';

interface AdminPanelProps {
  leagues: League[];
  teams: Team[];
  games: Game[];
  user: any;
  onLogin: () => void;
  defaultLeagueId?: string;
}

type Tab = 'leagues' | 'teams' | 'games' | 'venues' | 'players';

export function AdminPanel({ leagues, teams, games, user, onLogin, defaultLeagueId }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>(defaultLeagueId ? 'games' : 'leagues');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form States
  const [leagueForm, setLeagueForm] = useState<{
    name: string;
    country: string;
    logo: string;
    description: string;
    history: { season: string; winnerId: string; }[];
  }>({ name: '', country: '', logo: '', description: '', history: [] });
  const [historyForm, setHistoryForm] = useState({ season: '', winnerId: '' });
  const [teamForm, setTeamForm] = useState({ name: '', leagueId: defaultLeagueId || '', logo: '' });
  const [gameForm, setGameForm] = useState({ 
    leagueId: defaultLeagueId || '', 
    homeTeamId: '', 
    awayTeamId: '', 
    date: new Date().toISOString().slice(0, 16),
    status: 'scheduled' as const,
    homeScore: 0,
    awayScore: 0,
    attendance: 0,
    venueId: '',
    round: ''
  });
  const [playerForm, setPlayerForm] = useState({ name: '', teamId: '', position: '', number: 0 });
  const [venueForm, setVenueForm] = useState({ name: '', city: '', capacity: 0 });

  const handleAddLeague = async () => {
    if (!leagueForm.name) return;
    setLoading(true);
    const path = editingId ? `leagues/${editingId}` : 'leagues';
    try {
      if (editingId) {
        await updateDoc(doc(db, 'leagues', editingId), leagueForm);
      } else {
        await addDoc(collection(db, 'leagues'), leagueForm);
      }
      setLeagueForm({ name: '', country: '', logo: '', description: '', history: [] });
      setEditingId(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    } finally {
      setLoading(false);
    }
  };

  const addHistoryEntry = () => {
    if (!historyForm.season || !historyForm.winnerId) return;
    setLeagueForm({
      ...leagueForm,
      history: [...(leagueForm.history || []), historyForm]
    });
    setHistoryForm({ season: '', winnerId: '' });
  };

  const removeHistoryEntry = (index: number) => {
    const newHistory = [...(leagueForm.history || [])];
    newHistory.splice(index, 1);
    setLeagueForm({ ...leagueForm, history: newHistory });
  };

  const handleAddTeam = async () => {
    if (!teamForm.name || !teamForm.leagueId) return;
    setLoading(true);
    const path = editingId ? `teams/${editingId}` : 'teams';
    try {
      if (editingId) {
        await updateDoc(doc(db, 'teams', editingId), teamForm);
      } else {
        await addDoc(collection(db, 'teams'), teamForm);
      }
      setTeamForm({ name: '', leagueId: defaultLeagueId || '', logo: '' });
      setEditingId(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    } finally {
      setLoading(false);
    }
  };

  const handleAddGame = async () => {
    if (!gameForm.homeTeamId || !gameForm.awayTeamId) return;
    setLoading(true);
    const path = editingId ? `games/${editingId}` : 'games';
    try {
      if (editingId) {
        await updateDoc(doc(db, 'games', editingId), gameForm);
      } else {
        await addDoc(collection(db, 'games'), gameForm);
      }
      setGameForm({ 
        leagueId: defaultLeagueId || '', homeTeamId: '', awayTeamId: '', 
        date: new Date().toISOString().slice(0, 16),
        status: 'scheduled', homeScore: 0, awayScore: 0,
        attendance: 0, venueId: '', round: ''
      });
      setEditingId(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPlayer = async () => {
    if (!playerForm.name || !playerForm.teamId) return;
    setLoading(true);
    const path = 'players';
    try {
      await addDoc(collection(db, path), playerForm);
      setPlayerForm({ name: '', teamId: '', position: '', number: 0 });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    } finally {
      setLoading(false);
    }
  };

  const handleAddVenue = async () => {
    if (!venueForm.name) return;
    setLoading(true);
    const path = 'venues';
    try {
      await addDoc(collection(db, path), venueForm);
      setVenueForm({ name: '', city: '', capacity: 0 });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    } finally {
      setLoading(false);
    }
  };

  const updateGameScore = async (gameId: string, home: number, away: number) => {
    const path = `games/${gameId}`;
    try {
      await updateDoc(doc(db, 'games', gameId), { homeScore: home, awayScore: away });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  };

  const startEditingLeague = (l: League) => {
    setEditingId(l.id);
    setLeagueForm({ 
      name: l.name, 
      country: l.country || '', 
      logo: l.logo || '', 
      description: l.description || '',
      history: l.history || []
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startEditingTeam = (t: Team) => {
    setEditingId(t.id);
    setTeamForm({ name: t.name, leagueId: t.leagueId, logo: t.logo || '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startEditingGame = (g: Game) => {
    setEditingId(g.id);
    setGameForm({ 
      leagueId: g.leagueId, 
      homeTeamId: g.homeTeamId, 
      awayTeamId: g.awayTeamId, 
      date: g.date, 
      status: g.status, 
      homeScore: g.homeScore, 
      awayScore: g.awayScore,
      attendance: g.attendance || 0,
      venueId: g.venueId || '',
      round: g.round || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setLeagueForm({ name: '', country: '', logo: '', description: '', history: [] });
    setTeamForm({ name: '', leagueId: defaultLeagueId || '', logo: '' });
    setGameForm({ 
      leagueId: defaultLeagueId || '', homeTeamId: '', awayTeamId: '', 
      date: new Date().toISOString().slice(0, 16),
      status: 'scheduled', homeScore: 0, awayScore: 0,
      attendance: 0, venueId: '', round: ''
    });
  };

  const handleDelete = async (coll: string, id: string) => {
    if (confirm('Delete this item?')) {
      const path = `${coll}/${id}`;
      try {
        await deleteDoc(doc(db, coll, id));
      } catch (e) {
        handleFirestoreError(e, OperationType.DELETE, path);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (base64: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        callback(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {!user ? (
        <div className="p-12 text-center bg-white rounded-[40px] border border-gray-100 shadow-xl">
          <GlobeIcon className="w-16 h-16 mx-auto mb-6 text-gray-200" />
          <h2 className="text-2xl font-black mb-2">Authentication Required</h2>
          <p className="text-gray-500 mb-8 max-w-sm mx-auto">You must be signed in with Google to perform management actions.</p>
          <button 
            onClick={onLogin}
            className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all inline-flex items-center gap-3"
          >
            Sign in with Google
          </button>
        </div>
      ) : user.email !== 'pitop6988@gmail.com' ? (
        <div className="p-12 text-center bg-white rounded-[40px] border border-gray-100 shadow-xl">
          <LockIcon className="w-16 h-16 mx-auto mb-6 text-red-100" />
          <h2 className="text-2xl font-black mb-2">Access Restricted</h2>
          <p className="text-gray-500 mb-8 max-w-sm mx-auto">Your account ({user.email}) does not have permission to modify data.</p>
          <button 
            onClick={onLogin}
            className="px-8 py-4 bg-gray-900 text-white rounded-2xl font-bold transition-all"
          >
            Switch Account
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-3xl font-black">Management</h2>
        <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm overflow-x-auto scrollbar-none w-full sm:w-auto">
          <TabButton active={activeTab === 'leagues'} onClick={() => setActiveTab('leagues')} icon={<GlobeIcon size={18} />} label="Leagues" />
          <TabButton active={activeTab === 'teams'} onClick={() => setActiveTab('teams')} icon={<UsersIcon size={18} />} label="Teams" />
          <TabButton active={activeTab === 'games'} onClick={() => setActiveTab('games')} icon={<CalendarIcon size={18} />} label="Games" />
          <TabButton active={activeTab === 'players'} onClick={() => setActiveTab('players')} icon={<TargetIcon size={18} />} label="Players" />
          <TabButton active={activeTab === 'venues'} onClick={() => setActiveTab('venues')} icon={<MapPinIcon size={18} />} label="Venues" />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'players' && (
          <motion.div key="players-tab" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <AdminCard title="Add New Player" icon={<TargetIcon className="text-blue-600" />}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Player Name" value={playerForm.name} onChange={v => setPlayerForm({ ...playerForm, name: v })} placeholder="e.g. Cristiano Ronaldo" />
                <Select label="Assign to Team" value={playerForm.teamId} onChange={v => setPlayerForm({ ...playerForm, teamId: v })} options={teams.map(t => ({ label: t.name, value: t.id }))} />
                <Input label="Position" value={playerForm.position} onChange={v => setPlayerForm({ ...playerForm, position: v })} placeholder="e.g. Forward" />
                <Input type="number" label="Shirt Number" value={playerForm.number} onChange={v => setPlayerForm({ ...playerForm, number: parseInt(v) })} />
                <div className="sm:col-span-2 flex justify-end">
                  <button onClick={handleAddPlayer} disabled={loading} className="px-8 h-[54px] bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all">
                    <PlusIcon size={20} /> Add Player
                  </button>
                </div>
              </div>
            </AdminCard>
          </motion.div>
        )}

        {activeTab === 'venues' && (
          <motion.div key="venues-tab" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <AdminCard title="Add New Venue" icon={<MapPinIcon className="text-blue-600" />}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input label="Venue Name" value={venueForm.name} onChange={v => setVenueForm({ ...venueForm, name: v })} placeholder="e.g. Old Trafford" />
                <Input label="City" value={venueForm.city} onChange={v => setVenueForm({ ...venueForm, city: v })} placeholder="e.g. Manchester" />
                <Input type="number" label="Capacity" value={venueForm.capacity} onChange={v => setVenueForm({ ...venueForm, capacity: parseInt(v) })} />
                <div className="sm:col-span-3 flex justify-end">
                  <button onClick={handleAddVenue} disabled={loading} className="px-8 h-[54px] bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all">
                    <PlusIcon size={20} /> Add Venue
                  </button>
                </div>
              </div>
            </AdminCard>
          </motion.div>
        )}
        {activeTab === 'leagues' && (
          <motion.div key="leagues-tab" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <AdminCard title={editingId ? "Edit League" : "Add New League"} icon={<TrophyIcon className="text-blue-600" />}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="League Name" value={leagueForm.name} onChange={v => setLeagueForm({ ...leagueForm, name: v })} placeholder="e.g. Premier League" />
                <Input label="Country" value={leagueForm.country} onChange={v => setLeagueForm({ ...leagueForm, country: v })} placeholder="e.g. England" />
                <div className="sm:col-span-2">
                   <Input label="Description" value={leagueForm.description} onChange={v => setLeagueForm({ ...leagueForm, description: v })} placeholder="League history and details..." />
                </div>

                <div className="sm:col-span-2 border-t border-gray-100 pt-6">
                  <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4">Historical Winners</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                    <Input label="Season" value={historyForm.season} onChange={v => setHistoryForm({ ...historyForm, season: v })} placeholder="e.g. 2023/24" />
                    <Select 
                      label="Winner" 
                      value={historyForm.winnerId} 
                      onChange={v => setHistoryForm({ ...historyForm, winnerId: v })} 
                      options={teams.filter(t => t.leagueId === editingId || !editingId).map(t => ({ label: t.name, value: t.id }))} 
                    />
                    <div className="pt-7">
                      <button 
                        type="button"
                        onClick={addHistoryEntry}
                        className="w-full h-[54px] bg-gray-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all"
                      >
                        <PlusIcon size={18} /> Add Entry
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {leagueForm.history?.map((h, i) => {
                      const winner = teams.find(t => t.id === h.winnerId);
                      return (
                        <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                          <div className="flex items-center gap-4">
                            <span className="font-black text-xs text-gray-400">{h.season}</span>
                            <span className="font-bold text-sm">{winner?.name || 'Unknown Team'}</span>
                          </div>
                          <button onClick={() => removeHistoryEntry(i)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all">
                            <Trash2Icon size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">League Logo (File or URL)</label>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      value={leagueForm.logo}
                      onChange={e => setLeagueForm({ ...leagueForm, logo: e.target.value })}
                      placeholder="Paste image URL..."
                      className="flex-1 p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-600 transition-all font-medium"
                    />
                    <label className="p-4 bg-gray-100 rounded-2xl cursor-pointer hover:bg-gray-200 transition-colors flex items-center justify-center min-w-[54px]">
                      <LucideImage size={20} className="text-gray-500" />
                      <input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, (b) => setLeagueForm({ ...leagueForm, logo: b }))} />
                    </label>
                  </div>
                  {leagueForm.logo && <img src={leagueForm.logo} alt="Preview" className="h-12 w-12 rounded-xl object-contain bg-gray-50 p-1 mt-2 border" />}
                </div>
                <div className="sm:pt-7 flex gap-2">
                  {editingId && (
                    <button onClick={cancelEdit} className="px-6 h-[54px] bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all">
                      Cancel
                    </button>
                  )}
                  <button onClick={handleAddLeague} disabled={loading} className="flex-1 h-[54px] bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all">
                    {editingId ? <SaveIcon size={20} /> : <PlusIcon size={20} />}
                    {editingId ? "Save Changes" : "Add League"}
                  </button>
                </div>
              </div>
            </AdminCard>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {leagues.map(l => (
                <div key={l.id} className="p-4 bg-white rounded-3xl border border-gray-100 flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center overflow-hidden">
                      {l.logo ? <img src={l.logo} alt="" className="w-full h-full object-contain" /> : <GlobeIcon className="text-gray-300" />}
                    </div>
                    <div>
                      <p className="font-bold text-sm">{l.name}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">{l.country}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => startEditingLeague(l)} 
                      className="p-3 text-blue-500 bg-blue-50 rounded-2xl hover:bg-blue-100 transition-colors"
                      title="Edit League"
                    >
                      <SaveIcon size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete('leagues', l.id)} 
                      className="p-3 text-red-500 bg-red-50 rounded-2xl hover:bg-red-100 transition-colors"
                      title="Delete League"
                    >
                      <Trash2Icon size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'teams' && (
          <motion.div key="teams-tab" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <AdminCard title={editingId ? "Edit Team" : "Add New Team"} icon={<UsersIcon className="text-blue-600" />}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Team Name" value={teamForm.name} onChange={v => setTeamForm({ ...teamForm, name: v })} placeholder="e.g. Manchester United" />
                <Select label="Assign to League" value={teamForm.leagueId} onChange={v => setTeamForm({ ...teamForm, leagueId: v })} options={leagues.map(l => ({ label: l.name, value: l.id }))} />
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Team Logo (File or URL)</label>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      value={teamForm.logo}
                      onChange={e => setTeamForm({ ...teamForm, logo: e.target.value })}
                      placeholder="Paste image URL..."
                      className="flex-1 p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-600 transition-all font-medium"
                    />
                    <label className="p-4 bg-gray-100 rounded-2xl cursor-pointer hover:bg-gray-200 transition-colors flex items-center justify-center min-w-[54px]">
                      <LucideImage size={20} className="text-gray-500" />
                      <input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, (b) => setTeamForm({ ...teamForm, logo: b }))} />
                    </label>
                  </div>
                  {teamForm.logo && <img src={teamForm.logo} alt="Preview" className="h-12 w-12 rounded-xl object-contain bg-gray-50 p-1 mt-2 border" />}
                </div>
                <div className="sm:pt-7 flex gap-2">
                  {editingId && (
                    <button onClick={cancelEdit} className="px-6 h-[54px] bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all">
                      Cancel
                    </button>
                  )}
                  <button onClick={handleAddTeam} disabled={loading} className="flex-1 h-[54px] bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all">
                    {editingId ? <SaveIcon size={20} /> : <PlusIcon size={20} />}
                    {editingId ? "Save Changes" : "Add Team"}
                  </button>
                </div>
              </div>
            </AdminCard>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {teams.map(t => (
                <div key={t.id} className="p-4 bg-white rounded-3xl border border-gray-100 flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center overflow-hidden">
                      {t.logo ? <img src={t.logo} alt="" className="w-full h-full object-contain" /> : <ShieldIcon className="text-gray-300" />}
                    </div>
                    <div>
                      <p className="font-bold text-sm">{t.name}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">{leagues.find(l => l.id === t.leagueId)?.name}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => startEditingTeam(t)} 
                      className="p-3 text-blue-500 bg-blue-50 rounded-2xl hover:bg-blue-100 transition-colors"
                      title="Edit Team"
                    >
                      <SaveIcon size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete('teams', t.id)} 
                      className="p-3 text-red-500 bg-red-50 rounded-2xl hover:bg-red-100 transition-colors"
                      title="Delete Team"
                    >
                      <Trash2Icon size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'games' && (
          <motion.div key="games-tab" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <AdminCard title={editingId ? "Edit Game" : "Schedule New Game"} icon={<CalendarIcon className="text-blue-600" />}>
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Select 
                    label="Home Team" 
                    value={gameForm.homeTeamId} 
                    onChange={v => setGameForm({ ...gameForm, homeTeamId: v, leagueId: teams.find(t => t.id === v)?.leagueId || '' })} 
                    options={teams.map(t => ({ label: t.name, value: t.id }))} 
                  />
                  <div className="flex items-center justify-center pt-8 text-gray-300 font-black">VS</div>
                   <Select 
                    label="Away Team" 
                    value={gameForm.awayTeamId} 
                    onChange={v => setGameForm({ ...gameForm, awayTeamId: v })} 
                    options={teams.map(t => ({ label: t.name, value: t.id }))} 
                  />
                  <Input 
                    type="datetime-local" 
                    label="Date & Time" 
                    value={gameForm.date} 
                    onChange={v => setGameForm({ ...gameForm, date: v })} 
                  />
                   <Select 
                    label="Initial Status" 
                    value={gameForm.status} 
                    onChange={v => setGameForm({ ...gameForm, status: v as any })} 
                    options={[{label: 'Scheduled', value: 'scheduled'}, {label: 'Live', value: 'live'}, {label: 'Finished', value: 'finished'}]} 
                  />
                  <Input 
                    label="Round / Matchday" 
                    value={gameForm.round} 
                    onChange={v => setGameForm({ ...gameForm, round: v })}
                    placeholder="e.g. Matchday 1"
                  />
                  <div className="sm:pt-7 flex gap-2 sm:col-span-1">
                    {editingId && (
                      <button onClick={cancelEdit} className="px-6 h-[54px] bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all">
                        Cancel
                      </button>
                    )}
                    <button onClick={handleAddGame} disabled={loading} className="flex-1 h-[54px] bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all">
                      {editingId ? <SaveIcon size={20} /> : <PlusIcon size={20} />}
                      {editingId ? "Save Changes" : "Schedule Game"}
                    </button>
                  </div>
               </div>
            </AdminCard>

            <div className="space-y-4">
              {games.map(g => (
                <div key={g.id} className="p-6 bg-white rounded-[32px] border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center gap-6">
                   <div className="flex-1 flex justify-end gap-2 items-center font-bold">
                    {teams.find(t => t.id === g.homeTeamId)?.name}
                    <input 
                      type="number" 
                      value={g.homeScore} 
                      onChange={(e) => updateGameScore(g.id, parseInt(e.target.value), g.awayScore)}
                      className="w-12 h-10 bg-gray-50 rounded-xl text-center font-black border-none"
                    />
                   </div>
                   <div className="flex flex-col items-center">
                    <span className="text-[10px] font-black uppercase text-gray-300 tracking-widest whitespace-nowrap">{g.status}</span>
                    <div className="w-px h-4 bg-gray-100" />
                   </div>
                   <div className="flex-1 flex justify-start gap-2 items-center font-bold">
                    <input 
                      type="number" 
                      value={g.awayScore} 
                      onChange={(e) => updateGameScore(g.id, g.homeScore, parseInt(e.target.value))}
                      className="w-12 h-10 bg-gray-50 rounded-xl text-center font-black border-none"
                    />
                    {teams.find(t => t.id === g.awayTeamId)?.name}
                   </div>
                   <div className="flex gap-2">
                    <button 
                      onClick={() => startEditingGame(g)} 
                      className="p-3 text-blue-500 bg-blue-50 rounded-2xl hover:bg-blue-100 transition-all"
                      title="Edit Game"
                    >
                      <SaveIcon size={20} />
                    </button>
                    <button 
                      onClick={() => handleDelete('games', g.id)} 
                      className="p-3 text-red-500 bg-red-50 rounded-2xl hover:bg-red-100 transition-all"
                      title="Delete Game"
                    >
                      <Trash2Icon size={20} />
                    </button>
                   </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </>
      )}
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all",
        active ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : "text-gray-400 hover:text-gray-600"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function AdminCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm overflow-hidden relative">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-blue-50 rounded-2xl">{icon}</div>
        <h3 className="text-xl font-black">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Input({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: any; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">{label}</label>
      <input 
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-600 transition-all font-medium"
      />
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { label: string; value: string }[] }) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">{label}</label>
      <select 
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-600 transition-all font-medium appearance-none"
      >
        <option value="">Select Option</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}
