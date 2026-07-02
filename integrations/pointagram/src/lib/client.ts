import { createAxios } from 'slates';

let BASE_URL = 'https://app.pointagram.com/server/externalapi.php';

export class PointagramClient {
  private token: string;
  private apiUser: string;
  private http: ReturnType<typeof createAxios>;

  constructor(config: { token: string; apiUser: string }) {
    this.token = config.token;
    this.apiUser = config.apiUser;
    this.http = createAxios({
      baseURL: BASE_URL
    });
  }

  private getHeaders() {
    return {
      api_key: this.token,
      api_user: this.apiUser,
      'Content-Type': 'application/json'
    };
  }

  // ── Players ──────────────────────────────────────────────

  async createPlayer(params: {
    playerName: string;
    playerEmail?: string;
    playerExternalId?: string;
    offline?: boolean;
  }) {
    let body: Record<string, unknown> = {
      player_name: params.playerName
    };
    if (params.playerEmail) body.player_email = params.playerEmail;
    if (params.playerExternalId) body.player_external_id = params.playerExternalId;
    if (params.offline !== undefined) body.offline = params.offline ? 1 : 0;

    let response = await this.http.post('/create_player', body, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async listPlayers() {
    let response = await this.http.get('/list_players', {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async removePlayer(params: {
    playerName?: string;
    playerEmail?: string;
    playerExternalId?: string;
  }) {
    let body: Record<string, unknown> = {};
    if (params.playerName) body.player_name = params.playerName;
    if (params.playerEmail) body.player_email = params.playerEmail;
    if (params.playerExternalId) body.player_external_id = params.playerExternalId;

    let response = await this.http.post('/remove_player', body, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  // ── Teams ────────────────────────────────────────────────

  async createTeam(params: { teamName: string; icon: string; filterIgnore?: boolean }) {
    let body: Record<string, unknown> = {
      team_name: params.teamName,
      icon: params.icon
    };
    if (params.filterIgnore !== undefined) body.filter_ignore = params.filterIgnore ? 1 : 0;

    let response = await this.http.post('/add_team', body, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async listTeams() {
    let response = await this.http.get('/list_teams', {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async addPlayerToTeam(params: {
    teamId: string;
    playerName?: string;
    playerEmail?: string;
    playerExternalId?: string;
    playerId?: string;
  }) {
    let body: Record<string, unknown> = {
      team_id: params.teamId
    };
    if (params.playerName) body.player_name = params.playerName;
    if (params.playerEmail) body.player_email = params.playerEmail;
    if (params.playerExternalId) body.player_external_id = params.playerExternalId;
    if (params.playerId) body.playerid = params.playerId;

    let response = await this.http.post('/add_to_team', body, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async removePlayerFromTeam(params: {
    teamId: string;
    playerName?: string;
    playerEmail?: string;
    playerExternalId?: string;
    playerId?: string;
  }) {
    let body: Record<string, unknown> = {
      team_id: params.teamId
    };
    if (params.playerName) body.player_name = params.playerName;
    if (params.playerEmail) body.player_email = params.playerEmail;
    if (params.playerExternalId) body.player_external_id = params.playerExternalId;
    if (params.playerId) body.playerid = params.playerId;

    let response = await this.http.post('/remove_from_team', body, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  // ── Scores ───────────────────────────────────────────────

  async addScore(params: {
    scoreseriesId?: string;
    scoreseriesName?: string;
    points?: number;
    pointtypeName?: string;
    playerName?: string;
    playerEmail?: string;
    playerExternalId?: string;
    playerId?: string;
    sourceScoreId?: string;
    comment?: string;
    scoreTime?: string;
    tags?: Array<{ name: string }>;
    createPlayer?: boolean;
  }) {
    let body: Record<string, unknown> = {};

    if (params.scoreseriesId) body.scoreseries_id = params.scoreseriesId;
    if (params.scoreseriesName) body.scoreseries_name = params.scoreseriesName;
    if (params.points !== undefined) body.points = params.points;
    if (params.pointtypeName) body.pointtype_name = params.pointtypeName;
    if (params.playerName) body.player_name = params.playerName;
    if (params.playerEmail) body.player_email = params.playerEmail;
    if (params.playerExternalId) body.player_external_id = params.playerExternalId;
    if (params.playerId) body.playerid = params.playerId;
    if (params.sourceScoreId) body.source_score_id = params.sourceScoreId;
    if (params.comment) body.comment = params.comment;
    if (params.scoreTime) body.score_time = params.scoreTime;
    if (params.tags) body.tags = params.tags;
    if (params.createPlayer) body.create_player = 1;

    let response = await this.http.post('/add_score', body, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async listScoreSeries() {
    let response = await this.http.get('/list_score_series', {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async listScoreSeriesPointTypes(scoreseriesId: string) {
    let response = await this.http.get('/list_score_series_point_types', {
      headers: this.getHeaders(),
      params: { scoreseries: scoreseriesId }
    });
    return response.data;
  }

  async listScoreSeriesHistory(params: {
    scoreseriesId: string;
    tagsFilter?: string;
    teamsFilter?: string;
    playerFilter?: string;
    timeFrom?: string;
    offsetTimestamp?: string;
    offsetId?: string;
  }) {
    let queryParams: Record<string, string> = {
      scoreseriesid: params.scoreseriesId
    };
    if (params.tagsFilter) queryParams.tags_filter = params.tagsFilter;
    if (params.teamsFilter) queryParams.teams_filter = params.teamsFilter;
    if (params.playerFilter) queryParams.player_filter = params.playerFilter;
    if (params.timeFrom) queryParams.time_from = params.timeFrom;
    if (params.offsetTimestamp) queryParams.offset_timestamp = params.offsetTimestamp;
    if (params.offsetId) queryParams.offset_id = params.offsetId;

    let response = await this.http.get('/list_score_series_history', {
      headers: this.getHeaders(),
      params: queryParams
    });
    return response.data;
  }

  // ── Competitions ─────────────────────────────────────────

  async listCompetitions(params?: {
    playerEmail?: string;
    playerName?: string;
    playerExternalId?: string;
    competitionId?: string;
    accessKey?: string;
  }) {
    let queryParams: Record<string, string> = {};
    if (params?.playerEmail) queryParams.player_email = params.playerEmail;
    if (params?.playerName) queryParams.player_name = params.playerName;
    if (params?.playerExternalId) queryParams.player_external_id = params.playerExternalId;
    if (params?.competitionId) queryParams.competition_id = params.competitionId;
    if (params?.accessKey) queryParams.access_key = params.accessKey;

    let response = await this.http.get('/list_competitions', {
      headers: this.getHeaders(),
      params: queryParams
    });
    return response.data;
  }

  async listCompetitionPlayers(params?: {
    competitionId?: string;
    playerEmail?: string;
    playerName?: string;
    playerExternalId?: string;
  }) {
    let queryParams: Record<string, string> = {};
    if (params?.competitionId) queryParams.competition_id = params.competitionId;
    if (params?.playerEmail) queryParams.player_email = params.playerEmail;
    if (params?.playerName) queryParams.player_name = params.playerName;
    if (params?.playerExternalId) queryParams.player_external_id = params.playerExternalId;

    let response = await this.http.get('/list_competition_players', {
      headers: this.getHeaders(),
      params: queryParams
    });
    return response.data;
  }
}
