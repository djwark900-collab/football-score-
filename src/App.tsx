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
  ArrowLeftRight as TransferIcon,
  Bell as BellIcon,
  X as XIcon
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
  getDocFromServer,
  collectionGroup,
  limit,
  orderBy
} from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { cn } from './lib/utils';
import { League, Game, Team, Player, Venue, Administrator, Transfer, AppNotification } from './types';

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
  const [followedGames, setFollowedGames] = useState<{ id: string; gameId: string }[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
  const [showOnlyLive, setShowOnlyLive] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [activeBanner, setActiveBanner] = useState<AppNotification | null>(null);
  const [transferFilter, setTransferFilter] = useState<'worldwide' | 'domestic' | 'top'>('worldwide');

  // Settings state
  const [prefNotifications, setPrefNotifications] = useState(() => {
    return localStorage.getItem('pref_notifications') === 'true';
  });
  const [prefMobileBanners, setPrefMobileBanners] = useState(() => {
    return localStorage.getItem('pref_mobile_banners') === 'true';
  });
  const [prefTimeFormat, setPrefTimeFormat] = useState<'12h' | '24h'>(() => {
    return (localStorage.getItem('pref_time_format') as any) || '24h';
  });
  const [prefTheme, setPrefTheme] = useState<'system' | 'light' | 'dark'>(() => {
    return (localStorage.getItem('pref_theme') as any) || 'system';
  });

  useEffect(() => {
    localStorage.setItem('pref_notifications', prefNotifications.toString());
  }, [prefNotifications]);

  useEffect(() => {
    localStorage.setItem('pref_mobile_banners', prefMobileBanners.toString());
  }, [prefMobileBanners]);

  useEffect(() => {
    localStorage.setItem('pref_time_format', prefTimeFormat);
  }, [prefTimeFormat]);

  useEffect(() => {
    localStorage.setItem('pref_theme', prefTheme);
    
    // Apply theme
    const root = window.document.documentElement;
    if (prefTheme === 'dark') {
      root.classList.add('dark');
    } else if (prefTheme === 'light') {
      root.classList.remove('dark');
    } else {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (systemDark) root.classList.add('dark');
      else root.classList.remove('dark');
    }
  }, [prefTheme]);

  // Auth Listener
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
  }, []);

  // Match Notifications Sync
  useEffect(() => {
    if (!user) {
      setFollowedGames([]);
      return;
    }
    const path = `users/${user.uid}/matchNotifications`;
    const q = collection(db, path);
    return onSnapshot(q, (snapshot) => {
      setFollowedGames(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as { id: string; gameId: string })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, path));
  }, [user]);

  const toggleMatchFollow = async (gameId: string) => {
    if (!user) {
      handleLogin();
      return;
    }

    const existingFollow = followedGames.find(f => f.gameId === gameId);
    const path = `users/${user.uid}/matchNotifications`;

    try {
      if (existingFollow) {
        const { deleteDoc: firestoreDeleteDoc } = await import('firebase/firestore');
        await firestoreDeleteDoc(doc(db, path, existingFollow.id));
      } else {
        await addDoc(collection(db, path), { gameId });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

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
    const q = query(collection(db, path), orderBy('name', 'asc'));
    return onSnapshot(q, (snapshot) => {
      setLeagues(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as League)));
    }, (error) => {
      if (error.message.includes('Quota limit exceeded')) setQuotaExceeded(true);
      handleFirestoreError(error, OperationType.LIST, path);
    });
  }, []);

  // Firestore Sync - Games
  useEffect(() => {
    const path = 'games';
    const q = query(
      collection(db, path), 
      orderBy('date', 'desc'),
      limit(50)
    );
    return onSnapshot(q, (snapshot) => {
      const g = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Game));
      setGames(g);
    }, (error) => {
      if (error.message.includes('Quota limit exceeded')) setQuotaExceeded(true);
      handleFirestoreError(error, OperationType.LIST, path);
    });
  }, []);

  // Firestore Sync - Teams
  useEffect(() => {
    const path = 'teams';
    const q = query(collection(db, path), orderBy('name', 'asc'));
    return onSnapshot(q, (snapshot) => {
      setTeams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team)));
    }, (error) => {
      if (error.message.includes('Quota limit exceeded')) setQuotaExceeded(true);
      handleFirestoreError(error, OperationType.LIST, path);
    });
  }, []);

  // Firestore Sync - Players
  useEffect(() => {
    const path = 'players';
    // Limiting to 100 players for now to save quota. 
    // Ideally pagination or searching should be used.
    const q = query(collection(db, path), limit(100));
    return onSnapshot(q, (snapshot) => {
      setPlayers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Player)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, path));
  }, []);

  // Firestore Sync - Venues
  useEffect(() => {
    const path = 'venues';
    const q = query(collection(db, path), orderBy('name', 'asc'));
    return onSnapshot(q, (snapshot) => {
      setVenues(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Venue)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, path));
  }, []);

  // Firestore Sync - Transfers
  useEffect(() => {
    const path = 'transfers';
    const q = query(
      collection(db, path), 
      orderBy('date', 'desc'),
      limit(20)
    );
    return onSnapshot(q, (snapshot) => {
      const t = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transfer));
      setTransfers(t);
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

  // Real-time Match Event Tracking for Notifications
  const lastEventsRef = React.useRef<Record<string, number>>({});
  
  useEffect(() => {
    if (games.length === 0) return;
    
    const newNotifications: AppNotification[] = [];
    
    games.forEach(game => {
      const prevCount = lastEventsRef.current[game.id] || 0;
      const currentEvents = game.events || [];
      const isFollowed = followedGames.some(f => f.gameId === game.id);
      
      if (currentEvents.length > prevCount) {
        // New events detected
        const newEvents = currentEvents.slice(prevCount);
        newEvents.forEach(event => {
          const team = teams.find(t => t.id === event.teamId);
          const player = players.find(p => p.id === event.playerId);
          const opponent = teams.find(t => t.id === (game.homeTeamId === event.teamId ? game.awayTeamId : game.homeTeamId));
          
          let title = '';
          let message = '';
          
          switch(event.type) {
            case 'goal':
              title = 'GOAL! ⚽️';
              message = `${player?.name || 'Player'} scores for ${team?.name || 'Team'} vs ${opponent?.name || 'Opponent'}!`;
              break;
            case 'penalty':
              title = 'PENALTY! 🥅';
              message = `Penalty awarded to ${team?.name || 'Team'} at ${event.minute}' minute!`;
              break;
            case 'red':
              title = 'RED CARD! 🟥';
              message = `${player?.name || 'Player'} (${team?.name}) sent off!`;
              break;
            case 'yellow':
              title = 'YELLOW CARD! 🟨';
              message = `${player?.name || 'Player'} (${team?.name}) booked.`;
              break;
          }
          
          if (title && prefNotifications) {
            // Only notify if followed OR major event
            if (isFollowed || ['goal', 'red'].includes(event.type)) {
              const notif: AppNotification = {
                id: Math.random().toString(36).substr(2, 9),
                type: event.type as any,
                title,
                message,
                gameId: game.id,
                timestamp: new Date().toISOString(),
                isRead: false
              };
              newNotifications.push(notif);
              
              if (prefMobileBanners) {
                setActiveBanner(notif);
                setTimeout(() => setActiveBanner(null), 5000);
              }
            }
          }
        });
      }
      
      // Update ref
      lastEventsRef.current[game.id] = currentEvents.length;
    });
    
    if (newNotifications.length > 0) {
      setNotifications(prev => [...newNotifications, ...prev].slice(0, 50));
    }
  }, [games, teams, players]);

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

      {quotaExceeded && (
        <div className="bg-orange-500 text-white px-4 py-2 text-center text-xs font-bold animate-pulse">
          Firestore Quota Exceeded. Data may be stale or partially loaded. Limits reset at midnight PT.
        </div>
      )}

      {/* Floating Mobile Banner */}
      <AnimatePresence>
        {activeBanner && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            onClick={() => {
              if (activeBanner.gameId) {
                setSelectedGameId(activeBanner.gameId);
                navigateTo('game-details');
              }
              setActiveBanner(null);
            }}
            className="fixed top-4 left-4 right-4 z-[100] cursor-pointer"
          >
            <div className="bg-white/90 dark:bg-gray-900/90 text-gray-900 dark:text-white p-3.5 rounded-[28px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] flex items-center gap-4 border border-white/20 backdrop-blur-2xl ring-1 ring-black/5">
               <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-blue-200">
                 {activeBanner.type === 'goal' ? '⚽️' : activeBanner.type === 'penalty' ? '🥅' : activeBanner.type === 'red' ? '🟥' : '🟨'}
               </div>
               <div className="flex-1 overflow-hidden">
                 <div className="flex items-center gap-2 mb-0.5">
                   <p className="font-black text-[13px] leading-none">{activeBanner.title}</p>
                   <span className="text-[10px] text-gray-400 font-bold">• Just now</span>
                 </div>
                 <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 truncate tracking-tight">{activeBanner.message}</p>
               </div>
               <div className="w-1 h-8 bg-gray-100 rounded-full mx-1" />
               <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveBanner(null);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-all"
               >
                 <XIcon size={16} className="text-gray-400" />
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
      </AnimatePresence>

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
                        isFollowing={followedGames.some(f => f.gameId === game.id)}
                        onToggleFollow={() => toggleMatchFollow(game.id)}
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
                        isFollowing={followedGames.some(f => f.gameId === game.id)}
                        onToggleFollow={() => toggleMatchFollow(game.id)}
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
                        isFollowing={followedGames.some(f => f.gameId === game.id)}
                        onToggleFollow={() => toggleMatchFollow(game.id)}
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
              players={players}
              onBack={() => navigateTo('leagues')}
              onGameClick={(id) => {
                setSelectedGameId(id);
                navigateTo('game-details');
              }}
              onTeamClick={(id) => {
                setSelectedTeamId(id);
                navigateTo('team-details');
              }}
              onPlayerClick={(id) => {
                setSelectedPlayerId(id);
                navigateTo('player-details');
              }}
              isAdmin={isAdmin}
              onAddGame={() => navigateTo('admin')}
              followedGames={followedGames.map(f => f.gameId)}
              onToggleFollowMatch={toggleMatchFollow}
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
              onLeagueClick={(id) => {
                setSelectedLeagueId(id);
                navigateTo('league-details');
              }}
              onGameClick={(id) => {
                setSelectedGameId(id);
                navigateTo('game-details');
              }}
              onPlayerClick={(id) => {
                setSelectedPlayerId(id);
                navigateTo('player-details');
              }}
              isAdmin={isAdmin}
              isFollowing={followedGames.some(f => f.gameId === selectedGameId)}
              onToggleFollow={() => toggleMatchFollow(selectedGameId)}
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
              onTeamClick={(id) => {
                setSelectedTeamId(id);
                navigateTo('team-details');
              }}
              followedGames={followedGames.map(f => f.gameId)}
              onToggleFollowMatch={toggleMatchFollow}
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
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h2 className="text-2xl font-black flex items-center gap-3">
                  <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100">
                    <TransferIcon className="text-white" size={24} />
                  </div>
                  Transfer Market
                </h2>
                <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm w-full sm:w-auto">
                  <button 
                    onClick={() => setTransferFilter('worldwide')}
                    className={cn(
                      "flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black transition-all",
                      transferFilter === 'worldwide' ? "bg-gray-900 text-white shadow-lg" : "text-gray-400 hover:text-gray-600"
                    )}
                  >
                    Worldwide
                  </button>
                  <button 
                    onClick={() => setTransferFilter('top')}
                    className={cn(
                      "flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black transition-all",
                      transferFilter === 'top' ? "bg-gray-900 text-white shadow-lg" : "text-gray-400 hover:text-gray-600"
                    )}
                  >
                    Top Leagues
                  </button>
                  <button 
                    onClick={() => setTransferFilter('domestic')}
                    className={cn(
                      "flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black transition-all",
                      transferFilter === 'domestic' ? "bg-gray-900 text-white shadow-lg" : "text-gray-400 hover:text-gray-600"
                    )}
                  >
                    Domestic
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {(() => {
                  const filtered = transfers.filter(t => {
                    if (transferFilter === 'worldwide') return true;
                    const fromTeam = teams.find(team => team.id === t.fromTeamId);
                    const toTeam = teams.find(team => team.id === t.toTeamId);
                    const fromLeague = leagues.find(l => l.id === fromTeam?.leagueId);
                    const toLeague = leagues.find(l => l.id === toTeam?.leagueId);

                    if (transferFilter === 'domestic') {
                      return fromLeague?.country && toLeague?.country && fromLeague.country === toLeague.country;
                    }
                    if (transferFilter === 'top') {
                      const topCountries = ['England', 'Spain', 'Germany', 'Italy', 'France', 'Portugal', 'Netherlands', 'Saudi Arabia', 'USA'];
                      return (fromLeague?.country && topCountries.includes(fromLeague.country)) || 
                             (toLeague?.country && topCountries.includes(toLeague.country));
                    }
                    return true;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="p-12 text-center bg-white rounded-[40px] border border-gray-100 text-gray-400">
                        <TransferIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p className="font-bold">No transfers found in this category.</p>
                      </div>
                    );
                  }

                  return filtered.map((t, idx) => {
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
                  });
                })()}
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
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-4 mb-2">
                <div className="p-3 bg-gray-900 rounded-2xl shadow-lg ring-4 ring-gray-50">
                  <SettingsIcon className="text-white" size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black">Preferences</h2>
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest leading-none">App Configuration</p>
                </div>
              </div>

              <div className="bg-white rounded-[40px] p-8 border border-gray-100 shadow-sm space-y-6">
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Notifications</h3>
                  
                  <div className="flex justify-between items-center group">
                    <div>
                      <p className="font-black text-gray-900">Allow Notifications</p>
                      <p className="text-xs text-gray-500 font-medium">Get real-time alerts for match events</p>
                    </div>
                    <button 
                      onClick={() => setPrefNotifications(!prefNotifications)}
                      className={cn(
                        "w-14 h-8 rounded-full transition-all relative",
                        prefNotifications ? "bg-blue-600 shadow-lg shadow-blue-100" : "bg-gray-100"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-sm",
                        prefNotifications ? "left-7" : "left-1"
                      )} />
                    </button>
                  </div>

                  <div className="flex justify-between items-center group pt-4 border-t border-gray-50">
                    <div>
                      <p className="font-black text-gray-900">Banners mobile</p>
                      <p className="text-xs text-gray-500 font-medium">Show match updates as floating top banners</p>
                    </div>
                    <button 
                      onClick={() => setPrefMobileBanners(!prefMobileBanners)}
                      className={cn(
                        "w-14 h-8 rounded-full transition-all relative",
                        prefMobileBanners ? "bg-blue-600 shadow-lg shadow-blue-100" : "bg-gray-100"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-sm",
                        prefMobileBanners ? "left-7" : "left-1"
                      )} />
                    </button>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100">
                  <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Interface</h3>
                  
                  <div className="space-y-6">
                    <div className="flex justify-between items-center group">
                      <div>
                        <p className="font-black text-gray-900">Time Format</p>
                        <p className="text-xs text-gray-500 font-medium">Choose how match times are displayed</p>
                      </div>
                      <div className="flex bg-gray-50 p-1 rounded-2xl border border-gray-100">
                        <button 
                          onClick={() => setPrefTimeFormat('12h')}
                          className={cn(
                            "px-4 py-2 rounded-xl text-[10px] font-black transition-all",
                            prefTimeFormat === '12h' ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
                          )}
                        >
                          AM/PM
                        </button>
                        <button 
                          onClick={() => setPrefTimeFormat('24h')}
                          className={cn(
                            "px-4 py-2 rounded-xl text-[10px] font-black transition-all",
                            prefTimeFormat === '24h' ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
                          )}
                        >
                          24H
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center group pt-4 border-t border-gray-50">
                      <div>
                        <p className="font-black text-gray-900">Theme Mode</p>
                        <p className="text-xs text-gray-500 font-medium">Select your interface appearance</p>
                      </div>
                      <div className="flex bg-gray-50 p-1 rounded-2xl border border-gray-100">
                        {(['system', 'light', 'dark'] as const).map(t => (
                          <button 
                            key={t}
                            onClick={() => setPrefTheme(t)}
                            className={cn(
                              "px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all",
                              prefTheme === t ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
                            )}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {isAdmin && (
                <div className="p-6 bg-blue-50 rounded-[32px] border border-blue-100 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-600 rounded-xl text-white">
                      <ShieldIcon size={20} />
                    </div>
                    <div>
                      <p className="font-black text-blue-900">Admin Mode Active</p>
                      <p className="text-xs text-blue-600 font-bold">You have full database access</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => navigateTo('admin')}
                    className="px-4 py-2 bg-white text-blue-600 rounded-xl font-black text-xs shadow-sm hover:shadow-md transition-all"
                  >
                    Open Panel
                  </button>
                </div>
              )}
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
