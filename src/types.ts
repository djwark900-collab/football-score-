export interface League {
  id: string;
  name: string;
  logo?: string;
  country?: string;
  description?: string;
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
}

export interface Player {
  id: string;
  name: string;
  teamId: string;
  position: string;
  number: number;
}

export interface Venue {
  id: string;
  name: string;
  city?: string;
  capacity?: number;
}

export interface MatchEvent {
  id: string;
  type: 'goal' | 'yellow' | 'red' | 'sub';
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
  date: string;
  venueId?: string;
  attendance?: number;
  round?: string;
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

export interface Administrator {
  id: string;
  email: string;
  role: 'super' | 'editor';
}
