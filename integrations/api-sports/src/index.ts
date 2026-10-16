import { Slate } from 'slates';
import { toolCategories } from './categories';
import { spec } from './spec';
import {
  getAccountStatusTool,
  getCoachesTool,
  getCountriesTool,
  getFixturesTool,
  getFootballSquadsTool,
  getFootballTopScorersTool,
  getInjuriesTool,
  getMatchDetailsTool,
  getMmaFighterStatisticsTool,
  getMmaFightResultsTool,
  getNbaLeaguesTool,
  getNbaPlayerStatisticsTool,
  getNbaStandingsTool,
  getNbaTeamStatisticsTool,
  getOddsTool,
  getPlayerStatsTool,
  getPredictionsTool,
  getSeasonsTool,
  getStandingsTool,
  getTeamStatisticsTool,
  getTransfersTool,
  searchLeaguesTool,
  searchTeamsTool
} from './tools';
export let provider = Slate.create({
  spec,
  toolCategories,
  tools: [
    getAccountStatusTool,
    getSeasonsTool,
    getFootballSquadsTool,
    getFootballTopScorersTool,
    getNbaLeaguesTool,
    getNbaStandingsTool,
    getNbaTeamStatisticsTool,
    getNbaPlayerStatisticsTool,
    getMmaFightResultsTool,
    getMmaFighterStatisticsTool,
    searchLeaguesTool,
    searchTeamsTool,
    getFixturesTool,
    getStandingsTool,
    getMatchDetailsTool,
    getPlayerStatsTool,
    getOddsTool,
    getPredictionsTool,
    getInjuriesTool,
    getTeamStatisticsTool,
    getTransfersTool,
    getCoachesTool,
    getCountriesTool
  ],
  triggers: []
});
