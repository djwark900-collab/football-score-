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
  Crown as CrownIcon,
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
  X as XIcon,
  Sparkles as SparklesIcon,
  Globe as GlobeIcon,
  Zap as ZapIcon,
  ArrowRight as ArrowRightIcon,
  RefreshCw as RefreshCwIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  setDoc,
  doc, 
  query, 
  where,
  getDocFromServer,
  collectionGroup,
  limit,
  orderBy
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType, testConnection } from './firebase';
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
import { FantasyManager } from './components/FantasyManager';
import { SignInModal } from './components/SignInModal';
import { Leaderboard } from './components/Leaderboard';
import { FootballLoading } from './components/Loading';
import { SearchPage } from './components/SearchPage';

type View = 'matches' | 'leagues' | 'standings' | 'admin' | 'settings' | 'game-details' | 'league-details' | 'team-details' | 'player-details' | 'transfers' | 'fantasy' | 'leaderboard' | 'search';

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
  const [showSignInModal, setShowSignInModal] = useState(false);
  
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
  const [leagueSearchQuery, setLeagueSearchQuery] = useState('');
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
  const [prefPlaySounds, setPrefPlaySounds] = useState(() => {
    return localStorage.getItem('pref_play_sounds') !== 'false'; // Default to true
  });
  const [prefGoalAlerts, setPrefGoalAlerts] = useState(() => {
    return localStorage.getItem('pref_goal_alerts') !== 'false'; // Default to true
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
        fantasy: 'Fantasy',
        transfers: 'Transfers',
        settings: 'Settings',
        standings: 'Standings',
        search_placeholder: 'Search leagues, teams, players...',
        recent_searches: 'Recent Searches',
        admin: 'Admin',
        admin_panel: 'Admin Panel',
        pref_notifications: 'Allow Notifications',
        pref_notifications_desc: 'Get real-time alerts for match events',
        pref_banners: 'Banners mobile',
        pref_banners_desc: 'Show match updates as floating top banners',
        pref_play_sounds: 'Play Sounds',
        pref_play_sounds_desc: 'Sound effects for match events',
        pref_time: 'Time Format',
        pref_time_desc: 'Choose how match times are displayed',
        pref_appearance: 'Appearance',
        pref_language: 'Language',
        pref_goal_alerts: 'Goal Alerts',
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
        fantasy: 'فانتازیا',
        transfers: 'گواستنەوەکان',
        settings: 'ڕێکخستن',
        standings: 'ڕیزبەندی',
        search_placeholder: 'بگەڕێ بۆ خول، تیم، یاریزان...',
        recent_searches: 'گەڕانەکانى ئەمدواییە',
        admin: 'ئەدمین',
        admin_panel: 'پانێڵی ئەدمین',
        favorite: 'دڵخواز',
        all: 'هەموو',
        live: 'پەخش',
        finished: 'کۆتایی',
        lineups: 'پێکهاتە',
        stats: 'سەرژمێری',
        h2h: 'ڕووبەڕوو',
        venue: 'یاریگا',
        referee: 'ناوبژیوان',
        search: 'گەڕان',
        language: 'زمان',
        theme: 'شێواز',
        light: 'رووناک',
        dark: 'تاریک',
        system: 'سیستەم',
        notifications: 'ئاگادارکردنەوەکان',
        logout: 'چوونەدەرەوە',
        login: 'چوونەژوورەوە',
        predict: 'پێشبینی',
        leaderboard: 'پلەبەندی',
        transfer_market: 'بازاڕی گواستنەوە',
        top_scorers: 'گۆڵکاران',
        top_assists: 'ئەسیستەکان',
        red_cards: 'کارتی سوور',
        yellow_cards: 'کارتی زەرد',
        goals_conceded: 'گۆڵەکان',
        clean_sheets: 'تۆڕی پاک',
        follow: 'فۆڵۆ',
        unfollow: 'لادان',
        players: 'یاریزانان',
        overview: 'پێشەکی',
        squad: 'پێکهاتە',
        fixtures: 'یارییەکان',
        results: 'ئەنجامەکان',
        form: 'ئاست',
        position: 'پلە',
        points: 'خاڵەکان',
        played: 'ئەنجامدراو',
        won: 'بردنەوە',
        drawn: 'یەکسان',
        lost: 'دۆڕان',
        goals_for: 'گۆڵ',
        goals_against: 'بەرامبەر',
        goal_difference: 'جیاوازی گۆڵ',
        market_value: 'بەهای بازاڕ',
        contracts: 'گرێبەستەکان',
        upcoming_matches: 'یارییەکانی داهاتوو',
        latest_results: 'دوایین ئەنجامەکان',
        all_matches: 'هەموو یارییەکان',
        my_favorites: 'دڵخوازەکانم',
        no_matches: 'یاری نییە',
        worldwide: 'جیهانی',
        top_leagues: 'خولە بەهێزەکان',
        domestic: 'ناوخۆیی',
        transfer_fee: 'نرخی گواستنەوە',
        pref_notifications: 'ئاگادارکردنەوەکان',
        pref_notifications_desc: 'ئاگاداری ڕاستەوخۆ بۆ ڕووداوەکانی یاری',
        pref_banners: 'بانەری مۆبایل',
        pref_banners_desc: 'پیشاندانی نوێکارییەکان وەک بانەری سەرەوە',
        pref_play_sounds: 'دەنگی ڕووداوەکان',
        pref_play_sounds_desc: 'دەنگ بۆ ڕووداوەکانی یاری',
        pref_time: 'کاتی یاری',
        pref_time_desc: 'شێوازی پیشاندانی کاتی یارییەکان هەڵبژێرە',
        pref_appearance: 'شێوە',
        pref_goal_alerts: 'ئاگاداری گۆڵ',
        pref_light: 'دۆخی ڕووناک',
        pref_dark: 'دۆخی تاریک',
        pref_system: 'سیستەمی بنەڕەتی',
        pref_language: 'زمان',
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
    localStorage.setItem('pref_play_sounds', prefPlaySounds.toString());
  }, [prefPlaySounds]);

  useEffect(() => {
    localStorage.setItem('pref_goal_alerts', prefGoalAlerts.toString());
  }, [prefGoalAlerts]);

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
    }, (error) => handleError(error, OperationType.LIST, path));
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
      handleError(error, OperationType.WRITE, path);
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
    }, (error) => handleError(error, OperationType.LIST, path));
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
      handleError(error, OperationType.WRITE, path);
    }
  };

  const handleError = (error: any, operation: OperationType, path: string) => {
    const errorMsg = error?.message || String(error);
    const isQuota = errorMsg.includes('Quota limit exceeded') || errorMsg.includes('Quota exceeded');
    const isConnectivityIssue = errorMsg.includes('Could not reach Cloud Firestore backend') || 
                                errorMsg.includes('client is offline') || 
                                errorMsg.includes('unavailable') ||
                                errorMsg.includes('network');

    if (isConnectivityIssue) {
      setIsOffline(true);
    }

    if (isQuota || (isConnectivityIssue && !navigator.onLine)) {
      if (!hasDismissedQuota) {
        setQuotaExceeded(true);
      }
    }
    
    try {
      handleFirestoreError(error, operation, path);
    } catch (e) {
      // Catch the error thrown by handleFirestoreError to prevent it from bubbling up 
      // and causing "Uncaught Error in snapshot listener"
      console.warn(`Firestore ${operation} error at ${path}:`, errorMsg);
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

  // News Sync
  useEffect(() => {
    setSyncStatus(prev => ({ ...prev, news: true }));
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
              if (prefPlaySounds && prefGoalAlerts) playGoalSound();
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
  }, [games, teams, players, prefNotifications, prefMobileBanners, prefPlaySounds]);

  const playGoalSound = () => {
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3'); // Goal cheer sfx
      audio.volume = 0.5;
      audio.play().catch(() => console.log('Audio playback blocked by browser'));
    } catch (e) {}
  };

  const handleLogin = () => {
    setShowSignInModal(true);
  };

  const onSignInSuccess = () => {
    setShowSignInModal(false);
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

  const tryReconnect = async () => {
    setIsOffline(false);
    setQuotaExceeded(false);
    try {
      await testConnection();
      // If we're here, testConnection didn't throw (or we can check more if needed)
      // Realistically testConnection logs success, but let's re-verify with a small delay
      setTimeout(() => {
        if (!navigator.onLine) setIsOffline(true);
      }, 1000);
    } catch (e) {
      setIsOffline(true);
    }
  };

  return (
    <div className="min-h-screen bg-mesh text-[#1A1A1A] dark:text-gray-100 font-sans selection:bg-blue-100 pb-24">
      <AnimatePresence>
        {isLoading && <FootballLoading />}
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
        <div className="bg-orange-500 text-white px-4 py-1.5 text-center text-[10px] font-black uppercase tracking-widest animate-pulse sticky top-0 z-50 flex items-center justify-center gap-4">
          <span>{isOffline ? 'OFFLINE • CHECK CONNECTION' : 'STALE DATA • OFFLINE MODE'}</span>
          {isOffline && (
            <button 
              onClick={tryReconnect}
              className="bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded border border-white/40 transition-all active:scale-95"
            >
              RETRY
            </button>
          )}
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
            initial={{ y: -120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -120, opacity: 0 }}
            onClick={() => {
              if (activeBanner.gameId) {
                setSelectedGameId(activeBanner.gameId);
                navigateTo('game-details');
              }
              setActiveBanner(null);
            }}
            className="fixed top-6 left-4 right-4 z-[100] cursor-pointer"
          >
            <div className="bg-white/80 dark:bg-gray-900/80 text-gray-900 dark:text-white p-4 rounded-[40px] shadow-3d-xl flex items-center gap-4 border border-white/40 dark:border-white/5 backdrop-blur-3xl ring-1 ring-black/5">
               <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[28px] flex items-center justify-center text-3xl shadow-3d-md">
                 {activeBanner.type === 'goal' ? '⚽️' : activeBanner.type === 'penalty' ? '🥅' : activeBanner.type === 'red' ? '🟥' : '🟨'}
               </div>
               <div className="flex-1 overflow-hidden">
                 <div className="flex items-center gap-2 mb-0.5">
                   <p className="font-black text-sm tracking-tight leading-none">{activeBanner.title}</p>
                   <span className="text-[10px] text-blue-500 font-bold uppercase tracking-widest animate-pulse">Live</span>
                 </div>
                 <p className="text-xs font-bold text-gray-500 dark:text-gray-400 truncate tracking-tight">{activeBanner.message}</p>
               </div>
               <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveBanner(null);
                }}
                className="w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-white/5 rounded-full hover:bg-gray-200 transition-all"
               >
                 <XIcon size={18} className="text-gray-400" />
                </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className={cn(
        "mx-auto px-4 sm:px-6 lg:px-8 pt-6 transition-all duration-700 ease-in-out",
        (view === 'leagues') ? "max-w-[1536px]" : "max-w-[1140px]"
      )}>
        <AnimatePresence mode="wait">
          {view === 'matches' && (
            <motion.div
              key="matches"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-10"
            >
            {/* Match Listings */}
            <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar items-center">
                <button 
                  onClick={() => setSelectedLeagueId(null)}
                  className={cn(
                    "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap btn-3d border-t-2 border-l-2",
                    !selectedLeagueId 
                      ? "bg-blue-600 text-white shadow-3d-md border-white/20" 
                      : "bg-white dark:bg-gray-900 text-gray-500 border-gray-100 dark:border-gray-800 shadow-3d-sm hover:shadow-3d-md"
                  )}
                >
                  {t('all_matches')}
                </button>
                {leagues.map((league, index) => (
                  <button 
                    key={league.id}
                    onClick={() => setSelectedLeagueId(league.id)}
                    className={cn(
                      "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 whitespace-nowrap btn-3d border-t-2 border-l-2",
                      selectedLeagueId === league.id 
                        ? (index === 4 ? "bg-yellow-400 text-black shadow-3d-md border-yellow-300/50" : "bg-blue-600 text-white shadow-3d-md border-white/20")
                        : (index === 4 ? "bg-yellow-50 text-yellow-700 border-yellow-200 shadow-3d-sm" : "bg-white dark:bg-gray-900 text-gray-500 border-gray-100 dark:border-gray-800 shadow-3d-sm hover:shadow-3d-md")
                    )}
                  >
                    {league.logo && <img src={league.logo} alt="" className="w-5 h-5 rounded-lg shadow-3d-sm p-0.5 bg-white" />}
                    {league.name}
                  </button>
                ))}
            </div>

            {/* Match Feed */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8 space-y-10">
                {/* Live Match Hero (if any) */}
                {liveGames.length > 0 && !selectedLeagueId && (
                  <section className="space-y-4">
                    <div className="flex justify-between items-center px-2">
                      <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3 italic">
                         LIVE <span className="text-blue-500">FEED</span>
                      </h2>
                    </div>
                    <div className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory scrollbar-none -mx-2 px-2">
                      {liveGames.map(game => (
                        <div key={game.id} className="snap-center min-w-[320px] sm:min-w-[400px]">
                          <GameCard 
                            game={game} 
                            teams={teams || []} 
                            leagues={leagues || []}
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
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                <section>
                  <div className="flex justify-between items-center mb-6 px-2">
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight italic uppercase">{t('matches')}</h2>
                    <button 
                      onClick={() => {
                        setShowOnlyLive(false);
                        setSelectedLeagueId(null);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="text-xs font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest transition-colors flex items-center gap-2"
                    >
                      Refresh Feed
                      <RefreshCwIcon size={14} />
                    </button>
                  </div>
                  <div className="grid gap-6">
                    {filteredGames.length > 0 ? (
                      filteredGames.map(game => (
                        <GameCard 
                          key={game.id} 
                          game={game} 
                          teams={teams || []}
                          leagues={leagues || []}
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
                          isLive={game.status === 'live'}
                        />
                      ))
                    ) : (
                      <div className="card-3d p-20 text-center text-gray-400 flex flex-col items-center justify-center gap-6">
                        <div className="w-24 h-24 bg-gray-50 dark:bg-gray-800 rounded-[32px] flex items-center justify-center shadow-inner border border-white/50 dark:border-white/5">
                          <CalendarIcon className="w-12 h-12 opacity-20" />
                        </div>
                        <div>
                          <p className="font-black text-2xl text-gray-900 dark:text-white uppercase tracking-tighter">{t('no_matches')}</p>
                          <p className="text-xs font-bold uppercase tracking-widest mt-2 opacity-50">Filter reset recommended</p>
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              </div>

              <div className="lg:col-span-4 space-y-8">
                 {/* Sidebar Content */}
                 {user && favorites.length > 0 && (
                  <section className="bg-white dark:bg-gray-900 rounded-[40px] p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-[0.2em] flex items-center gap-2">
                         <HeartIcon size={14} className="text-pink-500 fill-pink-500" />
                         {t('my_favorites')}
                      </h2>
                    </div>
                    <div className="space-y-4">
                      {games.filter(g => 
                        favorites.some(f => f.teamId === g.homeTeamId || f.teamId === g.awayTeamId)
                      ).slice(0, 5).map(game => (
                        <div 
                          key={game.id}
                          onClick={() => {
                            setSelectedGameId(game.id);
                            navigateTo('game-details');
                          }}
                          className="flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors border border-transparent hover:border-gray-100 dark:hover:border-gray-700"
                        >
                           <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-black text-gray-900 dark:text-white truncate">{teams.find(t => t.id === game.homeTeamId)?.shortName} v {teams.find(t => t.id === game.awayTeamId)?.shortName}</p>
                              <p className="text-[9px] font-bold text-gray-400 uppercase">{leagues.find(l => l.id === game.leagueId)?.name}</p>
                           </div>
                           <div className="text-[10px] font-black text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-lg">
                              {game.status === 'live' ? 'LIVE' : game.time}
                           </div>
                        </div>
                      ))}
                    </div>
                  </section>
                 )}

                 {/* Top Leagues Card */}
                 <section className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[40px] p-8 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                    <h3 className="text-xl font-black italic tracking-tighter mb-2">PRO LEAGUES</h3>
                    <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.2em] mb-6 border-b border-white/10 pb-4">Explore World Football</p>
                    <div className="space-y-4">
                       {leagues.slice(0, 3).map(league => (
                         <div 
                           key={league.id}
                           onClick={() => {
                             setSelectedLeagueId(league.id);
                             navigateTo('league-details');
                           }}
                           className="flex items-center gap-4 group cursor-pointer"
                         >
                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center p-2 group-hover:bg-white/20 transition-colors">
                               <img src={league.logo} alt="" className="w-full h-full object-contain" />
                            </div>
                            <span className="text-[13px] font-bold group-hover:translate-x-1 transition-transform">{league.name}</span>
                            <ArrowRightIcon size={14} className="ml-auto opacity-0 group-hover:opacity-100 transition-all" />
                         </div>
                       ))}
                    </div>
                 </section>
              </div>
            </div>
          </motion.div>
          )}

          {view === 'leagues' && (
            <motion.div
              key="leagues-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-10 pb-20"
            >
              {/* Compact Header for Leagues */}
              <div className="relative h-[280px] rounded-[48px] overflow-hidden bg-gray-900 shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent z-10" />
                <img 
                  src="https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=2000" 
                  className="absolute inset-0 w-full h-full object-cover opacity-40"
                  alt="Leagues Header"
                />
                
                <div className="absolute inset-0 z-20 flex flex-col justify-center px-12 sm:px-16">
                   <h1 className="text-5xl sm:text-7xl font-black text-white italic tracking-tighter leading-none uppercase mb-4">
                     YARIGA <span className="text-blue-500">SPORTS</span>
                   </h1>
                   <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10">
                        <GlobeIcon size={14} className="text-blue-400" />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">{leagues.length} Federations</span>
                      </div>
                      <div className="flex items-center gap-2 bg-emerald-500/10 backdrop-blur-md px-4 py-1.5 rounded-full border border-emerald-500/20">
                        <SparklesIcon size={14} className="text-emerald-400" />
                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Real-time Data</span>
                      </div>
                   </div>
                </div>
              </div>

              {/* Main List Layout Container */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Left Side: Competitions & Search */}
                <div className="lg:col-span-8 space-y-10">
                   {/* Search Bar */}
                   <div className="relative group">
                      <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                         <SearchIcon className="text-gray-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                      </div>
                      <input 
                        type="text"
                        placeholder="Search competitions, countries or leagues..."
                        value={leagueSearchQuery}
                        onChange={(e) => setLeagueSearchQuery(e.target.value)}
                        className="w-full h-16 bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/5 rounded-3xl pl-16 pr-8 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all shadow-sm dark:text-white"
                      />
                   </div>

                   {/* Featured / Top Leagues Horizontal Scroll */}
                   <section>
                      <h2 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <ZapIcon size={14} className="text-yellow-500" />
                        Featured Leagues
                      </h2>
                      <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-2 px-2">
                         {leagues.filter(l => l.competitionId === 'top' || ['1', '2', '3'].includes(l.id)).map(league => (
                            <div 
                              key={league.id}
                              onClick={() => {
                                setSelectedLeagueId(league.id);
                                navigateTo('league-details');
                              }}
                              className="group min-w-[160px] bg-white dark:bg-gray-900 p-5 rounded-[32px] border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1 transition-all cursor-pointer text-center"
                            >
                               <div className="w-14 h-14 mx-auto mb-4 p-3 bg-gray-50 dark:bg-black/20 rounded-2xl group-hover:scale-110 transition-transform flex items-center justify-center relative">
                                  <img src={league.logo} alt="" className="w-full h-full object-contain" />
                                  {['1', '2'].includes(league.id) && (
                                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900 shadow-lg">
                                      <SparklesIcon size={8} className="text-white" />
                                    </div>
                                  )}
                               </div>
                               <p className="text-xs font-black text-gray-900 dark:text-white truncate tracking-tight">{league.name}</p>
                               <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1 opacity-60">{league.country}</p>
                            </div>
                         ))}
                      </div>
                   </section>

                   {/* Grouped All Leagues List */}
                   <div className="space-y-6">
                      {competitions.map(comp => {
                        const filteredLeagues = leagues.filter(l => 
                          l.competitionId === comp.id && 
                          (!leagueSearchQuery || l.name.toLowerCase().includes(leagueSearchQuery.toLowerCase()))
                        );

                        if (filteredLeagues.length === 0) return null;

                        return (
                          <section key={comp.id} className="bg-white dark:bg-gray-900 rounded-[40px] border border-gray-100 dark:border-white/5 overflow-hidden shadow-sm">
                             <div className="bg-gray-50/80 dark:bg-white/5 px-8 py-5 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                   <div className="w-8 h-8 rounded-lg bg-white dark:bg-gray-800 flex items-center justify-center p-1.5 shadow-sm">
                                      <img src={comp.logo} alt="" className="w-full h-full object-contain" />
                                   </div>
                                   <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">{comp.name}</h3>
                                </div>
                                <span className="text-[10px] font-bold text-gray-400">{filteredLeagues.length} Leagues</span>
                             </div>
                             <div className="divide-y divide-gray-50 dark:divide-white/5">
                                {filteredLeagues.map(league => (
                                  <div 
                                    key={league.id}
                                    onClick={() => {
                                      setSelectedLeagueId(league.id);
                                      navigateTo('league-details');
                                    }}
                                    className="px-8 py-5 flex items-center gap-5 hover:bg-gray-50/50 dark:hover:bg-white/[0.02] cursor-pointer transition-colors group"
                                  >
                                     <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center p-2 group-hover:scale-110 transition-transform relative">
                                        <img src={league.logo} alt="" className="w-full h-full object-contain" />
                                        {league.competitionId === 'top' && (
                                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-600 rounded-full border border-white dark:border-gray-900 shadow-sm" />
                                        )}
                                     </div>
                                     <div className="flex-1 min-w-0">
                                        <p className="text-sm font-black text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">{league.name}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                           <span className="text-[10px] font-bold text-gray-400 leading-none uppercase tracking-widest">{league.country || 'International'}</span>
                                           <span className="w-1 h-1 bg-gray-200 dark:bg-gray-800 rounded-full" />
                                           <span className="text-[10px] font-black text-emerald-500 uppercase leading-none">{league.type}</span>
                                        </div>
                                     </div>
                                     <div className="p-2 rounded-full bg-gray-50 dark:bg-gray-800 text-gray-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                        <ArrowRightIcon size={14} className="group-hover:translate-x-0.5 transition-transform" />
                                     </div>
                                  </div>
                                ))}
                             </div>
                          </section>
                        );
                      })}
                   </div>
                </div>

                {/* Right Side: Quick Stats / Favorites Links */}
                <div className="lg:col-span-4 space-y-10">
                   {/* Yariga Sports Style Promo Card */}
                   <div className="bg-[#050505] rounded-[48px] p-8 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden group border border-white/5">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-150 transition-transform duration-1000" />
                      <div className="relative z-10">
                         <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-md border border-white/10">
                            <SparklesIcon size={24} className="text-blue-500" />
                         </div>
                         <h3 className="text-2xl font-black italic tracking-tighter mb-3 uppercase">
                           YARIGA <span className="text-blue-500">PREMIUM</span>
                         </h3>
                         <p className="text-white/50 text-xs font-bold leading-relaxed mb-8 uppercase tracking-widest">The Ultimate Kurdish Football Experience. v1.1.7 core active.</p>
                         <button className="w-full h-14 bg-blue-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95">
                           Unlock Premium Access
                         </button>
                      </div>
                   </div>

                   {/* Rankings Side Section */}
                   <section className="bg-white dark:bg-gray-900 rounded-[40px] border border-gray-100 dark:border-white/5 p-8 shadow-sm">
                      <h2 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                        <GlobeIcon size={14} className="text-blue-500" />
                        Popular Regions
                      </h2>
                      <div className="space-y-4">
                         {competitions.slice(0, 5).map(comp => (
                           <div key={comp.id} className="flex items-center justify-between group cursor-pointer">
                              <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center p-1.5 grayscale group-hover:grayscale-0 transition-all">
                                    <img src={comp.logo} alt="" className="w-full h-full object-contain" />
                                 </div>
                                 <span className="text-[11px] font-bold text-gray-500 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{comp.name}</span>
                              </div>
                              <span className="text-[9px] font-black text-blue-500 bg-blue-50 dark:bg-blue-500/10 px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">GO</span>
                           </div>
                         ))}
                      </div>
                   </section>
                </div>
              </div>
            </motion.div>
          )}

          
          {view === 'league-details' && selectedLeagueId && leagues.find(l => l.id === selectedLeagueId) && (
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

          {view === 'game-details' && selectedGameId && games.find(g => g.id === selectedGameId) && (
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
                players={players}
                onTeamClick={(id) => {
                  setSelectedTeamId(id);
                  navigateTo('team-details');
                }}
                onGameClick={(id) => {
                  setSelectedGameId(id);
                  navigateTo('game-details');
                }}
              />
            </motion.div>
          )}
          {view === 'team-details' && selectedTeamId && teams.find(teamItem => teamItem.id === selectedTeamId) && (
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
              onLeagueClick={(id) => {
                setSelectedLeagueId(id);
                navigateTo('league-details');
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

          {view === 'player-details' && selectedPlayerId && players.find(p => p.id === selectedPlayerId) && (
            <PlayerDetails 
              player={players.find(p => p.id === selectedPlayerId)!}
              team={selectedPlayerId ? teams.find(teamItem => teamItem.id === players.find(p => p.id === selectedPlayerId)?.teamId) : undefined}
              games={games}
              leagues={leagues}
              players={players}
              teams={teams}
              onBack={() => navigateTo(previousView)}
              isAdmin={isAdmin}
              onEdit={(id) => {
                setAdminDefaultPlayerId(id);
                navigateTo('admin');
              }}
              onPlayerClick={(id) => {
                setSelectedPlayerId(id);
                navigateTo('player-details');
              }}
              onTeamClick={(id) => {
                setSelectedTeamId(id);
                navigateTo('team-details');
              }}
              onGameClick={(id) => {
                setSelectedGameId(id);
                navigateTo('game-details');
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

          {view === 'search' && (
            <SearchPage 
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
              onBack={() => navigateTo('matches')}
              t={t}
            />
          )}

          {view === 'fantasy' && (
            <FantasyManager 
              user={user}
              players={players}
              teams={teams}
              onBack={() => navigateTo('matches')}
              onLogin={handleLogin}
              onPlayerClick={(id) => {
                setSelectedPlayerId(id);
                navigateTo('player-details');
              }}
            />
          )}

          {view === 'leaderboard' && (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Leaderboard />
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
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8 pb-32"
            >
              <div className="space-y-8 pb-32 max-w-[600px] mx-auto">
                <div className="text-center space-y-2 mb-12">
                   <h2 className="text-[34px] font-bold tracking-tight text-gray-900 dark:text-white">Settings</h2>
                   <p className="text-gray-500 font-medium">Manage your preferences and profile</p>
                </div>

                {/* Profile Section - iOS Style */}
                <div className="space-y-1 px-4">
                  <div className="bg-white dark:bg-gray-900 rounded-[14px] overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm">
                    {user ? (
                      <div className="p-4 flex items-center gap-4">
                        <div className="w-16 h-16 rounded-[20px] overflow-hidden bg-gray-100">
                          <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || 'U'}`} className="w-full h-full object-cover" alt="" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-[17px] font-semibold text-gray-900 dark:text-white leading-tight">{user.displayName || 'Set Display Name'}</h3>
                          <p className="text-[13px] text-gray-500">{user.email}</p>
                        </div>
                        <ChevronRightIcon className="text-gray-300 w-5 h-5" />
                      </div>
                    ) : (
                      <button onClick={handleLogin} className="w-full p-4 flex items-center gap-4 text-left hover:bg-gray-50 transition-colors">
                        <div className="w-16 h-16 rounded-[20px] bg-blue-600 flex items-center justify-center text-white">
                          <UsersIcon size={32} />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-[17px] font-semibold text-gray-900 dark:text-white">Sign In</h3>
                          <p className="text-[13px] text-gray-500">Access your profile and favorites</p>
                        </div>
                        <ChevronRightIcon className="text-gray-300 w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Main Settings - iOS Style */}
                <div className="space-y-8">
                  {/* Preferences Group */}
                  <div className="space-y-1 px-4">
                    <p className="text-[13px] text-gray-500 uppercase tracking-tight ml-4 mb-2">PREFERENCES</p>
                    <div className="bg-white dark:bg-gray-900 rounded-[14px] overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm divide-y divide-gray-50 dark:divide-gray-800">
                        <div className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center text-white">
                              <BellIcon size={16} />
                            </div>
                            <span className="text-[17px] dark:text-white">{t('pref_notifications')}</span>
                          </div>
                          <button 
                            onClick={() => setPrefNotifications(!prefNotifications)}
                            className={cn(
                              "w-12 h-7 rounded-full relative transition-all duration-200",
                              prefNotifications ? "bg-green-500" : "bg-gray-200 dark:bg-gray-700"
                            )}
                          >
                            <motion.div 
                              animate={{ x: prefNotifications ? 22 : 2 }}
                              className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md"
                            />
                          </button>
                        </div>

                        <div className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-lg bg-red-600 flex items-center justify-center text-white">
                              <ZapIcon size={16} />
                            </div>
                            <span className="text-[17px] dark:text-white">{t('pref_play_sounds')}</span>
                          </div>
                          <button 
                            onClick={() => setPrefPlaySounds(!prefPlaySounds)}
                            className={cn(
                              "w-12 h-7 rounded-full relative transition-all duration-200",
                              prefPlaySounds ? "bg-green-500" : "bg-gray-200 dark:bg-gray-700"
                            )}
                          >
                            <motion.div 
                              animate={{ x: prefPlaySounds ? 22 : 2 }}
                              className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md"
                            />
                          </button>
                        </div>

                        <div className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center text-white">
                              <TrophyIcon size={16} />
                            </div>
                            <span className="text-[17px] dark:text-white">{prefLanguage === 'English' ? 'Goal Alerts' : 'ئاگاداری گۆڵ'}</span>
                          </div>
                          <button 
                            onClick={() => setPrefGoalAlerts(!prefGoalAlerts)}
                            className={cn(
                              "w-12 h-7 rounded-full relative transition-all duration-200",
                              prefGoalAlerts ? "bg-green-500" : "bg-gray-200 dark:bg-gray-700"
                            )}
                          >
                            <motion.div 
                              animate={{ x: prefGoalAlerts ? 22 : 2 }}
                              className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md"
                            />
                          </button>
                        </div>

                       <div className="p-4 flex items-center justify-between">
                         <div className="flex items-center gap-3">
                           <div className="w-7 h-7 rounded-lg bg-pink-500 flex items-center justify-center text-white">
                             <HeartIcon size={16} />
                           </div>
                           <span className="text-[17px] dark:text-white">{t('my_favorites')}</span>
                         </div>
                         <button onClick={() => navigateTo('leagues')} className="flex items-center gap-1 text-gray-400">
                           <ChevronRightIcon size={18} />
                         </button>
                       </div>

                       <div className="p-4 flex items-center justify-between">
                         <div className="flex items-center gap-3">
                           <div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center text-white">
                             <GlobeIcon size={16} />
                           </div>
                           <span className="text-[17px] dark:text-white">{t('language')}</span>
                         </div>
                         <button onClick={() => setPrefLanguage(prefLanguage === 'English' ? 'Kurdish' : 'English')} className="flex items-center gap-1 text-gray-400">
                           <span className="text-[17px]">{prefLanguage}</span>
                           <ChevronRightIcon size={18} />
                         </button>
                       </div>
                    </div>
                  </div>

                  {/* Fantasy Group */}
                  <div className="space-y-1 px-4">
                    <p className="text-[13px] text-gray-500 uppercase tracking-tight ml-4 mb-2">FANTASY & GAMING</p>
                    <div className="bg-white dark:bg-gray-900 rounded-[14px] overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm divide-y divide-gray-50 dark:divide-gray-800">
                      <button onClick={() => navigateTo('fantasy')} className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                         <div className="flex items-center gap-3">
                           <div className="w-7 h-7 rounded-lg bg-yellow-500 flex items-center justify-center text-white">
                             <CrownIcon size={16} />
                           </div>
                           <span className="text-[17px] dark:text-white">Fantasy Management</span>
                         </div>
                         <ChevronRightIcon className="text-gray-300 w-5 h-5" />
                      </button>
                      <button onClick={() => navigateTo('leaderboard')} className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                         <div className="flex items-center gap-3">
                           <div className="w-7 h-7 rounded-lg bg-purple-500 flex items-center justify-center text-white">
                             <TrophyIcon size={16} />
                           </div>
                           <span className="text-[17px] dark:text-white">Hall of Fame</span>
                         </div>
                         <ChevronRightIcon className="text-gray-300 w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Appearance Group */}
                  <div className="space-y-1 px-4">
                    <p className="text-[13px] text-gray-500 uppercase tracking-tight ml-4 mb-2">APPEARANCE</p>
                    <div className="bg-white dark:bg-gray-900 rounded-[14px] overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm divide-y divide-gray-50 dark:divide-gray-800">
                       <div className="p-4 flex items-center justify-between">
                         <div className="flex items-center gap-3">
                           <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center text-white">
                             <ClockIcon size={16} />
                           </div>
                           <span className="text-[17px] dark:text-white">Time Format</span>
                         </div>
                         <div className="flex bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg">
                           {(['12h', '24h'] as const).map((format) => (
                             <button
                               key={format}
                               onClick={() => setPrefTimeFormat(format)}
                               className={cn(
                                 "px-3 py-1 rounded-md text-[13px] font-medium transition-all",
                                 prefTimeFormat === format ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white" : "text-gray-500"
                               )}
                             >
                               {format}
                             </button>
                           ))}
                         </div>
                       </div>

                       <div className="p-4 space-y-3">
                         <div className="flex items-center gap-3">
                           <div className="w-7 h-7 rounded-lg bg-gray-600 flex items-center justify-center text-white">
                             <LayoutIcon size={16} />
                           </div>
                           <span className="text-[17px] dark:text-white">Theme</span>
                         </div>
                         <div className="grid grid-cols-3 gap-2">
                           {(['light', 'dark', 'system'] as const).map((theme) => (
                             <button
                               key={theme}
                               onClick={() => setPrefTheme(theme)}
                               className={cn(
                                 "py-2 flex flex-col items-center gap-1 rounded-xl border transition-all capitalize text-[11px] font-medium",
                                 prefTheme === theme 
                                   ? "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400" 
                                   : "bg-gray-50 dark:bg-gray-800 border-transparent text-gray-400"
                               )}
                             >
                               {theme === 'light' ? <SparklesIcon size={14} /> : theme === 'dark' ? <LockIcon size={14} /> : <GlobeIcon size={14} />}
                               {theme}
                             </button>
                           ))}
                         </div>
                       </div>
                    </div>
                  </div>

                  {/* Information Group */}
                  <div className="space-y-1 px-4">
                    <p className="text-[13px] text-gray-500 uppercase tracking-tight ml-4 mb-2">ABOUT</p>
                    <div className="bg-white dark:bg-gray-900 rounded-[14px] overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm divide-y divide-gray-50 dark:divide-gray-800">
                       <div className="p-4 flex items-center justify-between">
                         <span className="text-[17px] dark:text-white">Version</span>
                         <span className="text-[17px] text-gray-400">v1.1.7</span>
                       </div>
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="px-4">
                      <button 
                        onClick={() => navigateTo('admin')}
                        className="w-full py-4 bg-white dark:bg-gray-900 text-blue-600 rounded-[14px] font-semibold text-[17px] border border-gray-100 dark:border-gray-800 shadow-sm"
                      >
                        Administrative Panel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Admin Login Modal */}
      <AnimatePresence>
        {showSignInModal && (
          <SignInModal 
            onClose={() => setShowSignInModal(false)}
            onSuccess={onSignInSuccess}
          />
        )}
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
      {view !== 'game-details' && view !== 'team-details' && view !== 'league-details' && view !== 'player-details' && view !== 'fantasy' && (
        <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[calc(100%-48px)] max-w-sm bg-white/70 dark:bg-black/40 backdrop-blur-3xl shadow-[0_30px_60px_-12px_rgba(0,0,0,0.25)] rounded-[40px] border border-white/40 dark:border-white/5 py-3 px-6 z-40 ring-1 ring-black/5">
          <div className="flex justify-between items-center">
            <NavButton active={view === 'matches'} onClick={() => { navigateTo('matches'); setSelectedLeagueId(null); setSelectedPlayerId(null); setSelectedTeamId(null); }} icon={<ClockIcon />} label={prefLanguage === 'English' ? 'Matches' : 'یارییەکان'} />
            <NavButton active={view === 'leagues'} onClick={() => navigateTo('leagues')} icon={<ShieldIcon />} label={prefLanguage === 'English' ? 'Explore' : 'گەڕان'} />
            <NavButton active={view === 'leaderboard'} onClick={() => navigateTo('leaderboard')} icon={<TrophyIcon />} label={prefLanguage === 'English' ? 'Stats' : 'ئامار'} />
            <NavButton active={view === 'settings'} onClick={() => navigateTo('settings')} icon={<SettingsIcon />} label={prefLanguage === 'English' ? 'My' : 'من'} />
          </div>
        </nav>
      )}
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1.5 transition-all text-center group",
        active ? "scale-100" : "text-gray-400 hover:text-gray-500 scale-95"
      )}
    >
      <div className={cn(
        "w-12 h-12 rounded-[22px] flex items-center justify-center transition-all duration-500 relative overflow-hidden",
        active 
          ? "bg-[#1A1A1A] dark:bg-white text-white dark:text-black shadow-xl" 
          : "bg-transparent text-gray-400"
      )}>
        {React.cloneElement(icon as React.ReactElement, { size: 22, strokeWidth: active ? 2.5 : 2 })}
      </div>
      <span className={cn(
        "text-[10px] font-bold tracking-tight transition-all duration-300",
        active ? "text-[#1A1A1A] dark:text-white opacity-100" : "opacity-0"
      )}>{label}</span>
    </button>
  );
}
