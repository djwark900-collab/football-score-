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
  coachName?: string;
  coachImageUrl?: string;
  foundedIn?: string;
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
  round?: 'Group Stage' | 'Playoff' | 'Quarter-final' | 'Semi-final' | 'Final' | string;
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
