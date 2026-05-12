import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy as TrophyIcon, 
  Users as UsersIcon, 
  Search as SearchIcon, 
  Plus as PlusIcon, 
  Layout as LayoutIcon,
  ChevronRight as ChevronRightIcon,
  DollarSign as DollarSignIcon,
  Star as StarIcon,
  Crown as CrownIcon,
  ArrowLeft as ArrowLeftIcon,
  Settings as SettingsIcon,
  Share2 as Share2Icon,
  Save as SaveIcon,
  LayoutGrid as LayoutGridIcon,
  List as ListIcon
} from 'lucide-react';
import { Player, Team, FantasyTeam, FantasyLeague, FantasyPlayer } from '../types';
import { cn } from '../lib/utils';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface FantasyManagerProps {
  user: any;
  players: Player[];
  teams: Team[];
  onBack: () => void;
  onLogin: () => void;
  onPlayerClick?: (playerId: string) => void;
}

export function FantasyManager({ user, players, teams, onBack, onLogin, onPlayerClick }: FantasyManagerProps) {
  const [activeTab, setActiveTab] = useState<'my_team' | 'leagues' | 'players'>('my_team');
  const [viewMode, setViewMode] = useState<'squad' | 'list'>('squad');
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [remBudget, setRemBudget] = useState(100.0);
  const [chips, setChips] = useState({
    benchBoost: false,
    freeHit: false,
    tripleCaptain: false
  });

  // Fantasy players with prices and points from database or defaults
  const fantasyPlayers = useMemo(() => {
    return players.map((p, i) => ({
      ...p,
      price: p.price || (4.5 + ((i % 10) * 0.8)), 
      fantasyPoints: p.fantasyPoints || 0
    })) as FantasyPlayer[];
  }, [players]);

  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [benchPlayerIds, setBenchPlayerIds] = useState<string[]>([]);

  const [formation, setFormation] = useState<'4-4-2' | '4-3-3' | '4-5-1' | '5-3-2' | '3-5-2'>('4-4-2');
  const [swappingId, setSwappingId] = useState<string | null>(null);

  // Calculate current budget based on selected players
  useEffect(() => {
    const totalSpent = [...selectedPlayerIds, ...benchPlayerIds].reduce((sum, id) => {
      const player = fantasyPlayers.find(p => p.id === id);
      return sum + (player?.price || 0);
    }, 0);
    setRemBudget(100.0 - totalSpent);
  }, [selectedPlayerIds, benchPlayerIds, fantasyPlayers]);

  // Load user's team on mount
  useEffect(() => {
    if (!user) return;
    const fetchTeam = async () => {
      try {
        const teamDoc = await getDoc(doc(db, 'fantasyTeams', user.uid));
        if (teamDoc.exists()) {
          const data = teamDoc.data() as FantasyTeam;
          setSelectedPlayerIds(data.playerIds || []);
          setBenchPlayerIds(data.benchPlayerIds || []);
          if (data.formation) setFormation(data.formation as any);
        }
      } catch (error) {
        console.error('Error fetching fantasy team:', error);
      }
    };
    fetchTeam();
  }, [user]);

  const saveTeam = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'fantasyTeams', user.uid), {
        userId: user.uid,
        name: `${user.displayName || 'My'}'s Team`,
        playerIds: selectedPlayerIds,
        benchPlayerIds: benchPlayerIds,
        formation: formation,
        budget: remBudget,
        totalPoints: 0,
        chips: {
          benchBoostUsed: chips.benchBoost,
          freeHitUsed: chips.freeHit,
          tripleCaptainUsed: chips.tripleCaptain
        }
      });
      alert('Team saved successfully!');
    } catch (error) {
      console.error('Error saving fantasy team:', error);
      alert('Failed to save team. Please check permissions.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePlayerSlotClick = (playerId: string) => {
    if (swappingId) {
      if (swappingId === playerId) {
        setSwappingId(null);
        return;
      }

      // Swap logic
      const isSwappingFromBench = benchPlayerIds.includes(swappingId);
      const isSwappingToBench = benchPlayerIds.includes(playerId);

      if (isSwappingFromBench && !isSwappingToBench) {
        // Bench to Pitch
        setBenchPlayerIds(prev => prev.map(id => id === swappingId ? playerId : id));
        setSelectedPlayerIds(prev => prev.map(id => id === playerId ? swappingId : id));
      } else if (!isSwappingFromBench && isSwappingToBench) {
        // Pitch to Bench
        setSelectedPlayerIds(prev => prev.map(id => id === swappingId ? playerId : id));
        setBenchPlayerIds(prev => prev.map(id => id === playerId ? swappingId : id));
      } else if (!isSwappingFromBench && !isSwappingToBench) {
        // Pitch to Pitch swap
        setSelectedPlayerIds(prev => {
          const next = [...prev];
          const idx1 = next.indexOf(swappingId);
          const idx2 = next.indexOf(playerId);
          next[idx1] = playerId;
          next[idx2] = swappingId;
          return next;
        });
      }

      setSwappingId(null);
    } else {
      setSwappingId(playerId);
    }
  };

  const addPlayerToSquad = (playerId: string) => {
    const player = fantasyPlayers.find(p => p.id === playerId);
    if (!player) return;

    if (selectedPlayerIds.includes(playerId) || benchPlayerIds.includes(playerId)) {
      alert('Player already in squad!');
      return;
    }

    if (remBudget < player.price) {
      alert('Insufficient budget!');
      return;
    }

    if (selectedPlayerIds.length < 11) {
      setSelectedPlayerIds(prev => [...prev, playerId]);
    } else if (benchPlayerIds.length < 4) {
      setBenchPlayerIds(prev => [...prev, playerId]);
    } else {
      alert('Squad and bench are full!');
    }
  };

  const removePlayerFromSquad = (playerId: string) => {
    setSelectedPlayerIds(prev => prev.filter(id => id !== playerId));
    setBenchPlayerIds(prev => prev.filter(id => id !== playerId));
  };

  const filteredPlayers = useMemo(() => {
    return fantasyPlayers.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPosition = selectedPosition ? p.position.includes(selectedPosition) : true;
      return matchesSearch && matchesPosition;
    }).sort((a, b) => b.price - a.price);
  }, [fantasyPlayers, searchQuery, selectedPosition]);

  const stats = {
    totalPoints: 124,
    rank: 1240,
    gwPoints: 42,
    budget: 100.0,
    remBudget: 12.5
  };

  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6 min-h-[60vh] bg-[#0A0A0A] text-white">
        <div className="w-24 h-24 bg-blue-500/10 rounded-[32px] flex items-center justify-center shadow-xl border border-blue-500/20">
          <CrownIcon size={48} className="text-blue-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black tracking-tighter uppercase italic">Fantasy <span className="text-blue-500">Soccer</span></h2>
          <p className="text-white/40 font-bold uppercase tracking-widest text-[10px] max-w-sm mx-auto">Create your dream team, join leagues, and compete with fans worldwide.</p>
        </div>
        <button 
          onClick={onLogin}
          className="px-10 py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all text-xs"
        >
          Sign in to Play
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Immersive Header */}
      <div className="bg-[#0288d1] relative overflow-hidden pt-6 pb-20 px-6">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-transparent pointer-events-none" />
        <div className="relative z-10 flex justify-between items-center max-w-4xl mx-auto">
          <button 
            onClick={onBack} 
            className="w-10 h-10 flex items-center justify-center bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 text-white hover:bg-white/20 transition-all"
          >
            <ArrowLeftIcon size={20} />
          </button>
          <div className="flex flex-col items-center">
            <h1 className="text-xl font-black text-white tracking-tighter uppercase">Pick Team</h1>
          </div>
          <button className="w-10 h-10 flex items-center justify-center bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 text-white hover:bg-white/20 transition-all">
            <Share2Icon size={18} />
          </button>
        </div>

        {/* Deadline Info */}
        <div className="relative z-20 mt-6 text-center">
           <p className="text-white font-bold text-lg tracking-tight">Gameweek 1 Deadline: 16 Aug 2025, 18:30</p>
        </div>

        {/* View Toggle */}
        <div className="relative z-30 mt-8 max-w-md mx-auto bg-white/10 backdrop-blur-lg rounded-[20px] p-1.5 flex gap-1 border border-white/10">
          <button 
            onClick={() => setViewMode('squad')}
            className={cn(
              "flex-1 py-3 rounded-[15px] font-black uppercase text-[11px] tracking-widest transition-all",
              viewMode === 'squad' ? "bg-white text-[#0288d1] shadow-xl" : "text-white/60 hover:text-white"
            )}
          >
            Squad
          </button>
          <button 
            onClick={() => setViewMode('list')}
            className={cn(
              "flex-1 py-3 rounded-[15px] font-black uppercase text-[11px] tracking-widest transition-all",
              viewMode === 'list' ? "bg-white text-[#0288d1] shadow-xl" : "text-white/60 hover:text-white"
            )}
          >
            List
          </button>
        </div>

        {/* User Stats Bar */}
        <div className="relative z-20 mt-10 grid grid-cols-2 gap-4 max-w-4xl mx-auto">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 p-4 flex justify-between items-center">
            <p className="text-[10px] font-black text-white/50 uppercase tracking-widest">Free Transfers</p>
            <p className="text-xl font-black text-white">1</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 p-4 flex justify-between items-center">
            <p className="text-[10px] font-black text-white/50 uppercase tracking-widest">Remaining Budget</p>
            <p className="text-xl font-black text-white">£{remBudget.toFixed(1)}M</p>
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-gray-100 dark:border-white/5">
        <div className="flex max-w-4xl mx-auto overflow-x-auto scrollbar-none">
          {[
            { id: 'my_team', label: 'My Team', icon: CrownIcon },
            { id: 'players', label: 'Transfer Market', icon: DollarSignIcon },
            { id: 'leagues', label: 'Leagues', icon: TrophyIcon }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex-1 py-5 px-4 flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] transition-all relative shrink-0",
                activeTab === tab.id 
                  ? "text-blue-600 dark:text-blue-400" 
                  : "text-gray-400 dark:text-gray-600 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              <tab.icon size={14} />
              {tab.label}
              {activeTab === tab.id && (
                <motion.div 
                  layoutId="activeTabGlow"
                  className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 dark:bg-blue-500 rounded-t-full shadow-[0_-4px_12px_rgba(59,130,246,0.4)]"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-4 sm:p-8 max-w-4xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {activeTab === 'my_team' && (
            <motion.div
              key="my_team"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Chips Section */}
              <div className="grid grid-cols-3 gap-3">
                <ChipButton label="Bench Boost" active={chips.benchBoost} onClick={() => setChips(c => ({...c, benchBoost: !c.benchBoost}))} />
                <ChipButton label="Free Hit" active={chips.freeHit} onClick={() => setChips(c => ({...c, freeHit: !c.freeHit}))} />
                <ChipButton label="Triple Captain" active={chips.tripleCaptain} onClick={() => setChips(c => ({...c, tripleCaptain: !c.tripleCaptain}))} />
              </div>

              {/* Formation Controls */}
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <select
                    value={formation}
                    onChange={(e) => setFormation(e.target.value as any)}
                    className="w-full bg-[#0A0A0A] p-4 rounded-2xl border border-white/10 text-white font-black uppercase tracking-widest text-[11px] appearance-none outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer shadow-xl"
                  >
                    <option value="4-4-2">Formation: 4-4-2</option>
                    <option value="4-3-3">Formation: 4-3-3</option>
                    <option value="4-5-1">Formation: 4-5-1</option>
                    <option value="5-3-2">Formation: 5-3-2</option>
                    <option value="3-5-2">Formation: 3-5-2</option>
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-blue-500">
                    <LayoutGridIcon size={16} />
                  </div>
                </div>
                {swappingId ? (
                  <div className="bg-yellow-400/90 backdrop-blur-xl py-3 px-6 rounded-2xl border border-yellow-500/20 flex items-center justify-between animate-pulse">
                    <p className="text-[10px] font-black text-black uppercase tracking-widest">Select player to swap with</p>
                    <button onClick={() => setSwappingId(null)} className="text-[10px] font-black text-black/40 uppercase hover:text-black">Cancel</button>
                  </div>
                ) : (
                  <div className="bg-white/5 backdrop-blur-xl py-3 px-6 rounded-2xl border border-white/10 flex items-center gap-3">
                    <LayoutGridIcon size={14} className="text-blue-500" />
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Tap players to move or substitute</p>
                  </div>
                )}
              </div>

              {/* Pitch Layout */}
              <div className="relative aspect-[3/4.2] bg-[#37a64f] rounded-[40px] shadow-2xl overflow-hidden border-8 border-[#2d8f41]">
                <div className="absolute inset-0 opacity-40 bg-[url('https://www.transparenttextures.com/patterns/grass.png')]" />
                
                {/* Stadium Indicator */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/20">
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                  <span className="text-[8px] font-black text-white uppercase tracking-[0.2em]">Live: Fantasy Studio</span>
                </div>

                {/* Custom Pitch Markings */}
                <div className="absolute inset-0 pointer-events-none opacity-40">
                   <div className="absolute inset-x-8 top-0 h-[15%] border-b border-l border-r border-white" />
                   <div className="absolute inset-x-16 top-0 h-[8%] border-b border-l border-r border-white" />
                   <div className="absolute bottom-0 inset-x-8 h-[15%] border-t border-l border-r border-white" />
                   <div className="absolute top-1/2 left-0 right-0 h-px bg-white" />
                   <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 border border-white rounded-full" />
                </div>

                {/* Player Grid */}
                <div className="absolute inset-0 flex flex-col justify-between py-10 px-2 sm:px-4">
                  {/* Goalkeeper */}
                  <div className="flex justify-center">
                    <FantasyPlayerSlot 
                      position="GK" 
                      player={fantasyPlayers.find(p => p.id === selectedPlayerIds[0])} 
                      teams={teams} 
                      onRemove={removePlayerFromSquad}
                      onClick={() => selectedPlayerIds[0] && handlePlayerSlotClick(selectedPlayerIds[0])}
                      isSelected={swappingId === selectedPlayerIds[0]}
                    />
                  </div>
                  
                  {/* Mapping rows based on formation */}
                  {(() => {
                    const counts = ({
                      '4-4-2': [4, 4, 2],
                      '4-3-3': [4, 3, 3],
                      '4-5-1': [4, 5, 1],
                      '5-3-2': [5, 3, 2],
                      '3-5-2': [3, 5, 2]
                    }[formation] || [4, 4, 2]);
                    
                    let currentIndex = 1;
                    return ['DEF', 'MID', 'FWD'].map((pos, rowIndex) => {
                      const rowCount = counts[rowIndex];
                      const rowPlayers = [];
                      for (let i = 0; i < rowCount; i++) {
                        rowPlayers.push({ id: selectedPlayerIds[currentIndex], index: currentIndex });
                        currentIndex++;
                      }
                      
                      return (
                        <div key={pos} className="flex justify-around gap-1 min-h-[80px]">
                          {rowPlayers.map((pSlot, idx) => (
                            <FantasyPlayerSlot 
                              key={`${pos}-${idx}`}
                              position={pos} 
                              player={fantasyPlayers.find(p => p.id === pSlot.id)} 
                              teams={teams} 
                              isCaptain={pSlot.index === 10}
                              isViceCaptain={pSlot.index === 9}
                              onRemove={removePlayerFromSquad}
                              onClick={() => pSlot.id && handlePlayerSlotClick(pSlot.id)}
                              isSelected={swappingId === pSlot.id}
                            />
                          ))}
                        </div>
                      );
                    });
                  })()}

                  {/* Bench Area */}
                  <div className="mt-4 pt-4 border-t border-white/20 bg-black/20 -mx-4 px-4 flex justify-around items-end gap-1">
                     <FantasyPlayerSlot position="GKP" player={fantasyPlayers.find(p => p.id === benchPlayerIds[0])} teams={teams} isBench onRemove={removePlayerFromSquad} onClick={() => benchPlayerIds[0] && handlePlayerSlotClick(benchPlayerIds[0])} isSelected={swappingId === benchPlayerIds[0]} />
                     <FantasyPlayerSlot position="SUB" player={fantasyPlayers.find(p => p.id === benchPlayerIds[1])} teams={teams} isBench onRemove={removePlayerFromSquad} onClick={() => benchPlayerIds[1] && handlePlayerSlotClick(benchPlayerIds[1])} isSelected={swappingId === benchPlayerIds[1]} />
                     <FantasyPlayerSlot position="SUB" player={fantasyPlayers.find(p => p.id === benchPlayerIds[2])} teams={teams} isBench onRemove={removePlayerFromSquad} onClick={() => benchPlayerIds[2] && handlePlayerSlotClick(benchPlayerIds[2])} isSelected={swappingId === benchPlayerIds[2]} />
                     <FantasyPlayerSlot position="SUB" player={fantasyPlayers.find(p => p.id === benchPlayerIds[3])} teams={teams} isBench onRemove={removePlayerFromSquad} onClick={() => benchPlayerIds[3] && handlePlayerSlotClick(benchPlayerIds[3])} isSelected={swappingId === benchPlayerIds[3]} />
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <button 
                onClick={saveTeam}
                disabled={isSaving}
                className={cn(
                  "w-full py-5 bg-[#37003c] text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2",
                  isSaving && "opacity-50 cursor-not-allowed"
                )}
              >
                {isSaving ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <SaveIcon size={20} />
                )}
                {isSaving ? 'Saving Team...' : 'Save Team'}
              </button>
            </motion.div>
          )}

          {activeTab === 'players' && (
            <motion.div
              key="players"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Filters */}
              <div className="flex flex-col gap-4">
                <div className="relative group">
                  <SearchIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                  <input 
                    type="text" 
                    placeholder="Search players..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/5 rounded-[24px] py-5 px-14 text-sm font-black tracking-tight dark:text-white shadow-3d-sm focus:shadow-3d-md transition-all outline-none"
                  />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                  {[null, 'GK', 'DEF', 'MID', 'FWD'].map(pos => (
                    <button
                      key={pos || 'all'}
                      onClick={() => setSelectedPosition(pos)}
                      className={cn(
                        "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap btn-3d",
                        selectedPosition === pos 
                          ? "bg-blue-600 text-white" 
                          : "bg-white dark:bg-gray-900 text-gray-400 border border-gray-100 dark:border-white/5"
                      )}
                    >
                      {pos || 'All Positions'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Player List */}
              <div className="grid gap-4">
                {filteredPlayers.map(player => {
                  const team = teams.find(t => t.id === player.teamId);
                  return (
                    <div 
                      key={player.id}
                      onClick={() => onPlayerClick?.(player.id)}
                      className="bg-white dark:bg-gray-900 p-4 rounded-[32px] border border-gray-100 dark:border-white/5 flex items-center gap-4 hover:shadow-3d-lg transition-all group cursor-pointer shadow-3d-sm"
                    >
                      <div className="w-14 h-14 bg-gray-50 dark:bg-gray-800 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center p-1 group-hover:scale-105 transition-transform">
                        {player.imageUrl ? <img src={player.imageUrl} className="w-full h-full object-cover" /> : <UsersIcon className="text-gray-200" />}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-black text-gray-900 dark:text-white uppercase tracking-tight text-sm leading-tight">{player.name}</h4>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                          {team?.name || 'Unknown Team'} • {player.position}
                        </p>
                      </div>
                      <div className="text-right flex items-center gap-4">
                        <div className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-full border border-blue-100 dark:border-blue-800">
                           <span className="text-xs font-black text-blue-600 dark:text-blue-400">£{player.price.toFixed(1)}m</span>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            addPlayerToSquad(player.id);
                          }}
                          className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-200 hover:scale-110 active:scale-95 transition-all"
                        >
                          <PlusIcon size={18} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {activeTab === 'leagues' && (
            <motion.div
              key="leagues"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-8"
            >
              {/* Leaderboard */}
              <div className="bg-white dark:bg-gray-900 rounded-[40px] shadow-3d-lg border border-gray-100 dark:border-white/5 overflow-hidden">
                <div className="p-8 border-b border-gray-50 dark:border-white/5 flex items-center justify-between">
                  <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Main Global League</h3>
                  <TrophyIcon className="text-yellow-500" size={24} />
                </div>
                <div className="divide-y divide-gray-50 dark:divide-white/5">
                  {[1, 2, 3, 4, 5].map(rank => (
                    <div key={rank} className="p-6 flex items-center gap-6 group hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer">
                      <span className={cn(
                        "w-8 h-8 flex items-center justify-center rounded-xl font-black text-xs",
                        rank === 1 ? "bg-yellow-400 text-black shadow-lg shadow-yellow-200" :
                        rank === 2 ? "bg-slate-200 text-slate-600" :
                        rank === 3 ? "bg-orange-100 text-orange-600" : "text-gray-300 dark:text-gray-700"
                      )}>
                        {rank}
                      </span>
                      <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                        <UsersIcon size={16} className="text-blue-500" />
                      </div>
                      <div className="flex-1">
                        <p className="font-black text-gray-900 dark:text-white uppercase text-sm tracking-tight">Pro Player {rank}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">FC Super Star</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-gray-900 dark:text-white italic">{400 - (rank * 12)}</p>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">pts</p>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="w-full py-6 text-xs font-black text-blue-600 uppercase tracking-widest hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  View Full Standings
                </button>
              </div>

              {/* Private Leagues */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-[40px] shadow-2xl text-white relative overflow-hidden group cursor-pointer">
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
                  <div className="relative z-10 flex flex-col h-full">
                    <PlusIcon className="w-12 h-12 mb-6 opacity-40 group-hover:scale-110 transition-transform" />
                    <h4 className="text-xl font-black tracking-tight mb-2">Create a League</h4>
                    <p className="text-white/60 text-xs font-bold leading-relaxed mb-6 uppercase tracking-widest">Challenge your friends and show who's the boss.</p>
                    <button className="mt-auto px-6 py-3 bg-white text-blue-600 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:scale-105 active:scale-95 transition-all">Start Now</button>
                  </div>
                </div>
                <div className="bg-[#0A0A0A] p-8 rounded-[40px] shadow-2xl text-white border border-white/5 relative overflow-hidden group cursor-pointer">
                  <div className="relative z-10 flex flex-col h-full">
                    <LayoutIcon className="w-12 h-12 mb-6 text-blue-500 group-hover:scale-110 transition-transform" />
                    <h4 className="text-xl font-black tracking-tight mb-2">Join League</h4>
                    <p className="text-white/40 text-xs font-bold leading-relaxed mb-6 uppercase tracking-widest">Enter a private league code to compete with others.</p>
                    <button className="mt-auto px-6 py-3 bg-white/5 text-white border border-white/10 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-white/10 transition-all">Enter Code</button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ChipButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all active:scale-95",
        active 
          ? "bg-[#37003c] border-[#37003c] text-white shadow-lg" 
          : "bg-white dark:bg-gray-900 border-gray-100 dark:border-white/5 text-gray-900 dark:text-white"
      )}
    >
      <span className="text-[10px] font-black uppercase tracking-widest leading-none">{label}</span>
      <span className={cn(
        "text-[9px] font-black uppercase tracking-widest",
        active ? "text-purple-400" : "text-gray-400"
      )}>PLAY</span>
    </button>
  );
}

interface FantasyPlayerSlotProps {
  position: string;
  player?: FantasyPlayer;
  teams?: Team[];
  isCaptain?: boolean;
  isViceCaptain?: boolean;
  isBench?: boolean;
  onRemove?: (playerId: string) => void;
  onClick?: () => void;
  isSelected?: boolean;
}

const FantasyPlayerSlot: React.FC<FantasyPlayerSlotProps> = ({ 
  position, 
  player, 
  teams = [],
  isCaptain,
  isViceCaptain,
  isBench,
  onRemove,
  onClick,
  isSelected
}) => {
  const team = player ? teams.find(t => t.id === player.teamId) : null;
  const fixture = "BOU (H)"; // Mocked fixture

  return (
    <div 
      className={cn(
        "flex flex-col items-center gap-0.5 group cursor-pointer w-16 sm:w-20 transition-all",
        isSelected && "scale-110 z-20"
      )}
      onClick={() => {
        if (onClick) {
           onClick();
        } else if (player) {
           onRemove?.(player.id);
        }
      }}
    >
      <div className="relative">
        <div className={cn(
          "w-12 h-14 sm:w-14 sm:h-16 flex items-center justify-center transition-all group-hover:scale-110",
          isSelected && "ring-4 ring-yellow-400 ring-offset-2 ring-offset-transparent rounded-lg"
        )}>
          {player ? (
             <div className="relative w-full h-full flex flex-col items-center">
                {/* Player Photo or Jersey */}
                <div className="relative w-full h-full flex items-center justify-center">
                   {player.imageUrl ? (
                     <div className="relative w-full h-full bg-black/20 rounded-lg overflow-hidden border border-white/20">
                        <img src={player.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                     </div>
                   ) : (
                      <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-md">
                         <path 
                           d="M20,25 Q20,10 50,10 Q80,10 80,25 L85,45 L70,55 L70,110 L30,110 L30,55 L15,45 Z" 
                           fill={position === 'GK' || position === 'GKP' ? "#ffd700" : (isBench ? "#333" : "#e90052")} 
                         />
                         <path d="M50,10 Q50,25 35,25 Q50,35 65,25 Q50,25 50,10" fill="rgba(0,0,0,0.1)" />
                      </svg>
                   )}
                   
                   {/* Team Logo Badge */}
                   {team?.logo && (
                     <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full p-1 shadow-md border border-gray-100 flex items-center justify-center">
                        <img src={team.logo} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                     </div>
                   )}
                </div>
                {isCaptain && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-black rounded-full border border-white flex items-center justify-center text-white font-black text-[10px]">C</div>
                )}
                {isViceCaptain && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-black rounded-full border border-white flex items-center justify-center text-white font-black text-[10px]">V</div>
                )}
             </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border px-2 border-white/20 border-dashed flex items-center justify-center">
              <PlusIcon className="text-white/40" size={16} />
            </div>
          )}
        </div>
        
        {/* Tap Icon overlay for players */}
        {player && !isSelected && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <LayoutGridIcon size={16} className="text-white drop-shadow-lg" />
          </div>
        )}
      </div>
      
      {player && (
        <div className="flex flex-col items-center w-full">
          {/* Name Box */}
          <div className="bg-[#37003c] text-white w-full py-0.5 px-1 rounded-sm text-center shadow-md">
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-tight truncate block">
              {player.name.split(' ').pop()}
            </span>
          </div>
          {/* Fixture Box */}
          <div className="bg-[#0288d1] text-white w-full py-0.5 px-1 rounded-sm text-center shadow-sm mt-0.5">
            <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-tighter block">
              {fixture}
            </span>
          </div>
        </div>
      )}

      {!player && (
        <div className="flex flex-col items-center">
          <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-white/40 bg-black/20 px-2 py-0.5 rounded-full">
            {position}
          </span>
        </div>
      )}
    </div>
  );
};
