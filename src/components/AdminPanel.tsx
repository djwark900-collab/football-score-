import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy as TrophyIcon, 
  Users as UsersIcon, 
  Target as TargetIcon, 
  Calendar as CalendarIcon, 
  Plus as PlusIcon, 
  Trash2 as Trash2Icon, 
  Save as SaveIcon, 
  Edit as EditIcon,
  Upload as UploadIcon,
  X as XIcon,
  ChevronRight as ChevronRightIcon,
  Globe as GlobeIcon,
  MapPin as MapPinIcon,
  Image as LucideImage,
  Shield as ShieldIcon,
  Lock as LockIcon,
  Zap as ZapIcon,
  ArrowLeftRight as TransferIcon
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { League, Team, Game, Venue, Player, MatchEvent, Administrator, Transfer } from '../types';
import { cn } from '../lib/utils';

interface AdminPanelProps {
  leagues: League[];
  teams: Team[];
  games: Game[];
  players: Player[];
  venues: Venue[];
  transfers: Transfer[];
  administrators: Administrator[];
  user: any;
  onLogin: () => void;
  defaultLeagueId?: string;
  defaultTeamId?: string;
  defaultPlayerId?: string;
  quotaExceeded?: boolean;
}

type Tab = 'leagues' | 'teams' | 'games' | 'venues' | 'players' | 'admins' | 'transfers';

export function AdminPanel({ leagues, teams, games, players, venues, transfers, administrators, user, onLogin, defaultLeagueId, defaultTeamId, defaultPlayerId, quotaExceeded }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>(defaultPlayerId || defaultTeamId ? 'players' : (defaultLeagueId ? 'games' : 'leagues'));
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(defaultPlayerId || null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (defaultPlayerId) {
      const p = players.find(player => player.id === defaultPlayerId);
      if (p) {
        setPlayerForm({ 
          name: p.name, 
          teamId: p.teamId, 
          position: p.position || '', 
          number: p.number || 0,
          imageUrl: p.imageUrl || '',
          overview: p.overview || '',
          career: p.career || '',
          transferHistory: p.transferHistory || ''
        });
      }
    }
  }, [defaultPlayerId, players]);

  // Form States
  const [leagueForm, setLeagueForm] = useState<{
    name: string;
    country: string;
    logo: string;
    description: string;
    type: 'league' | 'cup';
    currentSeasonId: string;
    history: { season: string; winnerId: string; }[];
  }>({ name: '', country: '', logo: '', description: '', type: 'league', currentSeasonId: '', history: [] });
  
  const [historyForm, setHistoryForm] = useState<{
    season: string;
    winnerId: string;
    editingIndex: number | null;
  }>({ season: '', winnerId: '', editingIndex: null });
  const [teamForm, setTeamForm] = useState({ name: '', leagueId: defaultLeagueId || '', logo: '' });
  const [gameForm, setGameForm] = useState<{
    leagueId: string;
    homeTeamId: string;
    awayTeamId: string;
    date: string;
    status: 'scheduled' | 'live' | 'finished';
    homeScore: number;
    awayScore: number;
    attendance: number;
    venueId: string;
    round: string;
    currentTime: string;
    events: MatchEvent[];
    lineups: { home: string[]; away: string[]; };
  }>({ 
    leagueId: defaultLeagueId || '', 
    homeTeamId: '', 
    awayTeamId: '', 
    date: new Date().toISOString().slice(0, 16),
    status: 'scheduled',
    homeScore: 0,
    awayScore: 0,
    attendance: 0,
    venueId: '',
    round: '',
    currentTime: '',
    events: [],
    lineups: { home: [], away: [] }
  });
  const [eventForm, setEventForm] = useState({
    type: 'goal' as 'goal' | 'yellow' | 'red' | 'sub',
    minute: 0,
    playerId: '',
    teamId: '',
    assistantId: '',
    playerInId: '',
    playerOutId: ''
  });
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [playerForm, setPlayerForm] = useState({ 
    name: '', 
    teamId: defaultTeamId || '', 
    position: '', 
    number: 0,
    imageUrl: '',
    overview: '',
    career: '',
    transferHistory: '' 
  });
  const [venueForm, setVenueForm] = useState({ name: '', city: '', capacity: 0 });
  const [adminForm, setAdminForm] = useState({ email: '', role: 'editor' as 'editor' | 'super' });
  const [transferForm, setTransferForm] = useState({
    playerId: '',
    fromTeamId: '',
    toTeamId: '',
    date: new Date().toISOString().slice(0, 10),
    fee: '',
    type: 'permanent' as 'permanent' | 'loan' | 'free'
  });

  const showFeedback = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleAddLeague = async () => {
    if (!leagueForm.name) return;
    setLoading(true);
    const path = editingId ? `leagues/${editingId}` : 'leagues';
    try {
      if (editingId) {
        await updateDoc(doc(db, 'leagues', editingId), leagueForm);
        showFeedback('League details & logo updated!');
      } else {
        await addDoc(collection(db, 'leagues'), leagueForm);
        showFeedback('League added successfully!');
      }
      setLeagueForm({ name: '', country: '', logo: '', description: '', type: 'league', currentSeasonId: '', history: [] });
      setEditingId(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    } finally {
      setLoading(false);
    }
  };

  const addHistoryEntry = () => {
    if (!historyForm.season || !historyForm.winnerId) return;
    
    const newHistory = [...(leagueForm.history || [])];
    const entry = { season: historyForm.season, winnerId: historyForm.winnerId };

    if (historyForm.editingIndex !== null) {
      newHistory[historyForm.editingIndex] = entry;
    } else {
      newHistory.push(entry);
    }

    setLeagueForm({
      ...leagueForm,
      history: newHistory
    });
    setHistoryForm({ season: '', winnerId: '', editingIndex: null });
  };

  const startEditingHistory = (index: number) => {
    const entry = leagueForm.history![index];
    setHistoryForm({
      season: entry.season,
      winnerId: entry.winnerId,
      editingIndex: index
    });
  };

  const cancelHistoryEdit = () => {
    setHistoryForm({ season: '', winnerId: '', editingIndex: null });
  };

  const removeHistoryEntry = (index: number) => {
    const newHistory = [...(leagueForm.history || [])];
    newHistory.splice(index, 1);
    setLeagueForm({ ...leagueForm, history: newHistory });
  };

  const handleAddTeam = async () => {
    if (!teamForm.name.trim() || !teamForm.leagueId) {
      alert('Please enter a team name and select a league.');
      return;
    }
    setLoading(true);
    const path = editingId ? `teams/${editingId}` : 'teams';
    try {
      if (editingId) {
        await updateDoc(doc(db, 'teams', editingId), teamForm);
        showFeedback('Team profile & logo updated!');
      } else {
        await addDoc(collection(db, 'teams'), teamForm);
        showFeedback('Team registered successfully!');
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
        showFeedback('Match details updated!');
      } else {
        await addDoc(collection(db, 'games'), gameForm);
        showFeedback('Match scheduled successfully!');
      }
      setGameForm({ 
        leagueId: defaultLeagueId || '', 
        homeTeamId: '', 
        awayTeamId: '', 
        date: new Date().toISOString().slice(0, 16),
        status: 'scheduled',
        homeScore: 0,
        awayScore: 0,
        attendance: 0,
        venueId: '',
        round: '',
        currentTime: '',
        events: [],
        lineups: { home: [], away: [] }
      });
      setEditingId(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    } finally {
      setLoading(false);
    }
  };

  const addMatchEvent = () => {
    if ((!eventForm.playerId && !eventForm.playerInId) || !eventForm.teamId) return;
    
    let newEvents = [...gameForm.events];
    const eventData = {
      ...eventForm,
      playerId: eventForm.type === 'sub' ? (eventForm.playerInId || '') : eventForm.playerId
    };

    if (editingEventId) {
      newEvents = newEvents.map(e => e.id === editingEventId ? { ...eventData, id: e.id } : e);
    } else {
      newEvents.push({
        id: Math.random().toString(36).substr(2, 9),
        ...eventData
      });
    }

    setGameForm({
      ...gameForm,
      events: newEvents
    });
    setEventForm({
      type: 'goal',
      minute: 0,
      playerId: '',
      teamId: '',
      assistantId: '',
      playerInId: '',
      playerOutId: ''
    });
    setEditingEventId(null);
  };

  const startEditingEvent = (e: MatchEvent) => {
    setEditingEventId(e.id);
    setEventForm({
      type: e.type,
      minute: e.minute,
      playerId: e.type !== 'sub' ? e.playerId : '',
      teamId: e.teamId,
      assistantId: e.assistantId || '',
      playerInId: e.playerInId || (e.type === 'sub' ? e.playerId : ''),
      playerOutId: e.playerOutId || ''
    });
  };

  const cancelEventEdit = () => {
    setEditingEventId(null);
    setEventForm({
      type: 'goal',
      minute: 0,
      playerId: '',
      teamId: '',
      assistantId: '',
      playerInId: '',
      playerOutId: ''
    });
  };

  const removeMatchEvent = (id: string) => {
    setGameForm({
      ...gameForm,
      events: gameForm.events.filter(e => e.id !== id)
    });
  };

  const toggleLineupPlayer = (teamType: 'home' | 'away', playerId: string) => {
    const current = gameForm.lineups[teamType];
    const updated = current.includes(playerId) 
      ? current.filter(id => id !== playerId)
      : [...current, playerId];
    
    setGameForm({
      ...gameForm,
      lineups: {
        ...gameForm.lineups,
        [teamType]: updated
      }
    });
  };

  const handleAddPlayer = async () => {
    if (!playerForm.name || !playerForm.teamId) return;
    setLoading(true);
    const path = editingId ? `players/${editingId}` : 'players';
    try {
      if (editingId) {
        await updateDoc(doc(db, 'players', editingId), playerForm);
        showFeedback('Player profile & photo updated!');
      } else {
        await addDoc(collection(db, 'players'), playerForm);
        showFeedback('Player & photo saved successfully!');
      }
      setPlayerForm({ 
        name: '', 
        teamId: defaultTeamId || '', 
        position: '', 
        number: 0,
        imageUrl: '',
        overview: '',
        career: '',
        transferHistory: '' 
      });
      setEditingId(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    } finally {
      setLoading(false);
    }
  };

  const startEditingPlayer = (p: Player) => {
    setEditingId(p.id);
    setPlayerForm({ 
      name: p.name, 
      teamId: p.teamId, 
      position: p.position || '', 
      number: p.number || 0,
      imageUrl: p.imageUrl || '',
      overview: p.overview || '',
      career: p.career || '',
      transferHistory: p.transferHistory || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddVenue = async () => {
    if (!venueForm.name) return;
    setLoading(true);
    const path = editingId ? `venues/${editingId}` : 'venues';
    try {
      if (editingId) {
        await updateDoc(doc(db, 'venues', editingId), venueForm);
        showFeedback('Venue updated successfully!');
      } else {
        await addDoc(collection(db, 'venues'), venueForm);
        showFeedback('Venue added successfully!');
      }
      setVenueForm({ name: '', city: '', capacity: 0 });
      setEditingId(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdmin = async () => {
    if (!adminForm.email) return;
    setLoading(true);
    const path = 'admins';
    try {
      await addDoc(collection(db, 'admins'), adminForm);
      setAdminForm({ email: '', role: 'editor' });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTransfer = async () => {
    if (!transferForm.playerId || !transferForm.fromTeamId || !transferForm.toTeamId) return;
    setLoading(true);
    const path = editingId ? `transfers/${editingId}` : 'transfers';
    try {
      if (editingId) {
        await updateDoc(doc(db, 'transfers', editingId), transferForm);
        showFeedback('Transfer record updated!');
      } else {
        await addDoc(collection(db, 'transfers'), transferForm);
        showFeedback('Transfer recorded successfully!');
        // Bonus: Update player's team automatically? 
        // For a simple app, we can just leave it as historical record, 
        // but maybe the user expects the player to move.
        const player = players.find(p => p.id === transferForm.playerId);
        if (player) {
          await updateDoc(doc(db, 'players', player.id), { teamId: transferForm.toTeamId });
        }
      }
      setTransferForm({
        playerId: '',
        fromTeamId: '',
        toTeamId: '',
        date: new Date().toISOString().slice(0, 10),
        fee: '',
        type: 'permanent'
      });
      setEditingId(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    } finally {
      setLoading(false);
    }
  };

  const startEditingTransfer = (t: Transfer) => {
    setEditingId(t.id);
    setTransferForm({
      playerId: t.playerId,
      fromTeamId: t.fromTeamId,
      toTeamId: t.toTeamId,
      date: t.date,
      fee: t.fee || '',
      type: t.type
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startEditingVenue = (v: Venue) => {
    setEditingId(v.id);
    setVenueForm({ name: v.name, city: v.city || '', capacity: v.capacity || 0 });
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
      type: l.type || 'league',
      currentSeasonId: l.currentSeasonId || '',
      history: l.history || []
    });
    setHistoryForm({ season: '', winnerId: '', editingIndex: null });
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
      seasonId: g.seasonId || '',
      date: g.date, 
      status: g.status, 
      homeScore: g.homeScore, 
      awayScore: g.awayScore,
      attendance: g.attendance || 0,
      venueId: g.venueId || '',
      round: g.round || '',
      currentTime: g.currentTime || '',
      events: g.events || [],
      lineups: g.lineups || { home: [], away: [] }
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setPlayerForm({ 
      name: '', 
      teamId: '', 
      position: '', 
      number: 0,
      imageUrl: '',
      overview: '',
      career: '',
      transferHistory: '' 
    });
    setVenueForm({ name: '', city: '', capacity: 0 });
    setEditingId(null);
    setLeagueForm({ name: '', country: '', logo: '', description: '', currentSeasonId: '', history: [] });
    setHistoryForm({ season: '', winnerId: '', editingIndex: null });
    setTeamForm({ name: '', leagueId: defaultLeagueId || '', logo: '' });
    setGameForm({ 
      leagueId: defaultLeagueId || '', homeTeamId: '', awayTeamId: '',
      date: new Date().toISOString().slice(0, 16),
      status: 'scheduled', homeScore: 0, awayScore: 0,
      attendance: 0, venueId: '', round: '',
      currentTime: '',
      events: [],
      lineups: { home: [], away: [] }
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
      if (file.size > 1024 * 1024) {
        alert('File is too large. Maximum size is 1MB to ensure database stability.');
        return;
      }
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
      ) : (user.email !== 'pitop6988@gmail.com' && !administrators.some(a => a.email.toLowerCase() === user.email?.toLowerCase())) ? (
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
          {quotaExceeded && (
            <div className="mb-6 p-6 bg-orange-50 border border-orange-100 rounded-[32px] flex flex-col sm:flex-row items-center gap-6 animate-in slide-in-from-top-4 duration-500">
              <div className="w-16 h-16 bg-white rounded-[24px] flex items-center justify-center text-3xl shadow-sm shrink-0">
                ⚠️
              </div>
              <div className="text-center sm:text-left">
                <p className="text-lg font-black text-orange-900 tracking-tight">Connectivity Notice</p>
                <p className="text-sm text-orange-700 font-medium leading-relaxed">
                  The database connection is limited (it may be at capacity or your connection is unstable). 
                  Data shown may be stale, and new changes might not reflect immediately.
                </p>
              </div>
            </div>
          )}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-3xl font-black">Management</h2>
        <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm overflow-x-auto scrollbar-none w-full sm:w-auto">
          <TabButton active={activeTab === 'leagues'} onClick={() => { setActiveTab('leagues'); cancelEdit(); }} icon={<GlobeIcon size={18} />} label="Leagues" />
          <TabButton active={activeTab === 'teams'} onClick={() => { setActiveTab('teams'); cancelEdit(); }} icon={<UsersIcon size={18} />} label="Teams" />
          <TabButton active={activeTab === 'games'} onClick={() => { setActiveTab('games'); cancelEdit(); }} icon={<CalendarIcon size={18} />} label="Games" />
          <TabButton active={activeTab === 'players'} onClick={() => { setActiveTab('players'); cancelEdit(); }} icon={<TargetIcon size={18} />} label="Players" />
          <TabButton active={activeTab === 'transfers'} onClick={() => { setActiveTab('transfers'); cancelEdit(); }} icon={<TransferIcon size={18} />} label="Transfers" />
          <TabButton active={activeTab === 'venues'} onClick={() => { setActiveTab('venues'); cancelEdit(); }} icon={<MapPinIcon size={18} />} label="Venues" />
          <TabButton active={activeTab === 'admins'} onClick={() => { setActiveTab('admins'); cancelEdit(); }} icon={<ShieldIcon size={18} />} label="Admins" />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button 
          onClick={() => { setActiveTab('leagues'); cancelEdit(); }}
          className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col items-center gap-3 text-center"
        >
          <div className="p-3 bg-blue-50 rounded-2xl">
            <PlusIcon className="text-blue-600" />
          </div>
          <div>
            <p className="font-black text-sm">Add League</p>
            <p className="text-[10px] text-gray-400 font-bold uppercase">Create League</p>
          </div>
        </button>
        <button 
          onClick={() => { setActiveTab('games'); cancelEdit(); }}
          className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col items-center gap-3 text-center"
        >
          <div className="p-3 bg-green-50 rounded-2xl">
            <PlusIcon className="text-green-600" />
          </div>
          <div>
            <p className="font-black text-sm">Add Game</p>
            <p className="text-[10px] text-gray-400 font-bold uppercase">Schedule Match</p>
          </div>
        </button>
        <button 
          onClick={() => { setActiveTab('teams'); cancelEdit(); }}
          className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col items-center gap-3 text-center"
        >
          <div className="p-3 bg-purple-50 rounded-2xl">
            <PlusIcon className="text-purple-600" />
          </div>
          <div>
            <p className="font-black text-sm">Add Team</p>
            <p className="text-[10px] text-gray-400 font-bold uppercase">Register Club</p>
          </div>
        </button>
        <button 
          onClick={() => { setActiveTab('players'); cancelEdit(); }}
          className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col items-center gap-3 text-center"
        >
          <div className="p-3 bg-orange-50 rounded-2xl">
            <PlusIcon className="text-orange-600" />
          </div>
          <div>
            <p className="font-black text-sm">Add Player</p>
            <p className="text-[10px] text-gray-400 font-bold uppercase">New Signing</p>
          </div>
        </button>
      </div>

      <AnimatePresence>
        {successMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed top-8 left-1/2 -translate-x-1/2 z-[100]"
          >
            <div className="bg-green-600 text-white px-8 py-4 rounded-[24px] shadow-2xl shadow-green-100 border border-green-500 flex items-center gap-3 font-black">
              <ZapIcon size={20} className="animate-pulse" />
              {successMessage}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
          {activeTab === 'admins' && (
            <motion.div key="admins-tab" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              <AdminCard title="Add Administrator" icon={<ShieldIcon className="text-blue-600" />}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input label="Email Address" value={adminForm.email} onChange={v => setAdminForm({ ...adminForm, email: v })} placeholder="e.g. user@example.com" />
                  <Select label="Role" value={adminForm.role} onChange={v => setAdminForm({ ...adminForm, role: v as 'editor' | 'super' })} options={[{ label: 'Editor', value: 'editor' }, { label: 'Super Admin', value: 'super' }]} />
                  <div className="sm:pt-7">
                    <button onClick={handleAddAdmin} disabled={loading} className="w-full h-[54px] bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all">
                      <PlusIcon size={20} />
                      Add Admin
                    </button>
                  </div>
                </div>
              </AdminCard>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-3xl flex items-center justify-between">
                   <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center">
                      <ShieldIcon className="text-blue-600" size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-sm">pitop6988@gmail.com</p>
                      <p className="text-[10px] text-blue-400 font-bold uppercase">System Super Admin (Hardcoded)</p>
                    </div>
                  </div>
                </div>
                {administrators.map(admin => (
                  <div key={admin.id} className="p-4 bg-white rounded-3xl border border-gray-100 flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
                        <ShieldIcon className="text-gray-300" size={18} />
                      </div>
                      <div>
                        <p className="font-bold text-sm">{admin.email}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">{admin.role} Admin</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDelete('admins', admin.id)} 
                      className="p-3 text-red-500 bg-red-50 rounded-2xl hover:bg-red-100 transition-all"
                      title="Remove Admin"
                    >
                      <Trash2Icon size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

        {activeTab === 'players' && (
          <motion.div key="players-tab" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <AdminCard title={editingId ? "Edit Player" : "Add New Player"} icon={<TargetIcon className="text-blue-600" />}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Player Name" value={playerForm.name} onChange={v => setPlayerForm({ ...playerForm, name: v })} placeholder="e.g. Cristiano Ronaldo" />
                <Select label="Assign to Team" value={playerForm.teamId} onChange={v => setPlayerForm({ ...playerForm, teamId: v })} options={teams.map(t => ({ label: `${t.name} (${leagues.find(l => l.id === t.leagueId)?.name})`, value: t.id }))} />
                <Input label="Position" value={playerForm.position} onChange={v => setPlayerForm({ ...playerForm, position: v })} placeholder="e.g. Forward" />
                <Input type="number" label="Shirt Number" value={playerForm.number} onChange={v => setPlayerForm({ ...playerForm, number: parseInt(v) })} />
                
                <ImageUpload 
                  label="Player Image (File or URL)" 
                  value={playerForm.imageUrl} 
                  onChange={v => setPlayerForm({ ...playerForm, imageUrl: v })}
                  onFileSelect={handleFileUpload}
                />

                <div className="sm:col-span-2 space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Overview</label>
                    <textarea 
                      value={playerForm.overview}
                      onChange={e => setPlayerForm({ ...playerForm, overview: e.target.value })}
                      placeholder="Player performance summary, key traits..."
                      className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-600 transition-all font-medium min-h-[100px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Career History</label>
                    <textarea 
                      value={playerForm.career}
                      onChange={e => setPlayerForm({ ...playerForm, career: e.target.value })}
                      placeholder="Previous clubs, major achievements..."
                      className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-600 transition-all font-medium min-h-[100px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Transfer History</label>
                    <textarea 
                      value={playerForm.transferHistory}
                      onChange={e => setPlayerForm({ ...playerForm, transferHistory: e.target.value })}
                      placeholder="e.g. 2023: Team A -> Team B ($50M)..."
                      className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-600 transition-all font-medium min-h-[100px]"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2 flex justify-end gap-2">
                   {editingId && (
                    <button onClick={cancelEdit} className="px-6 h-[54px] bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all">
                      Cancel
                    </button>
                  )}
                  <button onClick={handleAddPlayer} disabled={loading} className="px-8 h-[54px] bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all">
                    {editingId ? <SaveIcon size={20} /> : <PlusIcon size={20} />}
                    {editingId ? "Save Player" : "Add Player"}
                  </button>
                </div>
              </div>
            </AdminCard>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {players.map(p => (
                <div key={p.id} className="p-4 bg-white rounded-3xl border border-gray-100 flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center font-black text-gray-300 overflow-hidden">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        p.number || '#'
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-sm line-clamp-1">{p.name}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase line-clamp-1">
                        {teams.find(t => t.id === p.teamId)?.name} • {p.position}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button 
                      onClick={() => startEditingPlayer(p)} 
                      className="p-3 text-blue-500 bg-blue-50 rounded-2xl hover:bg-blue-100 transition-all"
                      title="Edit Player"
                    >
                      <SaveIcon size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete('players', p.id)} 
                      className="p-3 text-red-500 bg-red-50 rounded-2xl hover:bg-red-100 transition-all"
                      title="Delete Player"
                    >
                      <Trash2Icon size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'transfers' && (
          <motion.div key="transfers-tab" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <AdminCard title={editingId ? "Edit Transfer" : "Add New Transfer"} icon={<TransferIcon className="text-blue-600" />}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Select label="Player" value={transferForm.playerId} onChange={v => setTransferForm({ ...transferForm, playerId: v })} options={players.map(p => ({ label: p.name, value: p.id }))} />
                <Select label="From Team" value={transferForm.fromTeamId} onChange={v => setTransferForm({ ...transferForm, fromTeamId: v })} options={teams.map(t => ({ label: t.name, value: t.id }))} />
                <Select label="To Team" value={transferForm.toTeamId} onChange={v => setTransferForm({ ...transferForm, toTeamId: v })} options={teams.map(t => ({ label: t.name, value: t.id }))} />
                <Input type="date" label="Transfer Date" value={transferForm.date} onChange={v => setTransferForm({ ...transferForm, date: v })} />
                <Input label="Transfer Fee" value={transferForm.fee} onChange={v => setTransferForm({ ...transferForm, fee: v })} placeholder="e.g. $50M" />
                <Select label="Transfer Type" value={transferForm.type} onChange={v => setTransferForm({ ...transferForm, type: v as any })} options={[{ label: 'Permanent', value: 'permanent' }, { label: 'Loan', value: 'loan' }, { label: 'Free', value: 'free' }]} />
                
                <div className="lg:col-span-3 flex justify-end gap-2">
                  {editingId && (
                    <button onClick={cancelEdit} className="px-6 h-[54px] bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all">
                      Cancel
                    </button>
                  )}
                  <button onClick={handleAddTransfer} disabled={loading} className="px-8 h-[54px] bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all">
                    {editingId ? <SaveIcon size={20} /> : <PlusIcon size={20} />}
                    {editingId ? "Save Transfer" : "Record Transfer"}
                  </button>
                </div>
              </div>
            </AdminCard>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {transfers.map(t => {
                const p = players.find(player => player.id === t.playerId);
                const from = teams.find(team => team.id === t.fromTeamId);
                const to = teams.find(team => team.id === t.toTeamId);
                return (
                  <div key={t.id} className="p-6 bg-white rounded-3xl border border-gray-100 flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center overflow-hidden border">
                         {p?.imageUrl ? <img src={p.imageUrl} alt="" className="w-full h-full object-cover" /> : <UsersIcon className="text-gray-200" />}
                      </div>
                      <div>
                        <p className="font-bold">{p?.name || 'Unknown'}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">
                          {from?.name} → {to?.name}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => startEditingTransfer(t)} className="p-3 text-blue-500 bg-blue-50 rounded-2xl hover:bg-blue-100 transition-all">
                        <SaveIcon size={18} />
                      </button>
                      <button onClick={() => handleDelete('transfers', t.id)} className="p-3 text-red-500 bg-red-50 rounded-2xl hover:bg-red-100 transition-all">
                        <Trash2Icon size={18} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {activeTab === 'venues' && (
          <motion.div key="venues-tab" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <AdminCard title={editingId ? "Edit Venue" : "Add New Venue"} icon={<MapPinIcon className="text-blue-600" />}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input label="Venue Name" value={venueForm.name} onChange={v => setVenueForm({ ...venueForm, name: v })} placeholder="e.g. Old Trafford" />
                <Input label="City" value={venueForm.city} onChange={v => setVenueForm({ ...venueForm, city: v })} placeholder="e.g. Manchester" />
                <Input type="number" label="Capacity" value={venueForm.capacity} onChange={v => setVenueForm({ ...venueForm, capacity: parseInt(v) })} />
                <div className="sm:col-span-3 flex justify-end gap-2">
                  {editingId && (
                    <button onClick={cancelEdit} className="px-6 h-[54px] bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all">
                      Cancel
                    </button>
                  )}
                  <button onClick={handleAddVenue} disabled={loading} className="px-8 h-[54px] bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all">
                    {editingId ? <SaveIcon size={20} /> : <PlusIcon size={20} />}
                    {editingId ? "Save Venue" : "Add Venue"}
                  </button>
                </div>
              </div>
            </AdminCard>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {venues.map(v => (
                <div key={v.id} className="p-4 bg-white rounded-3xl border border-gray-100 flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center overflow-hidden">
                      <MapPinIcon className="text-gray-300" size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-sm">{v.name}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">{v.city} {v.capacity ? `• Cap: ${v.capacity.toLocaleString()}` : ''}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => startEditingVenue(v)} 
                      className="p-3 text-blue-500 bg-blue-50 rounded-2xl hover:bg-blue-100 transition-all"
                      title="Edit Venue"
                    >
                      <SaveIcon size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete('venues', v.id)} 
                      className="p-3 text-red-500 bg-red-50 rounded-2xl hover:bg-red-100 transition-all"
                      title="Delete Venue"
                    >
                      <Trash2Icon size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
        {activeTab === 'leagues' && (
          <motion.div key="leagues-tab" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <AdminCard title={editingId ? "Edit League" : "Add New League"} icon={<TrophyIcon className="text-blue-600" />}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="League Name" value={leagueForm.name} onChange={v => setLeagueForm({ ...leagueForm, name: v })} placeholder="e.g. Premier League" />
                <Select label="Type" value={leagueForm.type} onChange={v => setLeagueForm({ ...leagueForm, type: v as any })} options={[{ label: 'Standard League', value: 'league' }, { label: 'Cup / Tournament', value: 'cup' }]} />
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
                    <div className="pt-7 flex gap-2">
                       {historyForm.editingIndex !== null && (
                        <button 
                          type="button"
                          onClick={cancelHistoryEdit}
                          className="px-4 h-[54px] bg-gray-100 text-gray-500 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                        >
                          Cancel
                        </button>
                      )}
                      <button 
                        type="button"
                        onClick={addHistoryEntry}
                        className="flex-1 h-[54px] bg-gray-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all"
                      >
                        {historyForm.editingIndex !== null ? <SaveIcon size={18} /> : <PlusIcon size={18} />}
                        {historyForm.editingIndex !== null ? 'Update' : 'Add Entry'}
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
                          <div className="flex items-center gap-2">
                             <button onClick={() => startEditingHistory(i)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-all">
                              <SaveIcon size={16} />
                            </button>
                            <button onClick={() => removeHistoryEntry(i)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all">
                              <Trash2Icon size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <ImageUpload 
                  label="League Logo (File or URL)" 
                  value={leagueForm.logo} 
                  onChange={v => setLeagueForm({ ...leagueForm, logo: v })}
                  onFileSelect={handleFileUpload}
                />
                <div className="sm:pt-7 flex gap-2">
                  {editingId && (
                    <button onClick={cancelEdit} className="px-6 h-[54px] bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all">
                      Cancel
                    </button>
                  )}
                  <button onClick={handleAddLeague} disabled={loading} className="flex-1 h-[54px] bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all">
                    {editingId ? <SaveIcon size={20} /> : <PlusIcon size={20} />}
                    {editingId ? "Save League" : "Add League"}
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
                    <span className={cn(
                      "text-[8px] font-black uppercase px-2 py-0.5 rounded-full ml-2",
                      l.type === 'cup' ? "bg-purple-50 text-purple-600" : "bg-blue-50 text-blue-600"
                    )}>
                      {l.type || 'league'}
                    </span>
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
                <ImageUpload 
                  label="Team Logo (File or URL)" 
                  value={teamForm.logo} 
                  onChange={v => setTeamForm({ ...teamForm, logo: v })}
                  onFileSelect={handleFileUpload}
                />
                <div className="sm:pt-7 flex gap-2">
                  {editingId && (
                    <button onClick={cancelEdit} className="px-6 h-[54px] bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all">
                      Cancel
                    </button>
                  )}
                  <button onClick={handleAddTeam} disabled={loading} className="flex-1 h-[54px] bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all">
                    {editingId ? <SaveIcon size={20} /> : <PlusIcon size={20} />}
                    {editingId ? "Save Team" : "Add Team"}
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
            {quotaExceeded && (
              <div className="bg-orange-500 text-white px-4 py-2 text-center text-[10px] font-black uppercase tracking-widest animate-pulse rounded-2xl mb-4">
                OFFLINE MODE • DATA IS STALE • CONNECTION LIMITED
              </div>
            )}
            <AdminCard title={editingId ? "Edit Game" : "Schedule New Game"} icon={<CalendarIcon className="text-blue-600" />}>
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Select 
                    label="Home Team" 
                    value={gameForm.homeTeamId} 
                    onChange={v => setGameForm({ ...gameForm, homeTeamId: v, leagueId: teams.find(t => t.id === v)?.leagueId || '' })} 
                    options={teams.map(t => ({ label: `${t.name} (${leagues.find(l => l.id === t.leagueId)?.name})`, value: t.id }))} 
                  />
                  <div className="flex items-center justify-center pt-8 text-gray-300 font-black">VS</div>
                   <Select 
                    label="Away Team" 
                    value={gameForm.awayTeamId} 
                    onChange={v => setGameForm({ ...gameForm, awayTeamId: v })} 
                    options={teams.map(t => ({ label: `${t.name} (${leagues.find(l => l.id === t.leagueId)?.name})`, value: t.id }))} 
                  />
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Date & Time</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input 
                          type="date"
                          value={gameForm.date.split('T')[0]}
                          onChange={e => {
                            const time = gameForm.date.split('T')[1] || '12:00';
                            setGameForm({ ...gameForm, date: `${e.target.value}T${time}` });
                          }}
                          className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-600 transition-all font-medium appearance-none"
                        />
                        <CalendarIcon className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" size={18} />
                      </div>
                      <div className="relative w-32">
                        <input 
                          type="time"
                          value={gameForm.date.split('T')[1]?.slice(0, 5) || '12:00'}
                          onChange={e => {
                            const date = gameForm.date.split('T')[0];
                            setGameForm({ ...gameForm, date: `${date}T${e.target.value}` });
                          }}
                          className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-600 transition-all font-medium appearance-none"
                        />
                      </div>
                    </div>
                  </div>
                   <Select 
                    label="Initial Status" 
                    value={gameForm.status} 
                    onChange={v => setGameForm({ ...gameForm, status: v as any })} 
                    options={[{label: 'Scheduled', value: 'scheduled'}, {label: 'Live', value: 'live'}, {label: 'Finished', value: 'finished'}]} 
                  />
                   <Select 
                    label="Round / Matchday" 
                    value={gameForm.round} 
                    onChange={v => setGameForm({ ...gameForm, round: v })}
                    options={[
                      { label: 'Group Stage', value: 'Group Stage' },
                      { label: 'Playoff', value: 'Playoff' },
                      { label: 'Quarter-final', value: 'Quarter-final' },
                      { label: 'Semi-final', value: 'Semi-final' },
                      { label: 'Final', value: 'Final' },
                      { label: 'Matchday 1', value: 'Matchday 1' },
                      { label: 'Matchday 2', value: 'Matchday 2' }
                    ]}
                  />
                  <Select 
                    label="Venue" 
                    value={gameForm.venueId} 
                    onChange={v => setGameForm({ ...gameForm, venueId: v })}
                    options={venues.map(v => ({ label: `${v.name} (${v.city})`, value: v.id }))}
                  />
                  {gameForm.status === 'live' && (
                    <Input 
                      label="Match Time (e.g. 45' or HT)" 
                      value={gameForm.currentTime} 
                      onChange={v => setGameForm({ ...gameForm, currentTime: v })} 
                      placeholder="e.g. 12', 45+2, HT"
                    />
                  )}

                  {/* Enhanced Game Editor: Events and Lineups */}
                  {editingId && (
                    <div className="sm:col-span-3 mt-8 pt-8 border-t border-gray-100 space-y-8">
                      <div className="flex items-center gap-2 mb-4">
                        <ZapIcon className="text-blue-600" size={18} />
                        <h4 className="font-black text-sm uppercase tracking-widest text-gray-900 line-clamp-1">Match Events & Lineups</h4>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Events Manager */}
                        <div className="space-y-4">
                          <h5 className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-2">{editingEventId ? 'Edit Event' : 'Add Event'}</h5>
                          <div className="p-6 bg-gray-50 rounded-[32px] space-y-4">
                             <div className="grid grid-cols-2 gap-4">
                               <Select label="Type" value={eventForm.type} onChange={v => setEventForm({ ...eventForm, type: v as any })} options={[{label: 'Goal', value: 'goal'}, {label: 'Penalty', value: 'penalty'}, {label: 'Yellow Card', value: 'yellow'}, {label: 'Red Card', value: 'red'}, {label: 'Substitution', value: 'sub'}]} />
                               <Input type="number" label="Minute" value={eventForm.minute} onChange={v => setEventForm({ ...eventForm, minute: parseInt(v) })} />
                             </div>
                             <Select label="Team" value={eventForm.teamId} onChange={v => setEventForm({ ...eventForm, teamId: v })} options={[{label: teams.find(t => t.id === gameForm.homeTeamId)?.name || 'Home', value: gameForm.homeTeamId}, {label: teams.find(t => t.id === gameForm.awayTeamId)?.name || 'Away', value: gameForm.awayTeamId}]} />
                             
                             {eventForm.type === 'sub' ? (
                               <div className="grid grid-cols-2 gap-4">
                                 <Select label="Player In" value={eventForm.playerInId} onChange={v => setEventForm({ ...eventForm, playerInId: v })} options={[{ label: 'Select Player', value: '' }, ...players.filter(p => p.teamId === eventForm.teamId).map(p => ({ label: p.name, value: p.id }))]} />
                                 <Select label="Player Out" value={eventForm.playerOutId} onChange={v => setEventForm({ ...eventForm, playerOutId: v })} options={[{ label: 'Select Player', value: '' }, ...players.filter(p => p.teamId === eventForm.teamId).map(p => ({ label: p.name, value: p.id }))]} />
                               </div>
                             ) : (
                               <div className="grid grid-cols-2 gap-4">
                                 <Select label="Player" value={eventForm.playerId} onChange={v => setEventForm({ ...eventForm, playerId: v })} options={[{ label: 'Select Player', value: '' }, ...players.filter(p => p.teamId === eventForm.teamId).map(p => ({ label: p.name, value: p.id }))]} />
                                 {eventForm.type === 'goal' && <Select label="Assistant" value={eventForm.assistantId} onChange={v => setEventForm({ ...eventForm, assistantId: v })} options={[{ label: 'No Assistant', value: '' }, ...players.filter(p => p.teamId === eventForm.teamId && p.id !== eventForm.playerId).map(p => ({ label: p.name, value: p.id }))]} />}
                               </div>
                             )}
                             
                             <div className="flex gap-2">
                                {editingEventId && (
                                  <button onClick={cancelEventEdit} className="px-4 h-12 bg-gray-200 text-gray-600 rounded-2xl font-bold transition-all">
                                    Cancel
                                  </button>
                                )}
                                <button onClick={addMatchEvent} className="flex-1 h-12 bg-gray-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all">
                                  {editingEventId ? <SaveIcon size={16} /> : <PlusIcon size={16} />}
                                  {editingEventId ? 'Update Event' : 'Add Event'}
                                </button>
                             </div>
                          </div>

                          <div className="space-y-2 max-h-[300px] overflow-y-auto px-1 pr-2 scrollbar-thin">
                            {gameForm.events.sort((a,b) => b.minute - a.minute).map(e => {
                               const p = players.find(player => player.id === e.playerId || player.id === e.playerInId);
                               const t = teams.find(team => team.id === e.teamId);
                               return (
                                 <div key={e.id} className="p-3 bg-white border border-gray-100 rounded-2xl flex items-center justify-between">
                                   <div className="flex items-center gap-3">
                                     <span className="font-black text-blue-600 tabular-nums w-6">{e.minute}'</span>
                                     <div>
                                       <p className="text-xs font-bold">{p?.name} ({t?.name})</p>
                                       <p className="text-[10px] text-gray-400 font-bold uppercase">{e.type}</p>
                                     </div>
                                   </div>
                                   <div className="flex items-center gap-2">
                                     <button onClick={() => startEditingEvent(e)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-all">
                                      <SaveIcon size={14} />
                                     </button>
                                     <button onClick={() => removeMatchEvent(e.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all">
                                        <Trash2Icon size={14} />
                                     </button>
                                   </div>
                                 </div>
                               );
                            })}
                          </div>
                        </div>

                        {/* Lineups Manager */}
                        <div className="space-y-4">
                          <h5 className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-2">Lineups Selection</h5>
                          <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-3">
                               <h6 className="text-[10px] font-bold text-center uppercase tracking-widest text-gray-400">Home</h6>
                               <div className="space-y-1 max-h-[400px] overflow-y-auto scrollbar-thin bg-gray-50/50 p-2 rounded-2xl border border-gray-100">
                                 {players.filter(p => p.teamId === gameForm.homeTeamId).map(p => (
                                   <button 
                                     key={p.id}
                                     onClick={() => toggleLineupPlayer('home', p.id)}
                                     className={cn(
                                       "w-full p-2 rounded-xl text-left text-xs transition-all flex items-center justify-between",
                                       gameForm.lineups.home.includes(p.id) ? "bg-blue-600 text-white font-bold shadow-md" : "hover:bg-gray-100 text-gray-600"
                                     )}
                                   >
                                     <span>{p.name}</span>
                                     <span className="opacity-50 text-[10px]">{p.position}</span>
                                   </button>
                                 ))}
                               </div>
                             </div>

                             <div className="space-y-3">
                               <h6 className="text-[10px] font-bold text-center uppercase tracking-widest text-gray-400">Away</h6>
                               <div className="space-y-1 max-h-[400px] overflow-y-auto scrollbar-thin bg-gray-50/50 p-2 rounded-2xl border border-gray-100">
                                 {players.filter(p => p.teamId === gameForm.awayTeamId).map(p => (
                                   <button 
                                     key={p.id}
                                     onClick={() => toggleLineupPlayer('away', p.id)}
                                     className={cn(
                                       "w-full p-2 rounded-xl text-left text-xs transition-all flex items-center justify-between",
                                       gameForm.lineups.away.includes(p.id) ? "bg-blue-600 text-white font-bold shadow-md" : "hover:bg-gray-100 text-gray-600"
                                     )}
                                   >
                                     <span>{p.name}</span>
                                     <span className="opacity-50 text-[10px]">{p.position}</span>
                                   </button>
                                 ))}
                               </div>
                             </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="sm:pt-7 flex gap-2 sm:col-span-1">
                    {editingId && (
                      <button onClick={cancelEdit} className="px-6 h-[54px] bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all">
                        Cancel
                      </button>
                    )}
                    <button onClick={handleAddGame} disabled={loading} className="flex-1 h-[54px] bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all">
                      {editingId ? <SaveIcon size={20} /> : <PlusIcon size={20} />}
                      {editingId ? "Save Match" : "Schedule Game"}
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
                    <div className="w-px h-2 bg-gray-100" />
                    {g.events && g.events.length > 0 && (
                      <div className="flex items-center gap-1 text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">
                        <ZapIcon size={10} />
                        <span className="text-[10px] font-black">{g.events.length}</span>
                      </div>
                    )}
                    <div className="w-px h-2 bg-gray-100" />
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

function ImageUpload({ 
  value, 
  onChange, 
  label = "Image", 
  onFileSelect 
}: { 
  value: string; 
  onChange: (v: string) => void; 
  label?: string;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>, cb: (b: string) => void) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);

  return (
     <div className="space-y-2">
      <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">{label}</label>
      <div 
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) {
            if (file.size > 1024 * 1024) {
              alert('File is too large. Max 1MB.');
              return;
            }
            const reader = new FileReader();
            reader.onloadend = () => onChange(reader.result as string);
            reader.readAsDataURL(file);
          }
        }}
        className={cn(
          "relative group transition-all duration-300",
          isDragging ? "ring-2 ring-blue-600 ring-offset-2 scale-[1.01]" : ""
        )}
      >
        <div className="relative overflow-hidden rounded-[32px] bg-gray-50 border-2 border-dashed border-gray-200 group-hover:border-blue-200 transition-all min-h-[160px] flex flex-col items-center justify-center p-6 text-center">
          {value ? (
            <div className="relative w-full h-full flex flex-col items-center gap-4 animate-in zoom-in-95 duration-300">
               <div className="relative">
                 <img src={value} alt="Preview" className="h-24 w-24 rounded-[28px] object-cover shadow-2xl ring-4 ring-white" />
                 <div className="absolute -bottom-2 -right-2 p-1.5 bg-green-500 text-white rounded-full shadow-lg">
                   <SaveIcon size={12} />
                 </div>
                 <button 
                  onClick={() => onChange('')}
                  className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-all scale-0 group-hover:scale-100"
                 >
                  <XIcon size={12} />
                 </button>
               </div>
               <div className="space-y-1">
                 <p className="text-xs font-black text-gray-900">Image ready to save</p>
                 <button className="text-[10px] font-bold text-blue-600 hover:underline">Change image</button>
               </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                <UploadIcon size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-black text-gray-900">Drop image or click to upload</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">JPG, PNG, WebP (Max 1MB)</p>
              </div>
            </div>
          )}
          <input 
            type="file" 
            className="absolute inset-0 opacity-0 cursor-pointer" 
            accept="image/*" 
            onChange={(e) => onFileSelect(e, onChange)} 
          />
        </div>
      </div>
      
      <div className="relative group">
        <input 
          type="text"
          value={value.startsWith('data:') ? 'Local file uploaded' : value}
          onChange={e => onChange(e.target.value)}
          placeholder="Or paste image URL here..."
          disabled={value.startsWith('data:')}
          className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-600 transition-all font-medium text-xs text-gray-500 placeholder:text-gray-300"
        />
        {value.startsWith('data:') && (
          <button 
            onClick={() => onChange('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-red-500 uppercase tracking-widest hover:underline"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
