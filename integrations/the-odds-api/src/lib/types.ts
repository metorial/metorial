export interface Sport {
  key: string;
  group: string;
  title: string;
  description: string;
  active: boolean;
  has_outrights: boolean;
}

export interface Outcome {
  name: string;
  price: number;
  point?: number;
  description?: string;
  link?: string;
  sid?: string;
}

export interface Market {
  key: string;
  last_update?: string;
  outcomes: Outcome[];
}

export interface Bookmaker {
  key: string;
  title: string;
  last_update: string;
  link?: string;
  markets: Market[];
}

export interface Event {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string | null;
  away_team: string | null;
}

export interface EventWithOdds extends Event {
  bookmakers: Bookmaker[];
}

export interface Score {
  name: string;
  score: string;
}

export interface EventWithScores extends Event {
  completed: boolean;
  scores: Score[] | null;
  last_update: string | null;
}

export interface MarketKey {
  key: string;
  last_update: string;
}

export interface BookmakerMarkets {
  key: string;
  title: string;
  markets: MarketKey[];
}

export interface EventMarkets {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string | null;
  away_team: string | null;
  bookmakers: BookmakerMarkets[];
}

export interface Participant {
  id: string;
  full_name: string;
}

export interface HistoricalResponse<T> {
  timestamp: string;
  previous_timestamp: string | null;
  next_timestamp: string | null;
  data: T;
}
