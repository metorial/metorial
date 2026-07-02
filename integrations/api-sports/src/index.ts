import { Slate } from 'slates';
import { spec } from './spec';
import {
  getCoachesTool,
  getCountriesTool,
  getFixturesTool,
  getInjuriesTool,
  getMatchDetailsTool,
  getOddsTool,
  getPlayerStatsTool,
  getPredictionsTool,
  getStandingsTool,
  getTeamStatisticsTool,
  getTransfersTool,
  searchLeaguesTool,
  searchTeamsTool
} from './tools';
import { fixtureResultsTrigger, fixtureStatusChangeTrigger, inboundWebhook } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
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
  triggers: [inboundWebhook, fixtureStatusChangeTrigger, fixtureResultsTrigger]
});
