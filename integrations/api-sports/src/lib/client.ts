import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';

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

type Query = Record<string, string | number | boolean | undefined | null>;
export type ApiResponse = {
  response: any;
  errors?: unknown;
  paging?: { current?: number; total?: number };
  [key: string]: unknown;
};

const baseUrls: Record<SportType, string> = {
  football: 'https://v3.football.api-sports.io',
  basketball: 'https://v1.basketball.api-sports.io',
  baseball: 'https://v1.baseball.api-sports.io',
  hockey: 'https://v1.hockey.api-sports.io',
  rugby: 'https://v1.rugby.api-sports.io',
  handball: 'https://v1.handball.api-sports.io',
  volleyball: 'https://v1.volleyball.api-sports.io',
  afl: 'https://v1.afl.api-sports.io',
  nba: 'https://v2.nba.api-sports.io',
  nfl: 'https://v1.american-football.api-sports.io',
  'formula-1': 'https://v1.formula-1.api-sports.io',
  mma: 'https://v1.mma.api-sports.io'
};

const errorText = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(errorText).filter(Boolean).join('; ');
  if (value && typeof value === 'object') {
    return Object.entries(value)
      .map(([key, entry]) => {
        const message = errorText(entry);
        return message ? `${key}: ${message}` : '';
      })
      .filter(Boolean)
      .join('; ');
  }
  return '';
};

export const requireFilter = (params: Query, keys: string[], operation: string) => {
  if (!keys.some(key => params[key] !== undefined && params[key] !== null)) {
    throw createApiServiceError(
      `For ${operation}, provide at least one of: ${keys.join(', ')}.`
    );
  }
};

export class Client {
  private readonly http;

  constructor(private readonly opts: { token: string; sport: SportType }) {
    if (!opts.token.trim()) {
      throw createApiServiceError('Reconnect with a non-empty API-Sports API key.');
    }
    this.http = createAuthenticatedAxios({
      baseURL: baseUrls[opts.sport],
      contentType: false,
      headers: { 'x-apisports-key': opts.token.trim() },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'API-Sports',
          reason: 'api_sports_request_failed',
          extractResponse: (error, helpers) => helpers.getResponseWithBody(error),
          extractMessage: (error, helpers) => {
            const body = helpers.getResponseWithBody(error)?.data;
            return helpers.isRecord(body) ? errorText(body.errors) || undefined : undefined;
          }
        })
    });
  }

  private unsupported(operation: string): never {
    throw createApiServiceError(
      `${operation} is not available for ${this.opts.sport}. Select a supported sport or use its dedicated tools.`
    );
  }

  private async get(
    path: string,
    params: Query = {},
    allowed?: readonly string[]
  ): Promise<ApiResponse> {
    const query = pickDefined(params);
    for (const [key, value] of Object.entries(query)) {
      if (allowed && !allowed.includes(key)) {
        throw createApiServiceError(
          `${key} is not supported for ${this.opts.sport} ${path}. Remove this filter.`
        );
      }
      if (typeof value === 'number' && (!Number.isSafeInteger(value) || value < 1)) {
        throw createApiServiceError(`${key} must be a positive whole number.`);
      }
      if (typeof value === 'string' && !value.trim()) {
        throw createApiServiceError(`${key} must not be empty.`);
      }
      if (
        key === 'season' &&
        !(this.opts.sport === 'basketball'
          ? /^\d{4}(-\d{4})?$/.test(String(value))
          : /^\d{4}$/.test(String(value)))
      ) {
        throw createApiServiceError(
          'season must be an exact season identifier from get_seasons.'
        );
      }
      if (
        typeof value === 'string' &&
        [
          'id',
          'league',
          'team',
          'fixture',
          'player',
          'game',
          'fight',
          'bookmaker',
          'bet',
          'page',
          'last',
          'next',
          'fighter'
        ].includes(key) &&
        !(key === 'league' && this.opts.sport === 'nba')
      ) {
        throw createApiServiceError(
          `${key} must be a numeric identifier for ${this.opts.sport}.`
        );
      }
      if (key === 'search' && String(value).trim().length < 3) {
        throw createApiServiceError('search must contain at least 3 characters.');
      }
      if (['date', 'from', 'to'].includes(key)) {
        const date = String(value);
        const parsed = new Date(`${date}T00:00:00Z`);
        if (
          !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
          !Number.isFinite(parsed.getTime()) ||
          parsed.toISOString().slice(0, 10) !== date
        ) {
          throw createApiServiceError(
            `${key} must be a real calendar date in YYYY-MM-DD format.`
          );
        }
      }
    }
    if (query.from && query.to && String(query.from) > String(query.to)) {
      throw createApiServiceError('from must be on or before to.');
    }
    const { data } = await this.http.get<ApiResponse>(path, { params: query });
    if (!data || typeof data !== 'object' || !('response' in data)) {
      throw createApiServiceError('API-Sports returned an invalid response.', {
        reason: 'api_sports_invalid_response'
      });
    }
    const message = errorText(data.errors);
    if (message) {
      throw createApiServiceError(`API-Sports: ${message}`, {
        reason: 'api_sports_api_error'
      });
    }
    return data;
  }

  async getLeagues(
    params: {
      leagueId?: number;
      name?: string;
      country?: string;
      season?: number | string;
      type?: string;
      current?: boolean;
      search?: string;
    } = {}
  ) {
    if (['nba', 'formula-1', 'mma'].includes(this.opts.sport)) {
      if (this.opts.sport === 'nba')
        throw createApiServiceError(
          'NBA leagues use names, not numeric IDs. Use get_nba_leagues to discover them.'
        );
      this.unsupported('League discovery');
    }
    const query = { ...params, id: params.leagueId, leagueId: undefined };
    return this.get(
      '/leagues',
      query,
      this.opts.sport === 'football'
        ? ['id', 'name', 'country', 'season', 'type', 'current', 'search']
        : this.opts.sport === 'nfl'
          ? ['id', 'season', 'current']
          : ['id', 'name', 'country', 'season', 'type', 'search']
    );
  }

  async getTeams(
    params: {
      teamId?: number;
      name?: string;
      league?: number;
      season?: number | string;
      country?: string;
      search?: string;
      nbaLeague?: string;
    } = {}
  ) {
    const { teamId, nbaLeague, ...rest } = params;
    if (this.opts.sport !== 'nba' && nbaLeague !== undefined)
      throw createApiServiceError('nbaLeague is only supported for NBA.');
    if (this.opts.sport === 'nba' && rest.league !== undefined)
      throw createApiServiceError(
        'NBA uses named leagues. Replace league with nbaLeague from get_nba_leagues.'
      );
    const query = { ...rest, id: teamId, league: nbaLeague ?? rest.league };
    if (!['formula-1', 'mma', 'nba'].includes(this.opts.sport))
      requireFilter(query, ['id', 'name', 'league', 'country', 'search'], 'team discovery');
    const allowed =
      this.opts.sport === 'formula-1'
        ? ['id', 'name', 'search']
        : this.opts.sport === 'mma'
          ? ['id', 'search']
          : this.opts.sport === 'nba'
            ? ['id', 'name', 'league', 'search']
            : ['id', 'name', 'league', 'season', 'country', 'search'];
    return this.get('/teams', query, allowed);
  }

  async getTeamStatistics(params: {
    league: number;
    season: number | string;
    team: number;
    date?: string;
  }) {
    if (['nfl', 'nba', 'formula-1', 'mma'].includes(this.opts.sport))
      this.unsupported('League team season statistics');
    return this.get('/teams/statistics', params);
  }

  async getPlayers(
    params: {
      playerId?: number;
      team?: number;
      league?: number;
      season?: number | string;
      search?: string;
      page?: number;
    } = {}
  ) {
    if (
      ['baseball', 'hockey', 'rugby', 'handball', 'volleyball', 'afl'].includes(
        this.opts.sport
      )
    )
      this.unsupported('Player profiles');
    const { playerId, ...rest } = params;
    const query = { ...rest, id: playerId };
    requireFilter(query, ['id', 'team', 'league', 'season', 'search'], 'player discovery');
    const path =
      this.opts.sport === 'formula-1'
        ? '/drivers'
        : this.opts.sport === 'mma'
          ? '/fighters'
          : '/players';
    const allowed =
      this.opts.sport === 'football'
        ? ['id', 'team', 'league', 'season', 'search', 'page']
        : this.opts.sport === 'basketball'
          ? ['id', 'team', 'league', 'season', 'search']
          : ['nba', 'nfl'].includes(this.opts.sport)
            ? ['id', 'team', 'season', 'search']
            : ['id', 'team', 'search'];
    return this.get(path, query, allowed);
  }

  async getFixtures(params: Query = {}) {
    if (this.opts.sport === 'football') return this.getFootballFixtures(params);
    const allowed =
      this.opts.sport === 'formula-1'
        ? [
            'id',
            'season',
            'date',
            'timezone',
            'type',
            'competition',
            'circuit',
            'last',
            'next'
          ]
        : this.opts.sport === 'mma'
          ? ['id', 'date', 'season', 'fighter', 'category', 'timezone']
          : ['nba', 'nfl'].includes(this.opts.sport)
            ? ['id', 'date', 'league', 'season', 'team', 'live', 'timezone', 'h2h']
            : ['id', 'date', 'league', 'season', 'team', 'timezone'];
    requireFilter(
      params,
      this.opts.sport === 'mma'
        ? ['id', 'date', 'season', 'fighter']
        : this.opts.sport === 'formula-1'
          ? ['id', 'season', 'date', 'competition', 'circuit', 'last', 'next']
          : ['id', 'date', 'league', 'season', 'team', 'live'],
      'fixtures'
    );
    if (this.opts.sport === 'nba' && typeof params.league === 'number')
      throw createApiServiceError(
        'NBA uses named leagues. Replace league with nbaLeague from get_nba_leagues.'
      );
    return this.get(
      this.opts.sport === 'formula-1'
        ? '/races'
        : this.opts.sport === 'mma'
          ? '/fights'
          : '/games',
      params,
      allowed
    );
  }

  async getFootballFixtures(params: Query = {}) {
    requireFilter(
      params,
      ['id', 'ids', 'live', 'league', 'team', 'date', 'last', 'next'],
      'football fixtures'
    );
    return this.get('/fixtures', params, [
      'id',
      'ids',
      'live',
      'league',
      'season',
      'team',
      'date',
      'from',
      'to',
      'round',
      'status',
      'timezone',
      'last',
      'next'
    ]);
  }

  async getFixtureEvents(fixtureId: number) {
    return this.get('/fixtures/events', { fixture: fixtureId });
  }
  async getFixtureLineups(fixtureId: number) {
    return this.get('/fixtures/lineups', { fixture: fixtureId });
  }
  async getFixtureStatistics(fixtureId: number) {
    return this.get('/fixtures/statistics', { fixture: fixtureId });
  }

  async getStandings(params: {
    league: number;
    season: number | string;
    team?: number;
    stage?: string;
    group?: string;
    conference?: string;
    division?: string;
  }) {
    if (['formula-1', 'mma', 'nba'].includes(this.opts.sport))
      this.unsupported('Numeric-league standings');
    return this.get(
      '/standings',
      params,
      this.opts.sport === 'football'
        ? ['league', 'season', 'team']
        : this.opts.sport === 'nfl'
          ? ['league', 'season', 'team', 'conference', 'division']
          : ['league', 'season', 'team', 'stage', 'group']
    );
  }

  async getOdds(
    params: {
      fixture?: number;
      league?: number;
      season?: number | string;
      date?: string;
      timezone?: string;
      page?: number;
      bookmaker?: number;
      bet?: number;
    } = {}
  ) {
    if (['nba', 'formula-1'].includes(this.opts.sport)) this.unsupported('Pre-match odds');
    const { fixture, ...rest } = params;
    const query = {
      ...rest,
      [this.opts.sport === 'football'
        ? 'fixture'
        : this.opts.sport === 'mma'
          ? 'fight'
          : 'game']: fixture
    };
    requireFilter(
      query,
      this.opts.sport === 'football'
        ? ['fixture', 'league', 'date']
        : this.opts.sport === 'mma'
          ? ['fight', 'date']
          : this.opts.sport === 'nfl'
            ? ['game']
            : ['game', 'league'],
      'pre-match odds'
    );
    return this.get(
      '/odds',
      query,
      this.opts.sport === 'football'
        ? ['fixture', 'league', 'season', 'date', 'timezone', 'page', 'bookmaker', 'bet']
        : this.opts.sport === 'mma'
          ? ['fight', 'date', 'bookmaker', 'bet']
          : this.opts.sport === 'nfl'
            ? ['game', 'bookmaker', 'bet']
            : ['game', 'league', 'season', 'bookmaker', 'bet']
    );
  }

  async getPredictions(fixtureId: number) {
    return this.get('/predictions', { fixture: fixtureId });
  }
  async getInjuries(params: Query = {}) {
    requireFilter(
      params,
      ['league', 'fixture', 'team', 'player', 'date'],
      'football injuries'
    );
    return this.get('/injuries', params);
  }
  async getCoaches(params: { coachId?: number; team?: number; search?: string } = {}) {
    const query = { id: params.coachId, team: params.team, search: params.search };
    requireFilter(query, ['id', 'team', 'search'], 'football coaches');
    return this.get('/coachs', query);
  }
  async getTransfers(params: { player?: number; team?: number } = {}) {
    requireFilter(params, ['player', 'team'], 'football transfers');
    return this.get('/transfers', params);
  }
  async getCountries(params: Query = {}) {
    if (['nba', 'formula-1', 'mma'].includes(this.opts.sport))
      this.unsupported('Country discovery');
    return this.get(
      '/countries',
      params,
      this.opts.sport === 'football' ? ['name', 'code', 'search'] : ['name', 'code', 'search']
    );
  }
  async getMmaFightResults(id: number) {
    return this.get('/fights/results', { id });
  }
  async getMmaFighterStatistics(id: number) {
    return this.get('/fights/statistics/fighters', { id });
  }
  async getSeasons() {
    return this.get(this.opts.sport === 'football' ? '/leagues/seasons' : '/seasons');
  }
  async getStatus() {
    return this.get('/status');
  }
  async getNbaLeagues() {
    return this.get('/leagues');
  }
  async getNbaStandings(params: {
    league: string;
    season: number;
    team?: number;
    conference?: string;
    division?: string;
  }) {
    return this.get('/standings', params);
  }
  async getNbaTeamStatistics(params: { id: number; season: number; stage?: number }) {
    return this.get('/teams/statistics', params);
  }
  async getNbaPlayerStatistics(params: {
    id?: number;
    game?: number;
    team?: number;
    season?: number;
  }) {
    requireFilter(params, ['id', 'game', 'team', 'season'], 'NBA player statistics');
    return this.get('/players/statistics', params);
  }
  async getFootballSquads(params: { team?: number; player?: number }) {
    requireFilter(params, ['team', 'player'], 'football squads');
    return this.get('/players/squads', params);
  }
  async getFootballTopScorers(params: { league: number; season: number }) {
    return this.get('/players/topscorers', params);
  }
}
