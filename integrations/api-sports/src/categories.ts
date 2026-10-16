import { toolCategory } from 'slates';
import {
  getCoachesTool,
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
  getPredictionsTool,
  getTransfersTool
} from './tools';

export const toolCategories = [
  toolCategory({
    key: 'football',
    name: 'Football',
    description:
      'Football match details, predictions, injuries, coaches, transfers, squads and scoring leaders.',
    tools: [
      getMatchDetailsTool,
      getPredictionsTool,
      getInjuriesTool,
      getTransfersTool,
      getCoachesTool,
      getFootballSquadsTool,
      getFootballTopScorersTool
    ]
  }),
  toolCategory({
    key: 'nba',
    name: 'NBA',
    description:
      'NBA league variants, standings, team season totals and player game statistics.',
    tools: [
      getNbaLeaguesTool,
      getNbaStandingsTool,
      getNbaTeamStatisticsTool,
      getNbaPlayerStatisticsTool
    ]
  }),
  toolCategory({
    key: 'mma',
    name: 'MMA',
    description: 'MMA fight results and fighter performance statistics.',
    tools: [getMmaFightResultsTool, getMmaFighterStatisticsTool]
  })
];
