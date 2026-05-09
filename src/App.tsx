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
import { League, Game, Team, Player, Venue, Administrator, Transfer, AppNotification, Competition } from './types';

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
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  const navigateTo = (newView: View) => {
    setPreviousView(view);
    setView(newView);
    if (newView !== 'admin') {
      setAdminDefaultTeamId(null);
      setAdminDefaultLeagueId(null);
      setAdminDefaultPlayerId(null);
    }
  };
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  
  // Data State
  const [leagues, setLeagues] = useState<League[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
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
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [hasDismissedQuota, setHasDismissedQuota] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  const [activeBanner, setActiveBanner] = useState<AppNotification | null>(null);
  const [transferFilter, setTransferFilter] = useState<'worldwide' | 'domestic' | 'top'>('worldwide');
  const [adminDefaultTeamId, setAdminDefaultTeamId] = useState<string | null>(null);
  const [adminDefaultPlayerId, setAdminDefaultPlayerId] = useState<string | null>(null);
  const [adminDefaultLeagueId, setAdminDefaultLeagueId] = useState<string | null>(null);

  useEffect(() => {
    if (view === 'leagues' && !selectedLeagueId && competitions.length > 0) {
      setSelectedLeagueId(competitions[0].id);
    }
  }, [view, competitions, selectedLeagueId]);

  // Data Sync Status Tracking
  const [syncStatus, setSyncStatus] = useState<Record<string, boolean>>({
    leagues: false,
    games: false,
    teams: false,
    players: false,
    competitions: false
  });

  useEffect(() => {
    // Hide loading once essential data is fetched or after a timeout
    const essentialDataLoaded = syncStatus.leagues && syncStatus.games && syncStatus.teams && syncStatus.competitions;
    if (essentialDataLoaded) {
      setIsLoading(false);
    }

    const timeout = setTimeout(() => setIsLoading(false), 3000); // Max 3s loading
    return () => clearTimeout(timeout);
  }, [syncStatus]);

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
  const [prefLanguage, setPrefLanguage] = useState<'English' | 'Kurdish'>(() => {
    return (localStorage.getItem('pref_language') as any) || 'English';
  });

  const t = (key: string) => {
    const translations: Record<'English' | 'Kurdish', Record<string, string>> = {
      English: {
        matches: 'Matches',
        leagues: 'Leagues',
        transfers: 'Transfers',
        settings: 'Settings',
        standings: 'Standings',
        search_placeholder: 'Search leagues, teams, players...',
        admin: 'Admin',
        admin_panel: 'Admin Panel',
        pref_notifications: 'Allow Notifications',
        pref_notifications_desc: 'Get real-time alerts for match events',
        pref_banners: 'Banners mobile',
        pref_banners_desc: 'Show match updates as floating top banners',
        pref_time: 'Time Format',
        pref_time_desc: 'Choose how match times are displayed',
        pref_appearance: 'Appearance',
        pref_language: 'Language',
        pref_system: 'System Default',
        pref_light: 'Light Mode',
        pref_dark: 'Dark Mode',
        tap_lang: 'tap English Language',
        tap_lang_ku: 'tap Kurdish Language',
        live_match: 'Live Match',
        all_matches: 'All Matches',
        recent_upcoming: 'Recent & Upcoming',
        my_favorites: 'My Favorites',
        no_matches: 'No matches found',
        view_all: 'View All',
        show_all: 'Show All',
        transfer_market: 'Transfer Market',
        worldwide: 'Worldwide',
        top_leagues: 'Top Leagues',
        domestic: 'Domestic',
        transfer_fee: 'Transfer Fee',
        preferences: 'Preferences',
        app_config: 'App Configuration',
        no_transfers: 'No transfers found in this category.',
        unknown_player: 'Unknown Player'
      },
      Kurdish: {
        matches: 'یارییەکان',
        leagues: 'خولەکان',
        transfers: 'گواستنەوەکان',
        settings: 'ڕێکخستن',
        standings: 'ڕیزبەندی',
        search_placeholder: 'بگەڕێ بۆ خول، تیم، یاریزان...',
        admin: 'ئەدمین',
        admin_panel: 'پانێڵی ئەدمین',
        pref_notifications: 'ئاگادارکردنەوەکان',
        pref_notifications_desc: 'ئاگاداری ڕاستەوخۆ بۆ ڕووداوەکانی یاری',
        pref_banners: 'بانەری مۆبایل',
        pref_banners_desc: 'پیشاندانی نوێکارییەکان وەک بانەری سەرەوە',
        pref_time: 'کاتی یاری',
        pref_time_desc: 'شێوازی پیشاندانی کاتی یارییەکان هەڵبژێرە',
        pref_appearance: 'شێوە',
        pref_language: 'زمان',
        pref_system: 'سیستەمی بنەڕەتی',
        pref_light: 'دۆخی ڕووناک',
        pref_dark: 'دۆخی تاریک',
        tap_lang: 'tap English Language',
        tap_lang_ku: 'tap Kurdish Language',
        live_match: 'یاری ڕاستەوخۆ',
        all_matches: 'هەموو یارییەکان',
        recent_upcoming: 'یارییە نوێیەکان',
        my_favorites: 'دڵخوازەکانم',
        no_matches: 'هیچ یارییەک نەدۆزرایەوە',
        view_all: 'ببینە هەمووی',
        show_all: 'هەمووی پیشان بدە',
        transfer_market: 'بازاڕی گواستنەوە',
        worldwide: 'جیهانی',
        top_leagues: 'خولە باڵاکان',
        domestic: 'ناوخۆیی',
        transfer_fee: 'تێچووی گواستنەوە',
        preferences: 'پەسەندکراوەکان',
        app_config: 'ڕێکخستنی بەرنامە',
        no_transfers: 'هیچ گواستنەوەیەک لەم بەشەدا نییە.',
        unknown_player: 'یاریزانی نەناسراو'
      }
    };
    return translations[prefLanguage][key] || key;
  };

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
    
    const root = window.document.documentElement;
    const applyTheme = () => {
      if (prefTheme === 'dark') {
        root.classList.add('dark');
      } else if (prefTheme === 'light') {
        root.classList.remove('dark');
      } else {
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (systemDark) root.classList.add('dark');
        else root.classList.remove('dark');
      }
    };

    applyTheme();

    if (prefTheme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme();
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [prefTheme]);

  useEffect(() => {
    localStorage.setItem('pref_language', prefLanguage);
  }, [prefLanguage]);

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

  const handleError = (error: any, operation: OperationType, path: string) => {
    const errorMsg = error?.message || String(error);
    const isQuota = errorMsg.includes('Quota limit exceeded') || errorMsg.includes('Quota exceeded');
    const isConnectivityIssue = errorMsg.includes('Could not reach Cloud Firestore backend') || 
                                errorMsg.includes('client is offline') || 
                                errorMsg.includes('unavailable');

    if (isConnectivityIssue) {
      setIsOffline(true);
    }

    if (isQuota || (isConnectivityIssue && !navigator.onLine)) {
      if (!hasDismissedQuota) {
        setQuotaExceeded(true);
      }
    }
    // We log it but avoid throwing if it's a quota error we've already acknowledged to prevent app crashes
    try {
      handleFirestoreError(error, operation, path);
    } catch (e) {
      console.warn("Firestore error suppressed in UI:", e);
    }
  };

  // Firestore Sync - Leagues
  useEffect(() => {
    const path = 'leagues';
    const cached = localStorage.getItem('cache_leagues');
    if (cached) {
      try { setLeagues(JSON.parse(cached)); } catch(e) {}
    }
    const q = query(collection(db, path), orderBy('name', 'asc'), limit(30));
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as League));
      setLeagues(data);
      setSyncStatus(prev => ({ ...prev, leagues: true }));
      localStorage.setItem('cache_leagues', JSON.stringify(data));
    }, (error) => handleError(error, OperationType.LIST, path));
  }, []);

  // Firestore Sync - Competitions
  useEffect(() => {
    const path = 'competitions';
    const cached = localStorage.getItem('cache_competitions');
    if (cached) {
      try { setCompetitions(JSON.parse(cached)); } catch(e) {}
    }
    const q = query(collection(db, path), orderBy('name', 'asc'), limit(20));
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Competition));
      setCompetitions(data);
      setSyncStatus(prev => ({ ...prev, competitions: true }));
      localStorage.setItem('cache_competitions', JSON.stringify(data));
    }, (error) => handleError(error, OperationType.LIST, path));
  }, []);

  // Firestore Sync - Games
  useEffect(() => {
    const path = 'games';
    const cached = localStorage.getItem('cache_games');
    if (cached) {
      try { setGames(JSON.parse(cached)); } catch(e) {}
    }
    const q = query(
      collection(db, path), 
      orderBy('date', 'desc'),
      limit(50)
    );
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Game));
      setGames(data);
      setSyncStatus(prev => ({ ...prev, games: true }));
      localStorage.setItem('cache_games', JSON.stringify(data));
    }, (error) => handleError(error, OperationType.LIST, path));
  }, []);

  // Firestore Sync - Teams
  useEffect(() => {
    const path = 'teams';
    const cached = localStorage.getItem('cache_teams');
    if (cached) {
      try { setTeams(JSON.parse(cached)); } catch(e) {}
    }
    const q = query(collection(db, path), orderBy('name', 'asc'), limit(80));
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
      setTeams(data);
      setSyncStatus(prev => ({ ...prev, teams: true }));
      localStorage.setItem('cache_teams', JSON.stringify(data));
    }, (error) => handleError(error, OperationType.LIST, path));
  }, []);

  // Firestore Sync - Players
  useEffect(() => {
    const path = 'players';
    const cached = localStorage.getItem('cache_players');
    if (cached) {
      try { setPlayers(JSON.parse(cached)); } catch(e) {}
    }
    const q = query(collection(db, path), limit(100));
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Player));
      setPlayers(data);
      setSyncStatus(prev => ({ ...prev, players: true }));
      localStorage.setItem('cache_players', JSON.stringify(data));
    }, (error) => handleError(error, OperationType.LIST, path));
  }, []);

  // Firestore Sync - Venues
  useEffect(() => {
    const path = 'venues';
    const cached = localStorage.getItem('cache_venues');
    if (cached) {
      try { setVenues(JSON.parse(cached)); } catch(e) {}
    }
    const q = query(collection(db, path), orderBy('name', 'asc'), limit(15));
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Venue));
      setVenues(data);
      localStorage.setItem('cache_venues', JSON.stringify(data));
    }, (error) => handleError(error, OperationType.LIST, path));
  }, []);

  // Firestore Sync - Transfers
  useEffect(() => {
    const path = 'transfers';
    const cached = localStorage.getItem('cache_transfers');
    if (cached) {
      try { setTransfers(JSON.parse(cached)); } catch(e) {}
    }
    const q = query(
      collection(db, path), 
      orderBy('date', 'desc'),
      limit(10)
    );
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transfer));
      setTransfers(data);
      localStorage.setItem('cache_transfers', JSON.stringify(data));
    }, (error) => handleError(error, OperationType.LIST, path));
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
    }, (error) => handleError(error, OperationType.LIST, path));
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
          const team = teams.find(teamItem => teamItem.id === event.teamId);
          const player = players.find(p => p.id === event.playerId);
          const opponent = teams.find(oppItem => oppItem.id === (game.homeTeamId === event.teamId ? game.awayTeamId : game.homeTeamId));
          
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
    if (selectedLeagueId) g = g.filter(game => game.leagueId === selectedLeagueId || game.leagueId2 === selectedLeagueId);
    if (showOnlyLive) g = g.filter(game => game.status === 'live');
    return g;
  }, [games, selectedLeagueId, showOnlyLive]);

  const liveGames = useMemo(() => games.filter(g => g.status === 'live'), [games]);

  return (
    <div className="min-h-screen bg-[#F8F9FE] dark:bg-gray-950 text-[#1A1A1A] dark:text-white font-sans selection:bg-blue-100 pb-24">
      <AnimatePresence>
        {isLoading && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-white dark:bg-gray-950 flex flex-col items-center justify-center gap-8"
          >
            <motion.div 
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ 
                repeat: Infinity, 
                duration: 2,
                ease: "easeInOut"
              }}
              className="w-24 h-24 bg-blue-600 rounded-[32px] flex items-center justify-center shadow-2xl shadow-blue-100"
            >
              <TrophyIcon className="text-white w-12 h-12" />
            </motion.div>
            <div className="space-y-2 text-center">
              <h2 className="text-2xl font-black text-blue-900 dark:text-white tracking-tight">LiveScore<span className="text-blue-500">Pro</span></h2>
              <div className="flex gap-1 justify-center">
                <motion.div 
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1, delay: 0 }}
                  className="w-1.5 h-1.5 bg-blue-600 rounded-full" 
                />
                <motion.div 
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                  className="w-1.5 h-1.5 bg-blue-600 rounded-full" 
                />
                <motion.div 
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                  className="w-1.5 h-1.5 bg-blue-600 rounded-full" 
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
        t={t}
      />

      {(hasDismissedQuota || isOffline) && (
        <div className="bg-orange-500 text-white px-4 py-1.5 text-center text-[10px] font-black uppercase tracking-widest animate-pulse sticky top-0 z-50">
          {isOffline ? 'OFFLINE • CHECK CONNECTION' : 'STALE DATA • OFFLINE MODE'}
        </div>
      )}

      {quotaExceeded && (
        <div className="fixed inset-0 z-[200] bg-white/80 dark:bg-gray-950/80 backdrop-blur-md flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-[40px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] p-10 border border-gray-100 dark:border-gray-800 flex flex-col items-center gap-6">
            <div className="w-20 h-20 bg-orange-50 dark:bg-orange-500/10 rounded-[32px] flex items-center justify-center text-4xl shadow-inner">
              ⏳
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Connectivity Notice</h2>
              <p className="text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                We're having trouble connecting to the live database (it may be at capacity or your connection is unstable). You can continue using the app with cached data for now.
              </p>
            </div>
            <div className="w-full h-px bg-gray-50 dark:bg-gray-800" />
            <div className="space-y-4 w-full">
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => window.location.reload()}
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-100"
                >
                  Reload Page
                </button>
                <button 
                  onClick={() => {
                    setQuotaExceeded(false);
                    setHasDismissedQuota(true);
                  }}
                  className="w-full py-4 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-2xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                >
                  Continue with cached data
                </button>
              </div>
            </div>
          </div>
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

      <main className="max-w-[1092px] mx-auto px-4 pt-6">
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
                  {t('all_matches')}
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
                      {t('live_match')}
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
                      {showOnlyLive ? t('show_all') : t('view_all')}
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
                       {t('my_favorites')}
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
                <h2 className="text-lg font-bold mb-4">{selectedLeagueId ? (leagues.find(l => l.id === selectedLeagueId)?.name) : t('recent_upcoming')}</h2>
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
                    <div className="p-12 text-center bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 text-gray-400">
                      <CalendarIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p>{t('no_matches')}</p>
                    </div>
                  )}
                </div>
              </section>
            </motion.div>
          )}

          {view === 'leagues' && (
             <motion.div
               key="leagues-tab-container"
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="space-y-6"
             >
               {/* Competitions Quick Filter */}
               <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                  {competitions.map(comp => (
                    <button 
                      key={comp.id}
                      onClick={() => setSelectedLeagueId(comp.id)}
                      className={cn(
                        "px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border flex items-center gap-2",
                        selectedLeagueId === comp.id ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100" : "bg-white text-gray-400 border-gray-100 hover:border-gray-200"
                      )}
                    >
                      {comp.logo && <img src={comp.logo} alt="" className="w-3 h-3 object-contain" />}
                      {comp.name}
                    </button>
                  ))}
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {leagues
                   .filter(l => l.competitionId === selectedLeagueId)
                   .map((league, index) => (
                   <div 
                     key={league.id} 
                     onClick={() => {
                        // We use selectedLeagueId for competition filtering in the list, 
                        // but when clicking we need to set the ACTUAL league ID for details
                        // I'll create a new state specifically for selectedCompetitionId to avoid confusion
                        // but for now I'll use a local logic
                        const isCompetitionSelected = competitions.some(c => c.id === selectedLeagueId);
                        if (isCompetitionSelected) {
                          // If current "selectedLeagueId" is actually a competition, we don't clear it yet
                          // but we need to navigate. I should probably have used a separate state.
                        }
                       setSelectedLeagueId(league.id);
                       navigateTo('league-details');
                     }}
                      className={cn(
                        "p-4 rounded-3xl border transition-all cursor-pointer flex items-center gap-4 hover:shadow-md bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800"
                      )}
                   >
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center overflow-hidden bg-blue-50 dark:bg-blue-500/10">
                        {league.logo ? <img src={league.logo} alt="" className="w-full h-full object-cover" /> : <TrophyIcon className="text-blue-600" />}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">{league.name}</h3>
                        <div className="flex items-center gap-2">
                           <p className="text-xs text-gray-500 dark:text-gray-400">{league.country || 'International'}</p>
                           {league.competitionId && (
                             <>
                                <span className="w-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
                                <span className="text-[9px] font-black uppercase text-blue-500 tracking-wider">
                                  {competitions.find(c => c.id === league.competitionId)?.name}
                                </span>
                             </>
                           )}
                        </div>
                      </div>
                      <ChevronRightIcon className="ml-auto text-gray-300 dark:text-gray-600" />
                   </div>
                 ))}
               </div>
             </motion.div>
          )}

          {view === 'league-details' && selectedLeagueId && (
            <LeagueDetails 
              league={leagues.find(l => l.id === selectedLeagueId)!}
              teams={teams}
              games={games}
              leagues={leagues}
              players={players}
              transfers={transfers}
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
              team={teams.find(teamItem => teamItem.id === selectedTeamId)!}
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
              isAdmin={isAdmin}
              onEditTeam={(teamId) => {
                setAdminDefaultTeamId(teamId);
                navigateTo('admin');
              }}
            />
          )}

          {view === 'player-details' && selectedPlayerId && (
            <PlayerDetails 
              player={players.find(p => p.id === selectedPlayerId)!}
              team={teams.find(teamItem => teamItem.id === players.find(p => p.id === selectedPlayerId)?.teamId)}
              onBack={() => navigateTo(previousView)}
              isAdmin={isAdmin}
              onEdit={(id) => {
                setAdminDefaultPlayerId(id);
                navigateTo('admin');
              }}
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
                  {t('transfer_market')}
                </h2>
                <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm w-full sm:w-auto">
                  <button 
                    onClick={() => setTransferFilter('worldwide')}
                    className={cn(
                      "flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black transition-all",
                      transferFilter === 'worldwide' ? "bg-gray-900 text-white shadow-lg" : "text-gray-400 hover:text-gray-600"
                    )}
                  >
                    {t('worldwide')}
                  </button>
                  <button 
                    onClick={() => setTransferFilter('top')}
                    className={cn(
                      "flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black transition-all",
                      transferFilter === 'top' ? "bg-gray-900 text-white shadow-lg" : "text-gray-400 hover:text-gray-600"
                    )}
                  >
                    {t('top_leagues')}
                  </button>
                  <button 
                    onClick={() => setTransferFilter('domestic')}
                    className={cn(
                      "flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black transition-all",
                      transferFilter === 'domestic' ? "bg-gray-900 text-white shadow-lg" : "text-gray-400 hover:text-gray-600"
                    )}
                  >
                    {t('domestic')}
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {(() => {
                  const filtered = transfers.filter(transferItem => {
                    if (transferFilter === 'worldwide') return true;
                    const fromTeam = teams.find(teamItem => teamItem.id === transferItem.fromTeamId);
                    const toTeam = teams.find(teamItem => teamItem.id === transferItem.toTeamId);
                    const fromLeague = leagues.find(leagueItem => leagueItem.id === fromTeam?.leagueId);
                    const toLeague = leagues.find(leagueItem => leagueItem.id === toTeam?.leagueId);

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
                      <div className="p-12 text-center bg-white dark:bg-gray-900 rounded-[40px] border border-gray-100 dark:border-gray-800 text-gray-400">
                        <TransferIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p className="font-bold">{t('no_transfers')}</p>
                      </div>
                    );
                  }

                  return filtered.map((transfer, idx) => {
                    const player = players.find(p => p.id === transfer.playerId);
                    const fromTeam = teams.find(team => team.id === transfer.fromTeamId);
                    const toTeam = teams.find(team => team.id === transfer.toTeamId);
                    
                    return (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        key={transfer.id} 
                        className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="flex flex-col sm:flex-row items-center gap-6">
                           {/* Player info */}
                          <div className="flex items-center gap-4 w-full sm:w-1/3">
                            <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center overflow-hidden border border-gray-100 dark:border-gray-700">
                              {player?.imageUrl ? <img src={player.imageUrl} alt="" className="w-full h-full object-cover" /> : <UsersIcon className="text-gray-300" />}
                            </div>
                            <div>
                               <p className="font-black text-gray-900 dark:text-white">{player?.name || t('unknown_player')}</p>
                               <span className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider">
                                 {player?.position || 'N/A'} • {new Date(transfer.date).toLocaleDateString()}
                               </span>
                            </div>
                          </div>

                          {/* Transfer path */}
                          <div className="flex items-center justify-center gap-4 flex-1">
                            <div className="flex flex-col items-center gap-1 group cursor-pointer" onClick={() => fromTeam && setSelectedTeamId(fromTeam.id) && navigateTo('team-details')}>
                              <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center border border-gray-100 dark:border-gray-700 transition-colors">
                                {fromTeam?.logo ? <img src={fromTeam.logo} alt="" className="w-6 h-6 object-contain" /> : <ShieldIcon className="text-gray-300 dark:text-gray-600" />}
                              </div>
                              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 truncate max-w-[60px] transition-colors">{fromTeam?.name}</span>
                            </div>

                            <div className="flex flex-col items-center gap-1">
                               <div className="flex items-center gap-1">
                                  <div className="w-2 h-0.5 bg-gray-200 dark:bg-gray-700 rounded-full transition-colors" />
                                  <TransferIcon size={16} className="text-blue-600 dark:text-blue-400" />
                                  <div className="w-2 h-0.5 bg-gray-200 dark:bg-gray-700 rounded-full transition-colors" />
                               </div>
                               <span className={cn(
                                 "text-[10px] font-black uppercase px-2 py-0.5 rounded-full transition-all",
                                 transfer.type === 'loan' ? "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400" : "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
                               )}>
                                 {transfer.type}
                               </span>
                            </div>

                            <div className="flex flex-col items-center gap-1 group cursor-pointer" onClick={() => toTeam && setSelectedTeamId(toTeam.id) && navigateTo('team-details')}>
                              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center border border-blue-100 dark:border-blue-900/50">
                                {toTeam?.logo ? <img src={toTeam.logo} alt="" className="w-6 h-6 object-contain" /> : <ShieldIcon className="text-blue-600" />}
                              </div>
                              <span className="text-[10px] font-bold text-gray-900 dark:text-white truncate max-w-[60px]">{toTeam?.name}</span>
                            </div>
                          </div>

                          {/* Fee */}
                          <div className="w-full sm:w-auto text-center sm:text-right">
                             <p className="text-lg font-black text-blue-600">{transfer.fee || 'N/A'}</p>
                             <p className="text-[10px] font-bold uppercase text-gray-400">{t('transfer_fee')}</p>
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
              competitions={competitions}
              teams={teams}
              games={games}
              players={players}
              venues={venues}
              transfers={transfers}
              administrators={administrators}
              user={user}
              onLogin={handleLogin}
              defaultLeagueId={adminDefaultLeagueId || selectedLeagueId || undefined}
              defaultTeamId={adminDefaultTeamId || undefined}
              defaultPlayerId={adminDefaultPlayerId || undefined}
              quotaExceeded={hasDismissedQuota}
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
                  <h2 className="text-2xl font-black">{t('preferences')}</h2>
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest leading-none">{t('app_config')}</p>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-[40px] p-8 border border-gray-100 dark:border-gray-800 shadow-sm space-y-6">
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">{t('pref_notifications')}</h3>
                  
                  <div className="flex justify-between items-center group">
                    <div>
                      <p className="font-black text-gray-900 dark:text-white">{t('pref_notifications')}</p>
                      <p className="text-xs text-gray-500 font-medium">{t('pref_notifications_desc')}</p>
                    </div>
                    <button 
                      onClick={() => setPrefNotifications(!prefNotifications)}
                      className={cn(
                        "w-14 h-8 rounded-full transition-all relative",
                        prefNotifications ? "bg-blue-600 shadow-lg shadow-blue-100" : "bg-gray-100 dark:bg-gray-800"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-sm",
                        prefNotifications ? "left-7" : "left-1"
                      )} />
                    </button>
                  </div>

                  <div className="flex justify-between items-center group pt-4 border-t border-gray-50 dark:border-gray-800">
                    <div>
                      <p className="font-black text-gray-900 dark:text-white">{t('pref_banners')}</p>
                      <p className="text-xs text-gray-500 font-medium">{t('pref_banners_desc')}</p>
                    </div>
                    <button 
                      onClick={() => setPrefMobileBanners(!prefMobileBanners)}
                      className={cn(
                        "w-14 h-8 rounded-full transition-all relative",
                        prefMobileBanners ? "bg-blue-600 shadow-lg shadow-blue-100" : "bg-gray-100 dark:bg-gray-800"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-sm",
                        prefMobileBanners ? "left-7" : "left-1"
                      )} />
                    </button>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
                  <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">{t('settings')}</h3>
                  
                  <div className="space-y-6">
                    <div className="flex justify-between items-center group">
                      <div>
                        <p className="font-black text-gray-900 dark:text-white">{t('pref_time')}</p>
                        <p className="text-xs text-gray-500 font-medium">{t('pref_time_desc')}</p>
                      </div>
                      <div className="flex bg-gray-50 dark:bg-gray-800 p-1 rounded-2xl border border-gray-100 dark:border-gray-700">
                        <button 
                          onClick={() => setPrefTimeFormat('12h')}
                          className={cn(
                            "px-4 py-2 rounded-xl text-[10px] font-black transition-all",
                            prefTimeFormat === '12h' ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm" : "text-gray-400 hover:text-gray-600"
                          )}
                        >
                          AM/PM
                        </button>
                        <button 
                          onClick={() => setPrefTimeFormat('24h')}
                          className={cn(
                            "px-4 py-2 rounded-xl text-[10px] font-black transition-all",
                            prefTimeFormat === '24h' ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm" : "text-gray-400 hover:text-gray-600"
                          )}
                        >
                          24H
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-gray-50 dark:border-gray-800 mt-4">
                      <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">{t('pref_appearance')}</p>
                      <div className="grid gap-3">
                        {(['system', 'light', 'dark'] as const).map(t_key => (
                          <button 
                            key={t_key}
                            onClick={() => setPrefTheme(t_key)}
                            className={cn(
                              "w-full p-4 rounded-2xl flex items-center justify-between transition-all border",
                              prefTheme === t_key 
                                ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100" 
                                : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-900 dark:text-white hover:border-gray-200 dark:hover:border-gray-600"
                            )}
                          >
                            <span className="font-black tracking-widest text-xs">
                              {t(`pref_${t_key}`)}
                            </span>
                            <div className={cn(
                              "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                              prefTheme === t_key ? "border-white" : "border-gray-200 dark:border-gray-600"
                            )}>
                              {prefTheme === t_key && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-gray-50 dark:border-gray-800 mt-4">
                      <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">{t('pref_language')}</p>
                      <div className="grid gap-3">
                        {(['English', 'Kurdish'] as const).map(lang => (
                          <button 
                            key={lang}
                            onClick={() => setPrefLanguage(lang)}
                            className={cn(
                              "w-full p-4 rounded-2xl flex items-center justify-between transition-all border",
                              prefLanguage === lang 
                                ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100" 
                                : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-900 dark:text-white hover:border-gray-200 dark:hover:border-gray-600"
                            )}
                          >
                            <span className="font-black tracking-widest text-xs">{t(lang === 'English' ? 'tap_lang' : 'tap_lang_ku')}</span>
                            <div className={cn(
                              "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                              prefLanguage === lang ? "border-white" : "border-gray-200 dark:border-gray-600"
                            )}>
                              {prefLanguage === lang && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-[40px] p-8 w-full max-w-sm shadow-2xl border border-white/10"
            >
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <LockIcon className="text-blue-600 w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-center mb-2 dark:text-white">Admin Panel</h3>
              <p className="text-gray-500 dark:text-gray-400 text-center mb-8">Enter the master password to unlock administrative features.</p>
              
              <input 
                type="password" 
                placeholder="Enter Password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border-none focus:ring-2 focus:ring-blue-600 mb-4 transition-all dark:text-white"
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
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-t border-gray-100 dark:border-gray-800 px-6 py-4 z-40">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <NavButton active={view === 'matches'} onClick={() => { navigateTo('matches'); setSelectedLeagueId(null); setSelectedPlayerId(null); setSelectedTeamId(null); }} icon={<ClockIcon />} label={prefLanguage === 'English' ? 'Home' : 'سەرەکی'} />
          <NavButton active={view === 'leagues'} onClick={() => navigateTo('leagues')} icon={<ShieldIcon />} label={t('leagues')} />
          <NavButton active={view === 'transfers'} onClick={() => navigateTo('transfers')} icon={<TransferIcon />} label={t('transfers')} />
          <NavButton active={view === 'settings'} onClick={() => navigateTo('settings')} icon={<SettingsIcon />} label={t('settings')} />
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
