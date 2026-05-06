/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trophy as TrophyIcon, 
  Users as UsersIcon, 
  MapPin as MapPinIcon, 
  Calendar as CalendarIcon, 
  Settings as SettingsIcon, 
  Search as SearchIcon, 
  Plus as PlusIcon, 
  Lock as LockIcon,
  ChevronRight as ChevronRightIcon,
  TrendingUp as TrendingUpIcon,
  Clock as ClockIcon,
  Shield as ShieldIcon,
  Activity as ActivityIcon,
  History as HistoryIcon,
  Layout as LayoutIcon,
  Heart as HeartIcon,
  ArrowLeftRight as TransferIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  where,
  getDocFromServer
} from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { cn } from './lib/utils';
import { League, Game, Team, Player, Venue, Season, Administrator, Transfer } from './types';

// Components
import { AdminPanel } from './components/AdminPanel';
import { GameCard } from './components/GameCard';
import { GameDetails } from './components/GameDetails';
import { Header } from './components/Header';
import { Standings } from './components/Standings';
import { LeagueDetails } from './components/LeagueDetails';
import { PlayerDetails } from './components/PlayerDetails';

import { TeamDetails } from './components/TeamDetails';

type View = 'matches' | 'leagues' | 'standings' | 'admin' | 'settings' | 'game-details' | 'league-details' | 'team-details' | 'player-details' | 'transfers';

export default function App() {
  const [view, setView] = useState<View>('matches');
  const [previousView, setPreviousView] = useState<View>('matches');
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  const navigateTo = (newView: View) => {
    setPreviousView(view);
    setView(newView);
  };
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  
  // Data State
  const [leagues, setLeagues] = useState<League[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [administrators, setAdministrators] = useState<Administrator[]>([]);
  const [favorites, setFavorites] = useState<{ id: string; teamId: string }[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
  const [showOnlyLive, setShowOnlyLive] = useState(false);

  // Auth Listener
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
  }, []);

  // Favorites Sync
  useEffect(() => {
    if (!user) {
      setFavorites([]);
      return;
    }
    const path = `users/${user.uid}/favorites`;
    const q = collection(db, path);
    return onSnapshot(q, (snapshot) => {
      setFavorites(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as { id: string; teamId: string })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, path));
  }, [user]);

  const toggleFavorite = async (teamId: string) => {
    if (!user) {
      handleLogin();
      return;
    }

    const existingFav = favorites.find(f => f.teamId === teamId);
    const path = `users/${user.uid}/favorites`;

    try {
      if (existingFav) {
        const { deleteDoc: firestoreDeleteDoc } = await import('firebase/firestore');
        await firestoreDeleteDoc(doc(db, path, existingFav.id));
      } else {
        await addDoc(collection(db, path), { teamId });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  // Firestore Sync - Leagues
  useEffect(() => {
    const path = 'leagues';
    const q = collection(db, path);
    return onSnapshot(q, (snapshot) => {
      setLeagues(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as League)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, path));
  }, []);

  // Firestore Sync - Games
  useEffect(() => {
    const path = 'games';
    const q = collection(db, path);
    return onSnapshot(q, (snapshot) => {
      const g = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Game));
      setGames(g.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    }, (error) => handleFirestoreError(error, OperationType.LIST, path));
  }, []);

  // Firestore Sync - Teams
  useEffect(() => {
    const path = 'teams';
    const q = collection(db, path);
    return onSnapshot(q, (snapshot) => {
      setTeams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, path));
  }, []);

  // Firestore Sync - Players
  useEffect(() => {
    const path = 'players';
    const q = collection(db, path);
    return onSnapshot(q, (snapshot) => {
      setPlayers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Player)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, path));
  }, []);

  // Firestore Sync - Venues
  useEffect(() => {
    const path = 'venues';
    const q = collection(db, path);
    return onSnapshot(q, (snapshot) => {
      setVenues(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Venue)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, path));
  }, []);

  // Firestore Sync - Transfers
  useEffect(() => {
    const path = 'transfers';
    const q = collection(db, path);
    return onSnapshot(q, (snapshot) => {
      const t = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transfer));
      setTransfers(t.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    }, (error) => handleFirestoreError(error, OperationType.LIST, path));
  }, []);

  // Firestore Sync - Admins
  useEffect(() => {
    if (!user) {
      setAdministrators([]);
      return;
    }
    const path = 'admins';
    const q = collection(db, path);
    return onSnapshot(q, (snapshot) => {
      setAdministrators(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Administrator)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, path));
  }, [user]);

  // Admin Check
  useEffect(() => {
    if (user?.email) {
      const isSystemAdmin = user.email === 'pitop6988@gmail.com';
      const isAuthAdmin = administrators.some(admin => admin.email.toLowerCase() === user.email?.toLowerCase());
      if (isSystemAdmin || isAuthAdmin) {
        setIsAdmin(true);
      }
    }
  }, [user, administrators]);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        console.log('Login cancelled by user');
      } else if (error.code === 'auth/popup-blocked') {
        alert('Please allow popups for this site to sign in.');
      } else if (error.code === 'auth/cancelled-popup-request') {
        // Silently ignore or log - logic already handles this
      } else {
        console.error('Login error:', error);
      }
    }
  };

  const handleAdminAuth = () => {
    if (adminPassword === 'EMAD8912') {
      setIsAdmin(true);
      setShowAdminLogin(false);
      setView('admin');
    } else {
      alert('Incorrect Password');
    }
  };

  const filteredGames = useMemo(() => {
    let g = games;
    if (selectedLeagueId) g = g.filter(game => game.leagueId === selectedLeagueId);
    if (showOnlyLive) g = g.filter(game => game.status === 'live');
    return g;
  }, [games, selectedLeagueId, showOnlyLive]);

  const liveGames = useMemo(() => games.filter(g => g.status === 'live'), [games]);

  return (
    <div className="min-h-screen bg-[#F8F9FE] text-[#1A1A1A] font-sans selection:bg-blue-100 pb-24">
      {/* Header */}
      <Header 
        user={user} 
        onLogin={handleLogin} 
        setView={navigateTo} 
        isAdmin={isAdmin}
        onAdminClick={() => isAdmin ? navigateTo('admin') : setShowAdminLogin(true)}
        leagues={leagues}
        teams={teams}
        players={players}
        onLeagueClick={(id) => {
          setSelectedLeagueId(id);
          navigateTo('league-details');
        }}
        onTeamClick={(id) => {
          setSelectedTeamId(id);
          navigateTo('team-details');
        }}
        onPlayerClick={(id) => {
          setSelectedPlayerId(id);
          navigateTo('player-details');
        }}
      />

      <main className="max-w-4xl mx-auto px-4 pt-6">
        <AnimatePresence mode="wait">
          {view === 'matches' && (
            <motion.div
              key="matches"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {/* League Tabs */}
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                <button 
                  onClick={() => setSelectedLeagueId(null)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap",
                    !selectedLeagueId ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "bg-white text-gray-500 hover:bg-gray-50"
                  )}
                >
                  All Matches
                </button>
                {leagues.map((league, index) => (
                  <button
                    key={league.id}
                    onClick={() => setSelectedLeagueId(league.id)}
                    className={cn(
                      "px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap",
                      selectedLeagueId === league.id 
                        ? (index === 4 ? "bg-yellow-400 text-black shadow-lg shadow-yellow-100" : "bg-blue-600 text-white shadow-lg shadow-blue-200")
                        : (index === 4 ? "bg-yellow-50 text-yellow-700 border border-yellow-200" : "bg-white text-gray-500 hover:bg-gray-50")
                    )}
                  >
                    {league.logo && <img src={league.logo} alt="" className="w-4 h-4 rounded-full" />}
                    {league.name}
                  </button>
                ))}
              </div>

              {/* Live Match Hero (if any) */}
              {liveGames.length > 0 && (
                <section>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      Live Match
                    </h2>
                    <button 
                      onClick={() => {
                        setShowOnlyLive(!showOnlyLive);
                        setSelectedLeagueId(null);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className={cn(
                        "text-sm font-bold px-4 py-2 rounded-xl transition-all",
                        showOnlyLive ? "bg-red-50 text-red-600 border border-red-100" : "text-blue-600 hover:bg-blue-50"
                      )}
                    >
                      {showOnlyLive ? 'Show All' : 'View All'}
                    </button>
                  </div>
                  <div className="grid gap-4">
                    {liveGames.map(game => (
                      <GameCard 
                        key={game.id} 
                        game={game} 
                        teams={teams} 
                        leagues={leagues}
                        onClick={() => {
                          setSelectedGameId(game.id);
                          navigateTo('game-details');
                        }}
                        onTeamClick={(id) => {
                          setSelectedTeamId(id);
                          navigateTo('team-details');
                        }}
                        isLive
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Scheduled/Finished Matches */}
              {user && (favorites.length > 0) && !selectedLeagueId && (
                <section>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                       <HeartIcon size={18} className="text-pink-500 fill-pink-500" />
                       My Favorites
                    </h2>
                  </div>
                  <div className="grid gap-4">
                    {games.filter(g => 
                      favorites.some(f => f.teamId === g.homeTeamId || f.teamId === g.awayTeamId)
                    ).slice(0, 3).map(game => (
                      <GameCard 
                        key={game.id} 
                        game={game} 
                        teams={teams}
                        leagues={leagues}
                        onClick={() => {
                          setSelectedGameId(game.id);
                          navigateTo('game-details');
                        }}
                        onTeamClick={(id) => {
                          setSelectedTeamId(id);
                          navigateTo('team-details');
                        }}
                      />
                    ))}
                  </div>
                </section>
              )}

              <section>
                <h2 className="text-lg font-bold mb-4">{selectedLeagueId ? (leagues.find(l => l.id === selectedLeagueId)?.name) : 'Recent & Upcoming'}</h2>
                <div className="grid gap-4">
                  {filteredGames.length > 0 ? (
                    filteredGames.map(game => (
                      <GameCard 
                        key={game.id} 
                        game={game} 
                        teams={teams}
                        leagues={leagues}
                        onClick={() => {
                          setSelectedGameId(game.id);
                          navigateTo('game-details');
                        }}
                        onTeamClick={(id) => {
                          setSelectedTeamId(id);
                          navigateTo('team-details');
                        }}
                      />
                    ))
                  ) : (
                    <div className="p-12 text-center bg-white rounded-3xl border border-gray-100 text-gray-400">
                      <CalendarIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p>No matches found</p>
                    </div>
                  )}
                </div>
              </section>
            </motion.div>
          )}

          {view === 'leagues' && (
             <motion.div
               key="leagues"
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="grid grid-cols-1 md:grid-cols-2 gap-4"
             >
               {leagues.map((league, index) => (
                 <div 
                   key={league.id} 
                   onClick={() => {
                     setSelectedLeagueId(league.id);
                     navigateTo('league-details');
                   }}
                    className={cn(
                      "p-4 rounded-3xl border transition-all cursor-pointer flex items-center gap-4 hover:shadow-md",
                      index === 4 ? "bg-yellow-50 border-yellow-200" : "bg-white border-gray-100"
                    )}
                 >
                    <div className={cn(
                       "w-12 h-12 rounded-2xl flex items-center justify-center overflow-hidden",
                       index === 4 ? "bg-yellow-200" : "bg-blue-50"
                     )}>
                      {league.logo ? <img src={league.logo} alt="" className="w-full h-full object-cover" /> : <TrophyIcon className={index === 4 ? "text-yellow-700" : "text-blue-600"} />}
                    </div>
                    <div>
                      <h3 className={cn("font-bold", index === 4 ? "text-yellow-900" : "text-gray-900")}>{league.name}</h3>
                      <p className={cn("text-sm", index === 4 ? "text-yellow-700/70" : "text-gray-500")}>{league.country || 'International'}</p>
                    </div>
                    <ChevronRightIcon className={cn("ml-auto", index === 4 ? "text-yellow-400" : "text-gray-300")} />
                 </div>
               ))}
             </motion.div>
          )}

          {view === 'league-details' && selectedLeagueId && (
            <LeagueDetails 
              league={leagues.find(l => l.id === selectedLeagueId)!}
              teams={teams}
              games={games}
              leagues={leagues}
              onBack={() => navigateTo('leagues')}
              onGameClick={(id) => {
                setSelectedGameId(id);
                navigateTo('game-details');
              }}
              onTeamClick={(id) => {
                setSelectedTeamId(id);
                navigateTo('team-details');
              }}
              isAdmin={isAdmin}
              onAddGame={() => navigateTo('admin')}
            />
          )}

          {view === 'game-details' && selectedGameId && (
            <GameDetails 
              game={games.find(g => g.id === selectedGameId)!} 
              teams={teams}
              games={games}
              leagues={leagues}
              players={players}
              venues={venues}
              onBack={() => navigateTo(previousView === 'league-details' ? 'league-details' : 'matches')}
              onTeamClick={(id) => {
                setSelectedTeamId(id);
                navigateTo('team-details');
              }}
              onPlayerClick={(id) => {
                setSelectedPlayerId(id);
                navigateTo('player-details');
              }}
              isAdmin={isAdmin}
            />
          )}

          {view === 'standings' && (
            <motion.div
              key="standings"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Standings 
                leagues={leagues}
                teams={teams}
                games={games}
                onTeamClick={(id) => {
                  setSelectedTeamId(id);
                  navigateTo('team-details');
                }}
              />
            </motion.div>
          )}
          {view === 'team-details' && selectedTeamId && (
            <TeamDetails 
              team={teams.find(t => t.id === selectedTeamId)!}
              teams={teams}
              games={games}
              players={players}
              leagues={leagues}
              isFavorite={favorites.some(f => f.teamId === selectedTeamId)}
              onToggleFavorite={() => toggleFavorite(selectedTeamId)}
              onBack={() => navigateTo(previousView === 'team-details' ? 'matches' : previousView)}
              onGameClick={(id) => {
                setSelectedGameId(id);
                navigateTo('game-details');
              }}
              onPlayerClick={(id) => {
                setSelectedPlayerId(id);
                navigateTo('player-details');
              }}
            />
          )}

          {view === 'player-details' && selectedPlayerId && (
            <PlayerDetails 
              player={players.find(p => p.id === selectedPlayerId)!}
              team={teams.find(t => t.id === players.find(p => p.id === selectedPlayerId)?.teamId)}
              onBack={() => navigateTo(previousView)}
            />
          )}

          {view === 'transfers' && (
            <motion.div
              key="transfers"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black flex items-center gap-3">
                  <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100">
                    <TransferIcon className="text-white" size={24} />
                  </div>
                  Transfer Market
                </h2>
              </div>

              <div className="space-y-4">
                {transfers.length > 0 ? (
                  transfers.map((t, idx) => {
                    const player = players.find(p => p.id === t.playerId);
                    const fromTeam = teams.find(team => team.id === t.fromTeamId);
                    const toTeam = teams.find(team => team.id === t.toTeamId);
                    
                    return (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        key={t.id} 
                        className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="flex flex-col sm:flex-row items-center gap-6">
                           {/* Player info */}
                          <div className="flex items-center gap-4 w-full sm:w-1/3">
                            <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center overflow-hidden border border-gray-100">
                              {player?.imageUrl ? <img src={player.imageUrl} alt="" className="w-full h-full object-cover" /> : <UsersIcon className="text-gray-300" />}
                            </div>
                            <div>
                               <p className="font-black text-gray-900">{player?.name || 'Unknown Player'}</p>
                               <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
                                 {player?.position || 'N/A'} • {new Date(t.date).toLocaleDateString()}
                               </span>
                            </div>
                          </div>

                          {/* Transfer path */}
                          <div className="flex items-center justify-center gap-4 flex-1">
                            <div className="flex flex-col items-center gap-1 group cursor-pointer" onClick={() => fromTeam && setSelectedTeamId(fromTeam.id) && navigateTo('team-details')}>
                              <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100">
                                {fromTeam?.logo ? <img src={fromTeam.logo} alt="" className="w-6 h-6 object-contain" /> : <ShieldIcon className="text-gray-300" />}
                              </div>
                              <span className="text-[10px] font-bold text-gray-400 truncate max-w-[60px]">{fromTeam?.name}</span>
                            </div>

                            <div className="flex flex-col items-center gap-1">
                               <div className="flex items-center gap-1">
                                  <div className="w-2 h-0.5 bg-gray-200 rounded-full" />
                                  <TransferIcon size={16} className="text-blue-600" />
                                  <div className="w-2 h-0.5 bg-gray-200 rounded-full" />
                               </div>
                               <span className={cn(
                                 "text-[10px] font-black uppercase px-2 py-0.5 rounded-full",
                                 t.type === 'loan' ? "bg-orange-50 text-orange-600" : "bg-green-50 text-green-600"
                               )}>
                                 {t.type}
                               </span>
                            </div>

                            <div className="flex flex-col items-center gap-1 group cursor-pointer" onClick={() => toTeam && setSelectedTeamId(toTeam.id) && navigateTo('team-details')}>
                              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100">
                                {toTeam?.logo ? <img src={toTeam.logo} alt="" className="w-6 h-6 object-contain" /> : <ShieldIcon className="text-blue-600" />}
                              </div>
                              <span className="text-[10px] font-bold text-gray-900 truncate max-w-[60px]">{toTeam?.name}</span>
                            </div>
                          </div>

                          {/* Fee */}
                          <div className="w-full sm:w-auto text-center sm:text-right">
                             <p className="text-lg font-black text-blue-600">{t.fee || 'N/A'}</p>
                             <p className="text-[10px] font-bold uppercase text-gray-400">Transfer Fee</p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                ) : (
                  <div className="p-12 text-center bg-white rounded-[40px] border border-gray-100 text-gray-400">
                    <TransferIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>No transfer activities recorded yet.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {view === 'admin' && isAdmin && (
            <AdminPanel 
              leagues={leagues}
              teams={teams}
              games={games}
              players={players}
              venues={venues}
              transfers={transfers}
              administrators={administrators}
              user={user}
              onLogin={handleLogin}
              defaultLeagueId={selectedLeagueId || undefined}
            />
          )}

          {view === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-bold">Preferences</h2>
              <div className="bg-white rounded-3xl p-6 border border-gray-100 space-y-4">
                <div className="flex justify-between items-center p-2">
                  <div>
                    <p className="font-medium">Dark Mode</p>
                    <p className="text-sm text-gray-500">Coming soon</p>
                  </div>
                  <div className="w-12 h-6 bg-gray-200 rounded-full relative">
                    <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full translate-x-0 transition-transform" />
                  </div>
                </div>
                <div className="flex justify-between items-center p-2 border-t border-gray-50">
                  <div>
                    <p className="font-medium">Notifications</p>
                    <p className="text-sm text-gray-500">Alerts for goals and kickoffs</p>
                  </div>
                   <div className="w-12 h-6 bg-blue-600 rounded-full relative">
                    <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full translate-x-6 transition-transform" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Admin Login Modal */}
      <AnimatePresence>
        {showAdminLogin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[40px] p-8 w-full max-w-sm shadow-2xl"
            >
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <LockIcon className="text-blue-600 w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-center mb-2">Admin Panel</h3>
              <p className="text-gray-500 text-center mb-8">Enter the master password to unlock administrative features.</p>
              
              <input 
                type="password" 
                placeholder="Enter Password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-600 mb-4 transition-all"
                onKeyDown={(e) => e.key === 'Enter' && handleAdminAuth()}
              />
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowAdminLogin(false)}
                  className="flex-1 py-4 font-bold text-gray-400"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAdminAuth}
                  className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-colors"
                >
                  Unlock
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-100 px-6 py-4 z-40">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <NavButton active={view === 'matches'} onClick={() => navigateTo('matches')} icon={<ClockIcon />} label="Matches" />
          <NavButton active={view === 'leagues'} onClick={() => navigateTo('leagues')} icon={<ShieldIcon />} label="Leagues" />
          <NavButton active={view === 'transfers'} onClick={() => navigateTo('transfers')} icon={<TransferIcon />} label="Transfers" />
          <NavButton active={view === 'settings'} onClick={() => navigateTo('settings')} icon={<SettingsIcon />} label="Settings" />
        </div>
      </nav>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 transition-all",
        active ? "text-blue-600" : "text-gray-400 hover:text-gray-600"
      )}
    >
      <div className={cn(
        "p-2 rounded-xl transition-all",
        active && "bg-blue-50"
      )}>
        {React.cloneElement(icon as React.ReactElement, { size: 24 })}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </button>
  );
}
