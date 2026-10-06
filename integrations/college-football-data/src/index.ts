import { Slate } from 'slates';
import { spec } from './spec';
import {
  getAdjustedMetrics,
  getBettingLines,
  getCoaches,
  getConferencesVenues,
  getDraftPicks,
  getGameStats,
  getGames,
  getLiveScoreboard,
  getMatchupHistory,
  getPlayerStats,
  getPlays,
  getRankingsRatings,
  getRecruiting,
  getTeamInfo,
  getTeamStats,
  getTransferPortal,
  getWinProbability,
  searchPlayers
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getGames,
    getGameStats,
    getTeamInfo,
    getMatchupHistory,
    searchPlayers,
    getTeamStats,
    getPlayerStats,
    getRankingsRatings,
    getRecruiting,
    getBettingLines,
    getPlays,
    getWinProbability,
    getCoaches,
    getDraftPicks,
    getConferencesVenues,
    getTransferPortal,
    getLiveScoreboard,
    getAdjustedMetrics
  ],
  triggers: []
});
