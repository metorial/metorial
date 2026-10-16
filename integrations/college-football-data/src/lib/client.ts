import { buildApiServiceError, createApiServiceError, createAxios } from 'slates';

export class Client {
  private axios;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError('Enter a College Football Data API key.', {
        reason: 'missing_api_key'
      });
    }
    this.axios = createAxios({
      baseURL: 'https://api.collegefootballdata.com',
      headers: {
        Authorization: `Bearer ${config.token.trim()}`
      }
    });
  }

  private async get(path: string, params: Record<string, unknown> = {}, expectsArray = true) {
    for (let [name, value] of Object.entries(params)) {
      if (typeof value === 'string' && !value.trim()) {
        throw createApiServiceError(`${name} must not be blank.`, {
          reason: 'invalid_parameter'
        });
      }
      if (typeof value === 'number') {
        let allowsFraction =
          name === 'threshold' ||
          (name === 'week' &&
            ['/rankings', '/stats/game/advanced', '/stats/game/havoc'].includes(path));
        if (
          !Number.isFinite(value) ||
          (!allowsFraction &&
            (!Number.isInteger(value) || value < -2147483648 || value > 2147483647))
        ) {
          throw createApiServiceError(
            `${name} must be ${allowsFraction ? 'a finite number' : 'a 32-bit integer'}.`,
            { reason: 'invalid_parameter' }
          );
        }
      }
    }
    for (let [lower, upper] of [
      ['startWeek', 'endWeek'],
      ['minYear', 'maxYear'],
      ['startYear', 'endYear']
    ] as const) {
      if (
        typeof params[lower] === 'number' &&
        typeof params[upper] === 'number' &&
        params[lower] > params[upper]
      ) {
        throw createApiServiceError(`${lower} must not exceed ${upper}.`, {
          reason: 'invalid_range'
        });
      }
    }
    let requiresYearOrTeam = [
      '/stats/season',
      '/stats/season/advanced',
      '/stats/game/advanced',
      '/ratings/core',
      '/ratings/sp',
      '/ratings/srs',
      '/ratings/fpi',
      '/ppa/teams',
      '/player/returning',
      '/records',
      '/recruiting/players'
    ];
    if (
      requiresYearOrTeam.includes(path) &&
      params.year === undefined &&
      params.team === undefined
    ) {
      throw createApiServiceError('Provide year or team for this query.', {
        reason: 'missing_filter'
      });
    }
    if (
      path === '/ppa/players/season' &&
      params.year === undefined &&
      params.playerId === undefined
    ) {
      throw createApiServiceError('Provide year or playerId for player PPA.', {
        reason: 'missing_filter'
      });
    }
    if (path === '/lines' && params.year === undefined && params.gameId === undefined) {
      throw createApiServiceError('Provide year or gameId when retrieving betting lines.', {
        reason: 'missing_filter'
      });
    }
    try {
      let response = await this.axios.get(path, { params });
      if (
        (expectsArray && !Array.isArray(response.data)) ||
        (!expectsArray &&
          response.data !== null &&
          (typeof response.data !== 'object' || Array.isArray(response.data)))
      ) {
        throw createApiServiceError(
          'College Football Data returned an unexpected response; expected the documented data shape.',
          { reason: 'invalid_response' }
        );
      }
      return response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'College Football Data',
        reason: 'college_football_data_request_failed',
        operation: `GET ${path}`,
        extractResponse: (failure, helpers) => helpers.getResponseWithBody(failure),
        nestedKeys: ['errors', 'error', 'message', 'details'],
        extractMessage: (failure, helpers) => {
          let response = helpers.getResponseWithBody(failure);
          let body = response?.data;
          let details: string[] = [];
          helpers.collectDetails(body, details, {
            nestedKeys: ['errors', 'error', 'message', 'details']
          });
          if (helpers.isRecord(body) && helpers.isRecord(body.fields)) {
            for (let [field, issue] of Object.entries(body.fields)) {
              let fieldDetails: string[] = [];
              helpers.collectDetails(issue, fieldDetails);
              if (fieldDetails.length) details.push(`${field}: ${fieldDetails.join('; ')}`);
            }
          }
          return details.length ? details.join(' - ') : undefined;
        }
      });
    }
  }

  // ---- Games & Schedules ----

  async getGames(params: {
    year?: number;
    seasonType?: string;
    week?: number;
    team?: string;
    conference?: string;
    classification?: string;
    gameId?: number;
    home?: string;
    away?: string;
  }) {
    let { gameId, ...filters } = params;
    return this.get('/games', { ...filters, id: gameId });
  }

  async getGameTeamStats(gameId: number) {
    return this.get('/games/teams', { id: gameId });
  }

  async getGamePlayerStats(gameId: number) {
    return this.get('/games/players', { id: gameId });
  }

  async getGameWeather(params: {
    year: number;
    week?: number;
    team?: string;
    conference?: string;
    seasonType?: string;
  }) {
    return this.get(`/games/weather`, params);
  }

  async getGameMedia(params: {
    year: number;
    week?: number;
    team?: string;
    conference?: string;
    seasonType?: string;
  }) {
    return this.get('/games/media', params);
  }

  async getCalendar(params: { year: number }) {
    return this.get('/calendar', params);
  }

  async getScoreboard(params?: { classification?: string; conference?: string }) {
    return this.get('/scoreboard', params);
  }

  async getLiveGame(gameId: number) {
    return this.get('/live/plays', { gameId }, false);
  }

  // ---- Teams ----

  async getTeams(params?: { conference?: string; year?: number }) {
    return this.get('/teams', params);
  }

  async getFbsTeams(params?: { year?: number }) {
    return this.get('/teams/fbs', params);
  }

  async getMatchup(params: {
    team1: string;
    team2: string;
    minYear?: number;
    maxYear?: number;
  }) {
    return this.get('/teams/matchup', params, false);
  }

  async getTeamATS(params: { year: number; conference?: string; team?: string }) {
    return this.get('/teams/ats', params);
  }

  async getRoster(params?: { team?: string; year?: number; classification?: string }) {
    return this.get('/roster', params);
  }

  async getTalent(params: { year: number }) {
    return this.get('/talent', params);
  }

  async getRecords(params?: { year?: number; team?: string; conference?: string }) {
    return this.get('/records', params);
  }

  // ---- Conferences & Venues ----

  async getConferences(params?: { year?: number; classification?: string }) {
    return this.get('/conferences', params);
  }

  async getVenues() {
    return this.get('/venues');
  }

  // ---- Players ----

  async searchPlayers(params: {
    searchTerm: string;
    year?: number;
    team?: string;
    limit?: number;
    position?: string;
  }) {
    let { limit, ...filters } = params;
    let players = await this.get('/player/search', filters);
    return limit === undefined ? players : players.slice(0, limit);
  }

  async getPlayerUsage(params: {
    year: number;
    team?: string;
    conference?: string;
    position?: string;
    playerId?: number;
    excludeGarbageTime?: boolean;
  }) {
    return this.get('/player/usage', params);
  }

  async getReturningProduction(params?: {
    year?: number;
    team?: string;
    conference?: string;
  }) {
    return this.get('/player/returning', params);
  }

  async getTransferPortal(params: { year: number }) {
    return this.get('/player/portal', params);
  }

  // ---- Statistics ----

  async getPlayerSeasonStats(params: {
    year: number;
    conference?: string;
    team?: string;
    startWeek?: number;
    endWeek?: number;
    seasonType?: string;
    category?: string;
  }) {
    return this.get('/stats/player/season', params);
  }

  async getTeamSeasonStats(params?: {
    year?: number;
    team?: string;
    conference?: string;
    startWeek?: number;
    endWeek?: number;
  }) {
    return this.get('/stats/season', params);
  }

  async getStatCategories() {
    return this.get('/stats/categories');
  }

  async getAdvancedSeasonStats(params?: {
    year?: number;
    team?: string;
    excludeGarbageTime?: boolean;
    startWeek?: number;
    endWeek?: number;
  }) {
    return this.get('/stats/season/advanced', params);
  }

  async getAdvancedGameStats(params?: {
    year?: number;
    team?: string;
    week?: number;
    opponent?: string;
    excludeGarbageTime?: boolean;
    seasonType?: string;
  }) {
    return this.get('/stats/game/advanced', params);
  }

  // ---- Recruiting ----

  async getRecruits(params?: {
    year?: number;
    team?: string;
    position?: string;
    state?: string;
    classification?: string;
  }) {
    return this.get('/recruiting/players', params);
  }

  async getTeamRecruitingRankings(params?: { year?: number; team?: string }) {
    return this.get('/recruiting/teams', params);
  }

  async getRecruitingGroups(params?: {
    team?: string;
    conference?: string;
    recruitType?: string;
    startYear?: number;
    endYear?: number;
  }) {
    return this.get('/recruiting/groups', params);
  }

  // ---- Ratings & Rankings ----

  async getSPRatings(params?: { year?: number; team?: string }) {
    return this.get('/ratings/sp', params);
  }

  async getConferenceSPRatings(params?: { year?: number; conference?: string }) {
    return this.get('/ratings/sp/conferences', params);
  }

  async getSRSRatings(params?: { year?: number; team?: string; conference?: string }) {
    return this.get('/ratings/srs', params);
  }

  async getEloRatings(params?: {
    year?: number;
    week?: number;
    seasonType?: string;
    team?: string;
    conference?: string;
  }) {
    return this.get('/ratings/elo', params);
  }

  async getFPIRatings(params?: { year?: number; team?: string; conference?: string }) {
    return this.get('/ratings/fpi', params);
  }

  async getRankings(params: { year: number; seasonType?: string; week?: number }) {
    return this.get('/rankings', params);
  }

  // ---- Plays & Drives ----

  async getPlays(params: {
    year: number;
    week: number;
    team?: string;
    offense?: string;
    defense?: string;
    conference?: string;
    playType?: string;
    seasonType?: string;
    classification?: string;
  }) {
    return this.get('/plays', params);
  }

  async getPlayTypes() {
    return this.get('/plays/types');
  }

  async getPlayStats(params?: {
    year?: number;
    week?: number;
    team?: string;
    gameId?: number;
  }) {
    return this.get('/plays/stats', params);
  }

  async getDrives(params: {
    year: number;
    team?: string;
    seasonType?: string;
    week?: number;
    offense?: string;
    defense?: string;
    conference?: string;
  }) {
    return this.get('/drives', params);
  }

  // ---- PPA & Win Probability ----

  async getPredictedPoints(params: { down: number; distance: number }) {
    return this.get('/ppa/predicted', params);
  }

  async getTeamSeasonPPA(params?: {
    year?: number;
    team?: string;
    conference?: string;
    excludeGarbageTime?: boolean;
  }) {
    return this.get('/ppa/teams', params);
  }

  async getTeamGamePPA(params: {
    year: number;
    week: number;
    team?: string;
    conference?: string;
    excludeGarbageTime?: boolean;
  }) {
    return this.get('/ppa/games', params);
  }

  async getPlayerSeasonPPA(params?: {
    year?: number;
    team?: string;
    conference?: string;
    position?: string;
    playerId?: string;
    threshold?: number;
    excludeGarbageTime?: boolean;
  }) {
    return this.get('/ppa/players/season', params);
  }

  async getPlayerGamePPA(params?: {
    year?: number;
    week?: number;
    team?: string;
    position?: string;
    playerId?: string;
    threshold?: number;
    seasonType?: string;
    excludeGarbageTime?: boolean;
  }) {
    return this.get('/ppa/players/games', params);
  }

  async getWinProbability(params: { gameId: number }) {
    return this.get('/metrics/wp', params);
  }

  async getPregameWinProbability(params: {
    year?: number;
    week?: number;
    seasonType?: string;
    team?: string;
  }) {
    return this.get('/metrics/wp/pregame', params);
  }

  async getFieldGoalExpectedPoints() {
    return this.get('/metrics/fg/ep');
  }

  // ---- Betting ----

  async getBettingLines(params?: {
    year?: number;
    week?: number;
    team?: string;
    conference?: string;
    seasonType?: string;
    gameId?: number;
    home?: string;
    away?: string;
    provider?: string;
  }) {
    return this.get('/lines', params);
  }

  // ---- Adjusted Metrics ----

  async getAdjustedTeamSeasonMetrics(params?: {
    year?: number;
    team?: string;
    conference?: string;
  }) {
    return this.get('/wepa/team/season', params);
  }

  async getAdjustedPlayerPassing(params?: {
    year?: number;
    team?: string;
    conference?: string;
    position?: string;
  }) {
    return this.get('/wepa/players/passing', params);
  }

  async getAdjustedPlayerRushing(params?: {
    year?: number;
    team?: string;
    conference?: string;
    position?: string;
  }) {
    return this.get('/wepa/players/rushing', params);
  }

  async getKickerPAARRatings(params?: { year?: number; team?: string; conference?: string }) {
    return this.get('/wepa/players/kicking', params);
  }

  // ---- Coaches ----

  async getCoaches(params?: {
    firstName?: string;
    lastName?: string;
    school?: string;
    year?: number;
    minYear?: number;
    maxYear?: number;
  }) {
    let { school, ...filters } = params ?? {};
    return this.get('/coaches', { ...filters, team: school });
  }

  // ---- Draft ----

  async getDraftPicks(params?: {
    year?: number;
    nflTeam?: string;
    college?: string;
    position?: string;
  }) {
    let { nflTeam, college, ...filters } = params ?? {};
    return this.get('/draft/picks', { ...filters, team: nflTeam, school: college });
  }

  // ---- Advanced Box Score ----

  async getAdvancedBoxScore(gameId: number) {
    return this.get('/game/box/advanced', { id: gameId }, false);
  }

  async getAccountInfo() {
    let account = await this.get('/info', {}, false);
    if (account === null) {
      throw createApiServiceError(
        'College Football Data did not authenticate this API key. Reconnect with a current key.',
        { reason: 'unauthenticated' }
      );
    }
    return account;
  }

  async getSchedule(params: {
    year?: number;
    seasonType?: string;
    week?: number;
    classification?: string;
    conference?: string;
  }) {
    let explicit = [params.year, params.seasonType, params.week].filter(
      value => value !== undefined
    ).length;
    if (explicit !== 0 && explicit !== 3) {
      throw createApiServiceError(
        'For an explicit schedule, provide year, seasonType, and week together, or omit all three for the active or next slate.',
        { reason: 'incomplete_schedule_window' }
      );
    }
    return this.get('/games/schedule', params, false);
  }

  async getTeamOverview(params: { year: number; team: string }) {
    return this.get('/teams/season/overview', params, false);
  }

  async getPlayerOverview(params: { year: number; playerId: number }) {
    return this.get('/player/season/overview', params, false);
  }

  async getPlayoffBracket(params: { year: number }) {
    return this.get('/playoffs/cfp', params, false);
  }

  async getCoreRatings(params: { year: number; team?: string; conference?: string }) {
    return this.get('/ratings/core', params);
  }
}
