import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined,
  requestAxiosData
} from 'slates';

type PlayerIdentity = {
  playerName?: string;
  playerEmail?: string;
  playerExternalId?: string;
  playerId?: string;
};

type PlayerFields = {
  playerName?: string;
  playerEmail?: string;
  playerExternalId?: string;
  offline?: boolean;
};

let hasText = (value: string | undefined): value is string =>
  typeof value === 'string' && value.trim().length > 0;

let requireText = (value: string, field: string) => {
  if (!hasText(value)) {
    throw createApiServiceError(`${field} must not be empty.`);
  }
};

let requirePlayer = (params: PlayerIdentity) => {
  if (
    ![params.playerId, params.playerName, params.playerEmail, params.playerExternalId].some(
      hasText
    )
  ) {
    throw createApiServiceError(
      'Provide a player ID, name, email, or external ID to identify the player.'
    );
  }
};

export let getPointagramList = (result: unknown, key: string): unknown[] => {
  if (Array.isArray(result)) return result;
  if (result === null || result === undefined) return [];
  if (isApiErrorRecord(result)) {
    if (Array.isArray(result[key])) return result[key];
    if (isApiErrorRecord(result.data) && Array.isArray(result.data[key])) {
      return result.data[key];
    }
  }
  return [result];
};

export class PointagramClient {
  private http: ReturnType<typeof createAuthenticatedAxios>;
  private httpV2: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string; apiUser: string }) {
    requireText(config.token, 'API key');
    requireText(config.apiUser, 'API user');
    this.http = createAuthenticatedAxios({
      baseURL: 'https://app.pointagram.com/server/externalapi.php',
      authHeader: { name: 'api_key', value: config.token },
      headers: { api_user: config.apiUser }
    });
    this.httpV2 = createAuthenticatedAxios({
      baseURL: 'https://app.pointagram.com/api/20',
      authHeader: { name: 'Api-Key', value: config.token },
      headers: { 'Api-User': config.apiUser }
    });
  }

  private async request(
    operation: string,
    method: 'get' | 'post' | 'delete',
    path: string,
    options: {
      data?: Record<string, unknown>;
      params?: Record<string, unknown>;
      v2?: boolean;
    } = {}
  ) {
    let http = options.v2 ? this.httpV2 : this.http;
    let result = await requestAxiosData(
      operation,
      () => http.request({ method, url: path, data: options.data, params: options.params }),
      (error, failedOperation) =>
        buildApiServiceError(error, {
          providerLabel: 'Pointagram',
          reason: 'pointagram_api_error',
          operation: failedOperation,
          nestedKeys: ['error', 'errors']
        })
    );

    if (isApiErrorRecord(result)) {
      let status = typeof result.status === 'string' ? result.status.toLowerCase() : '';
      let error = result.error;
      if (
        ['error', 'failed', 'failure', 'not found', 'unauthorized'].includes(status) ||
        error === true ||
        (typeof error === 'string' && error.trim() !== '' && error !== '0') ||
        isApiErrorRecord(error)
      ) {
        throw buildApiServiceError(
          { response: { status: 200, data: result } },
          {
            providerLabel: 'Pointagram',
            reason: 'pointagram_api_error',
            operation,
            nestedKeys: ['error', 'errors']
          }
        );
      }
    }
    return result;
  }

  async testCredentials() {
    return this.request('verify credentials', 'post', '/test');
  }

  async createPlayer(params: PlayerFields & { playerName: string }) {
    requireText(params.playerName, 'Player name');
    return this.request('create player', 'post', '/create_player', {
      data: pickDefined({
        player_name: params.playerName,
        player_email: params.playerEmail,
        player_external_id: params.playerExternalId,
        offline: params.offline === undefined ? undefined : params.offline ? 1 : 0
      })
    });
  }

  async listPlayers(params: { searchBy?: string; filter?: string } = {}) {
    if (hasText(params.searchBy) !== hasText(params.filter)) {
      throw createApiServiceError('Provide searchBy and filter together to search players.');
    }
    return this.request('list players', 'get', '/list_players', {
      params: pickDefined({ search_by: params.searchBy, filter: params.filter })
    });
  }

  async getPlayer(playerId: string) {
    requireText(playerId, 'Player ID');
    return this.request('get player', 'get', `/players/${encodeURIComponent(playerId)}`, {
      v2: true
    });
  }

  async updatePlayer(playerId: string, params: PlayerFields) {
    requireText(playerId, 'Player ID');
    if (params.playerName !== undefined) requireText(params.playerName, 'Player name');
    let data = pickDefined({
      player_name: params.playerName,
      player_email: params.playerEmail,
      player_external_id: params.playerExternalId,
      offline: params.offline === undefined ? undefined : params.offline ? '1' : '0'
    });
    if (Object.keys(data).length === 0) {
      throw createApiServiceError('Provide at least one player field to update.');
    }
    return this.request('update player', 'post', `/players/${encodeURIComponent(playerId)}`, {
      data,
      v2: true
    });
  }

  async removePlayer(params: Omit<PlayerIdentity, 'playerId'>) {
    requirePlayer(params);
    return this.request('remove player', 'post', '/remove_player', {
      data: pickDefined({
        player_name: params.playerName,
        player_email: params.playerEmail,
        player_external_id: params.playerExternalId
      })
    });
  }

  async createTeam(params: { teamName: string; icon: string; filterIgnore?: boolean }) {
    requireText(params.teamName, 'Team name');
    requireText(params.icon, 'Team icon');
    let standardIcons = ['Bears', 'Bulls', 'Cobras', 'Lions', 'Raccons', 'Sharks', 'Tigers'];
    let icon = standardIcons.includes(params.icon) ? `${params.icon}.png` : params.icon;
    return this.request('create team', 'post', '/add_team', {
      data: pickDefined({
        team_name: params.teamName,
        icon,
        filter_ignore:
          params.filterIgnore === undefined ? undefined : params.filterIgnore ? 1 : 0
      })
    });
  }

  async listTeams() {
    return this.request('list teams', 'get', '/list_teams');
  }

  async listTeamPlayers(teamId: string) {
    requireText(teamId, 'Team ID');
    return this.request(
      'list team players',
      'get',
      `/teams/${encodeURIComponent(teamId)}/players`,
      {
        v2: true
      }
    );
  }

  private async teamPlayerData(params: PlayerIdentity & { teamId: string }) {
    requireText(params.teamId, 'Team ID');
    requirePlayer(params);
    let playerId = params.playerId;
    if (
      !hasText(playerId) &&
      !hasText(params.playerEmail) &&
      !hasText(params.playerExternalId) &&
      hasText(params.playerName)
    ) {
      let result = await this.listPlayers({ searchBy: 'Name', filter: params.playerName });
      let players = getPointagramList(result, 'players').filter(
        player =>
          isApiErrorRecord(player) &&
          (player.Name === params.playerName || player.name === params.playerName)
      );
      if (players.length !== 1 || !isApiErrorRecord(players[0])) {
        throw createApiServiceError(
          'The player name did not identify exactly one player. Call list_players and use a player ID, email, or external ID.'
        );
      }
      let id = players[0].id ?? players[0].profile_id;
      if (typeof id !== 'string' && typeof id !== 'number') {
        throw createApiServiceError(
          'Pointagram did not return an ID for the matching player.'
        );
      }
      playerId = String(id);
    }
    return pickDefined({
      // The legacy documentation uses both spellings for the same team identifier.
      teamid: params.teamId,
      team_id: params.teamId,
      player_id: hasText(playerId) ? playerId : undefined,
      player_email: hasText(params.playerEmail) ? params.playerEmail : undefined,
      player_external_id: hasText(params.playerExternalId)
        ? params.playerExternalId
        : undefined
    });
  }

  async addPlayerToTeam(params: PlayerIdentity & { teamId: string }) {
    return this.request('add player to team', 'post', '/add_to_team', {
      data: await this.teamPlayerData(params)
    });
  }

  async removePlayerFromTeam(params: PlayerIdentity & { teamId: string }) {
    return this.request('remove player from team', 'delete', '/remove_from_team', {
      data: await this.teamPlayerData(params)
    });
  }

  async addScore(
    params: PlayerIdentity & {
      scoreseriesId?: string;
      scoreseriesName?: string;
      points?: number;
      pointtypeName?: string;
      sourceScoreId?: string;
      comment?: string;
      scoreTime?: string;
      tags?: { name: string }[];
      createPlayer?: boolean;
    }
  ) {
    requirePlayer(params);
    if (!hasText(params.scoreseriesId) && !hasText(params.scoreseriesName)) {
      throw createApiServiceError('Provide a score series ID or name.');
    }
    if (params.points === undefined && !hasText(params.pointtypeName)) {
      throw createApiServiceError('Provide points or a point type name.');
    }
    return this.request('add score', 'post', '/add_score', {
      data: pickDefined({
        scoreseries_id: params.scoreseriesId,
        scoreseries_name: params.scoreseriesName,
        points: params.points,
        pointtype_name: params.pointtypeName,
        player_name: params.playerName,
        player_email: params.playerEmail,
        player_external_id: params.playerExternalId,
        player_id: params.playerId,
        source_score_id: params.sourceScoreId,
        comment: params.comment,
        score_time: params.scoreTime,
        tags: params.tags,
        create_player:
          params.createPlayer === undefined ? undefined : params.createPlayer ? 1 : 0
      })
    });
  }

  async listScoreSeries() {
    return this.request('list score series', 'get', '/list_score_series');
  }

  async listScoreSeriesPointTypes(scoreseriesId: string) {
    requireText(scoreseriesId, 'Score series ID');
    return this.request('list point types', 'get', '/list_score_series_point_types', {
      params: { scoreseries: scoreseriesId }
    });
  }

  async listScoreSeriesHistory(params: {
    scoreseriesId: string;
    tagsFilter?: string;
    tagsOrFilter?: string;
    teamsFilter?: string;
    playerFilter?: string;
    timeFrom?: string;
    timeTo?: string;
    showRevoked?: boolean;
    limit?: number;
    offsetTimestamp?: string;
    offsetId?: string;
  }) {
    requireText(params.scoreseriesId, 'Score series ID');
    if (
      params.limit !== undefined &&
      (!Number.isInteger(params.limit) || params.limit < 1 || params.limit > 1000)
    ) {
      throw createApiServiceError('limit must be a whole number from 1 to 1000.');
    }
    return this.request('list score history', 'get', '/list_score_series_history', {
      params: pickDefined({
        scoreseriesid: params.scoreseriesId,
        tags_filter: params.tagsFilter,
        tags_or_filter: params.tagsOrFilter,
        teams_filter: params.teamsFilter,
        player_filter: params.playerFilter,
        time_from: params.timeFrom,
        time_to: params.timeTo,
        show_revoked:
          params.showRevoked === undefined ? undefined : params.showRevoked ? 1 : 0,
        limit: params.limit,
        offset_timestamp: params.offsetTimestamp,
        offset_id: params.offsetId
      })
    });
  }

  async listCompetitions(
    params: PlayerIdentity & { competitionId?: string; accessKey?: string } = {}
  ) {
    let playerFilter = hasText(params.playerEmail)
      ? { search_by: 'Email', filter: params.playerEmail }
      : hasText(params.playerName)
        ? { search_by: 'Name', filter: params.playerName }
        : hasText(params.playerExternalId)
          ? { search_by: 'External Id', filter: params.playerExternalId }
          : {};
    return this.request('list competitions', 'get', '/list_competitions', {
      params: pickDefined({
        ...playerFilter,
        competition_id: params.competitionId,
        accesskey: params.accessKey
      })
    });
  }

  async listCompetitionPlayers(competitionId: string) {
    requireText(competitionId, 'Competition ID');
    return this.request(
      'list competition players',
      'get',
      `/competitions/${encodeURIComponent(competitionId)}/players`,
      { v2: true }
    );
  }
}
