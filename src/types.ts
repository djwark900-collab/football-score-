export interface Competition {
  id: string;
  name: string;
  logo?: string;
  type: 'league' | 'cup' | 'international';
}

export interface League {
  id: string;
  name: string;
  logo?: string;
  country?: string;
  description?: string;
  type?: 'league' | 'cup';
  competitionId?: string;
  currentSeasonId?: string;
  history?: {
    season: string;
    winnerId: string;
  }[];
}

export interface Season {
  id: string;
  leagueId: string;
  year: string;
  status: 'active' | 'finished' | 'upcoming';
}

export interface Team {
  id: string;
  name: string;
  logo?: string;
  leagueId: string;
  leagueId2?: string;
  coachName?: string;
  coachImageUrl?: string;
  foundedIn?: string;
  city?: string;
  marketValue?: string;
  foreignPlayers?: number;
  nationalPlayers?: number;
  stadiumImageUrl?: string;
}

export interface Player {
  id: string;
  name: string;
  teamId: string;
  position: string;
  number: number;
  imageUrl?: string;
  overview?: string;
  career?: string;
  transferHistory?: string;
  // New detailed fields
  birthDate?: string;
  height?: string;
  weight?: string;
  nationality?: string;
  foot?: 'Left' | 'Right' | 'Both';
  statsRadar?: {
    attacking: number;
    creativity: number;
    defending: number;
    tactical: number;
    technical: number;
  };
  recentRatings?: number[];
  price?: number;
  fantasyPoints?: number;
  goals?: number;
  assists?: number;
  cleanSheets?: number;
}

export interface Venue {
  id: string;
  name: string;
  city?: string;
  capacity?: number;
}

export interface MatchEvent {
  id: string;
  type: 'goal' | 'yellow' | 'red' | 'sub' | 'penalty';
  minute: number;
  playerId: string;
  assistantId?: string;
  playerInId?: string;
  playerOutId?: string;
  teamId: string;
}

export interface Game {
  id: string;
  leagueId: string;
  leagueId2?: string;
  seasonId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  status: 'scheduled' | 'live' | 'finished';
  currentTime?: string;
  date: string;
  venueId?: string;
  attendance?: number;
  round?: 'Group Stage' | 'Knockout' | 'Knockout Stage' | 'Playoff' | 'Quarter-final' | 'Semi-final' | 'Semi-finals' | 'semi finals' | 'Final' | string;
  // Stats
  stats?: {
    possession: { home: number; away: number };
    shots: { home: number; away: number };
    shotsOnGoal: { home: number; away: number };
    corners: { home: number; away: number };
    yellowCards: { home: number; away: number };
    crosses: { home: number; away: number };
    goalKicks: { home: number; away: number };
  };
  events?: MatchEvent[];
  lineups?: {
    home: string[];
    away: string[];
  };
  refereeName?: string;
  broadcastChannels?: {
    name: string;
    commentator?: string;
    isImportant?: boolean;
  }[];
  posterUrl?: string;
}

export interface AppNotification {
  id: string;
  type: 'goal' | 'penalty' | 'red' | 'yellow' | 'info';
  title: string;
  message: string;
  gameId?: string;
  timestamp: string;
  isRead: boolean;
}

export interface Administrator {
  id: string;
  email: string;
  role: 'super' | 'editor';
}

export interface Transfer {
  id: string;
  playerId: string;
  fromTeamId: string;
  toTeamId: string;
  date: string;
  fee?: string;
  type: 'permanent' | 'loan' | 'free';
}

export interface FantasyPlayer extends Player {
  price: number;
  fantasyPoints?: number;
}

export interface FantasyTeam {
  id: string;
  userId: string;
  name: string;
  budget: number;
  totalPoints: number;
  playerIds: string[]; // 15 players usually (2 GK, 5 DF, 5 MF, 3 FW)
  benchPlayerIds?: string[];
  formation?: string;
  captainId?: string;
  viceCaptainId?: string;
  chips?: {
    benchBoostUsed: boolean;
    freeHitUsed: boolean;
    tripleCaptainUsed: boolean;
  };
  weekPoints?: Record<number, number>; // week number -> points
}

export interface FantasyLeague {
  id: string;
  name: string;
  ownerId: string;
  isPublic: boolean;
  code?: string;
  memberIds: string[];
}
