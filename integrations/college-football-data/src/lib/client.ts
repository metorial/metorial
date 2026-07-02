import { createAxios } from 'slates';

export class Client {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.collegefootballdata.com',
      headers: {
        Authorization: `Bearer ${config.token}`
      }
    });
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
  }) {
    let response = await this.axios.get('/games', {
      params: { ...params, id: params.gameId }
    });
    return response.data;
  }

  async getGameTeamStats(gameId: number) {
    let response = await this.axios.get(`/games/${gameId}/teams`);
    return response.data;
  }

  async getGamePlayerStats(gameId: number) {
    let response = await this.axios.get(`/games/${gameId}/players`);
    return response.data;
  }

  async getGameWeather(params: {
    year: number;
    week?: number;
    team?: string;
    conference?: string;
    seasonType?: string;
  }) {
    let response = await this.axios.get(`/games/weather`, { params });
    return response.data;
  }

  async getGameMedia(params: {
    year: number;
    week?: number;
    team?: string;
    conference?: string;
    seasonType?: string;
  }) {
    let response = await this.axios.get('/games/media', { params });
    return response.data;
  }

  async getCalendar(params: { year: number; seasonType?: string }) {
    let response = await this.axios.get('/calendar', { params });
    return response.data;
  }

  async getScoreboard() {
    let response = await this.axios.get('/live/scoreboard');
    return response.data;
  }

  async getLiveGame(gameId: number) {
    let response = await this.axios.get(`/live/games/${gameId}`);
    return response.data;
  }

  // ---- Teams ----

  async getTeams(params?: { conference?: string; year?: number }) {
    let response = await this.axios.get('/teams', { params });
    return response.data;
  }

  async getFbsTeams(params?: { year?: number }) {
    let response = await this.axios.get('/teams/fbs', { params });
    return response.data;
  }

  async getMatchup(params: {
    team1: string;
    team2: string;
    minYear?: number;
    maxYear?: number;
  }) {
    let response = await this.axios.get('/teams/matchup', { params });
    return response.data;
  }

  async getTeamATS(params: { year: number; conference?: string; team?: string }) {
    let response = await this.axios.get('/teams/ats', { params });
    return response.data;
  }

  async getRoster(params?: { team?: string; year?: number; classification?: string }) {
    let response = await this.axios.get('/roster', { params });
    return response.data;
  }

  async getTalent(params: { year: number }) {
    let response = await this.axios.get('/talent', { params });
    return response.data;
  }

  async getRecords(params?: { year?: number; team?: string; conference?: string }) {
    let response = await this.axios.get('/records', { params });
    return response.data;
  }

  // ---- Conferences & Venues ----

  async getConferences() {
    let response = await this.axios.get('/conferences');
    return response.data;
  }

  async getVenues() {
    let response = await this.axios.get('/venues');
    return response.data;
  }

  // ---- Players ----

  async searchPlayers(params: {
    searchTerm: string;
    year?: number;
    team?: string;
    limit?: number;
  }) {
    let response = await this.axios.get('/player/search', { params });
    return response.data;
  }

  async getPlayerUsage(params: {
    year: number;
    team?: string;
    conference?: string;
    position?: string;
    playerId?: number;
    excludeGarbageTime?: boolean;
  }) {
    let response = await this.axios.get('/player/usage', { params });
    return response.data;
  }

  async getReturningProduction(params?: {
    year?: number;
    team?: string;
    conference?: string;
  }) {
    let response = await this.axios.get('/player/returning', { params });
    return response.data;
  }

  async getTransferPortal(params: { year: number }) {
    let response = await this.axios.get('/player/transfer', { params });
    return response.data;
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
    let response = await this.axios.get('/stats/player/season', { params });
    return response.data;
  }

  async getTeamSeasonStats(params?: {
    year?: number;
    team?: string;
    conference?: string;
    startWeek?: number;
    endWeek?: number;
  }) {
    let response = await this.axios.get('/stats/season', { params });
    return response.data;
  }

  async getStatCategories() {
    let response = await this.axios.get('/stats/categories');
    return response.data;
  }

  async getAdvancedSeasonStats(params?: {
    year?: number;
    team?: string;
    excludeGarbageTime?: boolean;
    startWeek?: number;
    endWeek?: number;
  }) {
    let response = await this.axios.get('/stats/season/advanced', { params });
    return response.data;
  }

  async getAdvancedGameStats(params?: {
    year?: number;
    team?: string;
    week?: number;
    opponent?: string;
    excludeGarbageTime?: boolean;
    seasonType?: string;
  }) {
    let response = await this.axios.get('/stats/game/advanced', { params });
    return response.data;
  }

  // ---- Recruiting ----

  async getRecruits(params?: {
    year?: number;
    team?: string;
    position?: string;
    state?: string;
    classification?: string;
  }) {
    let response = await this.axios.get('/recruiting/players', { params });
    return response.data;
  }

  async getTeamRecruitingRankings(params?: { year?: number; team?: string }) {
    let response = await this.axios.get('/recruiting/teams', { params });
    return response.data;
  }

  async getRecruitingGroups(params?: {
    team?: string;
    conference?: string;
    recruitType?: string;
    startYear?: number;
    endYear?: number;
  }) {
    let response = await this.axios.get('/recruiting/groups', { params });
    return response.data;
  }

  // ---- Ratings & Rankings ----

  async getSPRatings(params?: { year?: number; team?: string }) {
    let response = await this.axios.get('/ratings/sp', { params });
    return response.data;
  }

  async getConferenceSPRatings(params?: { year?: number; conference?: string }) {
    let response = await this.axios.get('/ratings/sp/conferences', { params });
    return response.data;
  }

  async getSRSRatings(params?: { year?: number; team?: string; conference?: string }) {
    let response = await this.axios.get('/ratings/srs', { params });
    return response.data;
  }

  async getEloRatings(params?: {
    year?: number;
    week?: number;
    seasonType?: string;
    team?: string;
    conference?: string;
  }) {
    let response = await this.axios.get('/ratings/elo', { params });
    return response.data;
  }

  async getFPIRatings(params?: { year?: number; team?: string; conference?: string }) {
    let response = await this.axios.get('/ratings/fpi', { params });
    return response.data;
  }

  async getRankings(params: { year: number; seasonType?: string; week?: number }) {
    let response = await this.axios.get('/rankings', { params });
    return response.data;
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
    let response = await this.axios.get('/plays', { params });
    return response.data;
  }

  async getPlayTypes() {
    let response = await this.axios.get('/plays/types');
    return response.data;
  }

  async getPlayStats(params?: {
    year?: number;
    week?: number;
    team?: string;
    gameId?: number;
  }) {
    let response = await this.axios.get('/plays/stats', { params });
    return response.data;
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
    let response = await this.axios.get('/drives', { params });
    return response.data;
  }

  // ---- PPA & Win Probability ----

  async getPredictedPoints() {
    let response = await this.axios.get('/ppa/predicted/points');
    return response.data;
  }

  async getTeamSeasonPPA(params?: {
    year?: number;
    team?: string;
    conference?: string;
    excludeGarbageTime?: boolean;
  }) {
    let response = await this.axios.get('/ppa/season', { params });
    return response.data;
  }

  async getTeamGamePPA(params: {
    year: number;
    week: number;
    team?: string;
    conference?: string;
    excludeGarbageTime?: boolean;
  }) {
    let response = await this.axios.get('/ppa/game', { params });
    return response.data;
  }

  async getPlayerSeasonPPA(params?: {
    year?: number;
    team?: string;
    conference?: string;
    position?: string;
    playerId?: number;
    threshold?: string;
    excludeGarbageTime?: boolean;
  }) {
    let response = await this.axios.get('/ppa/players/season', { params });
    return response.data;
  }

  async getPlayerGamePPA(params?: {
    year?: number;
    week?: number;
    team?: string;
    position?: string;
    playerId?: number;
    threshold?: string;
    seasonType?: string;
    excludeGarbageTime?: boolean;
  }) {
    let response = await this.axios.get('/ppa/players/game', { params });
    return response.data;
  }

  async getWinProbability(params: { gameId: number }) {
    let response = await this.axios.get('/metrics/wp', { params });
    return response.data;
  }

  async getPregameWinProbability(params: {
    year?: number;
    week?: number;
    seasonType?: string;
    team?: string;
  }) {
    let response = await this.axios.get('/metrics/wp/pregame', { params });
    return response.data;
  }

  async getFieldGoalExpectedPoints() {
    let response = await this.axios.get('/metrics/fg/ep');
    return response.data;
  }

  // ---- Betting ----

  async getBettingLines(params?: {
    year?: number;
    week?: number;
    team?: string;
    conference?: string;
    seasonType?: string;
    gameId?: number;
  }) {
    let response = await this.axios.get('/games/betting', { params });
    return response.data;
  }

  // ---- Adjusted Metrics ----

  async getAdjustedTeamSeasonMetrics(params?: {
    year?: number;
    team?: string;
    conference?: string;
  }) {
    let response = await this.axios.get('/wepa/team/season', { params });
    return response.data;
  }

  async getAdjustedPlayerPassing(params?: {
    year?: number;
    team?: string;
    conference?: string;
    position?: string;
  }) {
    let response = await this.axios.get('/wepa/players/passing', { params });
    return response.data;
  }

  async getAdjustedPlayerRushing(params?: {
    year?: number;
    team?: string;
    conference?: string;
    position?: string;
  }) {
    let response = await this.axios.get('/wepa/players/rushing', { params });
    return response.data;
  }

  async getKickerPAARRatings(params?: { year?: number; team?: string; conference?: string }) {
    let response = await this.axios.get('/wepa/players/kicking', { params });
    return response.data;
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
    let response = await this.axios.get('/coaches', { params });
    return response.data;
  }

  // ---- Draft ----

  async getDraftPicks(params?: {
    year?: number;
    nflTeam?: string;
    college?: string;
    position?: string;
  }) {
    let response = await this.axios.get('/draft/picks', { params });
    return response.data;
  }

  // ---- Advanced Box Score ----

  async getAdvancedBoxScore(gameId: number) {
    let response = await this.axios.get(`/game/${gameId}/box/advanced`);
    return response.data;
  }
}
