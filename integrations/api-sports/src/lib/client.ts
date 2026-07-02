import { createAxios } from 'slates';

export type SportType =
  | 'football'
  | 'basketball'
  | 'baseball'
  | 'hockey'
  | 'rugby'
  | 'handball'
  | 'volleyball'
  | 'afl'
  | 'nba'
  | 'nfl'
  | 'formula-1'
  | 'mma';

let sportVersionMap: Record<SportType, string> = {
  football: 'v3',
  basketball: 'v1',
  baseball: 'v1',
  hockey: 'v1',
  rugby: 'v1',
  handball: 'v1',
  volleyball: 'v1',
  afl: 'v1',
  nba: 'v2',
  nfl: 'v1',
  'formula-1': 'v1',
  mma: 'v1'
};

let getBaseUrl = (sport: SportType): string => {
  let version = sportVersionMap[sport] ?? 'v1';
  return `https://${version}.${sport}.api-sports.io`;
};

export class Client {
  private token: string;
  private sport: SportType;
  private http: ReturnType<typeof createAxios>;

  constructor(opts: { token: string; sport: SportType }) {
    this.token = opts.token;
    this.sport = opts.sport;
    this.http = createAxios({
      baseURL: getBaseUrl(opts.sport),
      headers: {
        'x-apisports-key': opts.token
      }
    });
  }

  private async get<T = any>(path: string, params?: Record<string, any>): Promise<T> {
    let cleanParams: Record<string, string> = {};
    if (params) {
      for (let [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== '') {
          cleanParams[key] = String(value);
        }
      }
    }
    let response = await this.http.get(path, { params: cleanParams });
    return response.data;
  }

  forSport(sport: SportType): Client {
    return new Client({ token: this.token, sport });
  }

  // ─── Leagues ────────────────────────────────────────────────

  async getLeagues(params?: {
    leagueId?: number;
    name?: string;
    country?: string;
    season?: number;
    type?: string;
    current?: boolean;
    search?: string;
  }): Promise<any> {
    return this.get('/leagues', {
      id: params?.leagueId,
      name: params?.name,
      country: params?.country,
      season: params?.season,
      type: params?.type,
      current: params?.current != null ? (params.current ? 'true' : 'false') : undefined,
      search: params?.search
    });
  }

  // ─── Teams ──────────────────────────────────────────────────

  async getTeams(params?: {
    teamId?: number;
    name?: string;
    league?: number;
    season?: number;
    country?: string;
    search?: string;
  }): Promise<any> {
    return this.get('/teams', {
      id: params?.teamId,
      name: params?.name,
      league: params?.league,
      season: params?.season,
      country: params?.country,
      search: params?.search
    });
  }

  async getTeamStatistics(params: {
    league: number;
    season: number;
    team: number;
    date?: string;
  }): Promise<any> {
    return this.get('/teams/statistics', params);
  }

  // ─── Players ────────────────────────────────────────────────

  async getPlayers(params?: {
    playerId?: number;
    team?: number;
    league?: number;
    season?: number;
    search?: string;
    page?: number;
  }): Promise<any> {
    return this.get('/players', {
      id: params?.playerId,
      team: params?.team,
      league: params?.league,
      season: params?.season,
      search: params?.search,
      page: params?.page
    });
  }

  // ─── Fixtures ───────────────────────────────────────────────

  async getFixtures(params?: {
    fixtureId?: number;
    ids?: string;
    live?: string;
    league?: number;
    season?: number;
    team?: number;
    date?: string;
    from?: string;
    to?: string;
    round?: string;
    status?: string;
    timezone?: string;
    last?: number;
    next?: number;
  }): Promise<any> {
    // Different sports use different endpoints
    if (this.sport === 'formula-1') {
      return this.get('/races', params);
    }
    return this.get(this.sport === 'mma' ? '/fights' : '/games', params);
  }

  async getFootballFixtures(params?: {
    fixtureId?: number;
    ids?: string;
    live?: string;
    league?: number;
    season?: number;
    team?: number;
    date?: string;
    from?: string;
    to?: string;
    round?: string;
    status?: string;
    timezone?: string;
    last?: number;
    next?: number;
  }): Promise<any> {
    return this.get('/fixtures', params);
  }

  // ─── Live Scores ────────────────────────────────────────────

  async getLiveFixtures(params?: { league?: number }): Promise<any> {
    if (this.sport === 'football') {
      return this.get('/fixtures', { live: 'all', league: params?.league });
    }
    return this.get('/games', { live: 'all', league: params?.league });
  }

  // ─── Match Events ──────────────────────────────────────────

  async getFixtureEvents(fixtureId: number): Promise<any> {
    return this.get('/fixtures/events', { fixture: fixtureId });
  }

  // ─── Lineups ───────────────────────────────────────────────

  async getFixtureLineups(fixtureId: number): Promise<any> {
    return this.get('/fixtures/lineups', { fixture: fixtureId });
  }

  // ─── Match Statistics ──────────────────────────────────────

  async getFixtureStatistics(
    fixtureId: number,
    params?: {
      team?: number;
      type?: string;
    }
  ): Promise<any> {
    return this.get('/fixtures/statistics', {
      fixture: fixtureId,
      team: params?.team,
      type: params?.type
    });
  }

  // ─── Standings ─────────────────────────────────────────────

  async getStandings(params: { league: number; season: number; team?: number }): Promise<any> {
    return this.get('/standings', params);
  }

  // ─── Odds ──────────────────────────────────────────────────

  async getOdds(params?: {
    fixture?: number;
    league?: number;
    season?: number;
    date?: string;
    timezone?: string;
    page?: number;
    bookmaker?: number;
    bet?: number;
  }): Promise<any> {
    return this.get('/odds', params);
  }

  // ─── Predictions ───────────────────────────────────────────

  async getPredictions(fixtureId: number): Promise<any> {
    return this.get('/predictions', { fixture: fixtureId });
  }

  // ─── Injuries ──────────────────────────────────────────────

  async getInjuries(params?: {
    league?: number;
    season?: number;
    fixture?: number;
    team?: number;
    player?: number;
    date?: string;
    timezone?: string;
  }): Promise<any> {
    return this.get('/injuries', params);
  }

  // ─── Coaches ───────────────────────────────────────────────

  async getCoaches(params?: {
    coachId?: number;
    team?: number;
    search?: string;
  }): Promise<any> {
    return this.get('/coachs', {
      id: params?.coachId,
      team: params?.team,
      search: params?.search
    });
  }

  // ─── Transfers ─────────────────────────────────────────────

  async getTransfers(params?: { player?: number; team?: number }): Promise<any> {
    return this.get('/transfers', params);
  }

  // ─── Countries ─────────────────────────────────────────────

  async getCountries(params?: {
    name?: string;
    code?: string;
    search?: string;
  }): Promise<any> {
    return this.get('/countries', params);
  }

  // ─── Seasons ───────────────────────────────────────────────

  async getSeasons(): Promise<any> {
    return this.get('/seasons');
  }

  // ─── Status ────────────────────────────────────────────────

  async getStatus(): Promise<any> {
    return this.get('/status');
  }

  // ─── F1 Specific ───────────────────────────────────────────

  async getRaces(params?: {
    raceId?: number;
    season?: number;
    type?: string;
    date?: string;
    competition?: number;
    circuit?: number;
    next?: number;
    last?: number;
    timezone?: string;
  }): Promise<any> {
    return this.get('/races', {
      id: params?.raceId,
      season: params?.season,
      type: params?.type,
      date: params?.date,
      competition: params?.competition,
      circuit: params?.circuit,
      next: params?.next,
      last: params?.last,
      timezone: params?.timezone
    });
  }

  async getCircuits(params?: {
    circuitId?: number;
    name?: string;
    country?: string;
    city?: string;
    search?: string;
  }): Promise<any> {
    return this.get('/circuits', {
      id: params?.circuitId,
      name: params?.name,
      country: params?.country,
      city: params?.city,
      search: params?.search
    });
  }

  async getDriverRankings(params: { season: number }): Promise<any> {
    return this.get('/rankings/drivers', params);
  }

  async getTeamRankings(params: { season: number }): Promise<any> {
    return this.get('/rankings/teams', params);
  }

  // ─── Timezone ──────────────────────────────────────────────

  async getTimezones(): Promise<any> {
    return this.get('/timezone');
  }
}
