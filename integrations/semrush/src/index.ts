import { Slate } from 'slates';
import { spec } from './spec';
import {
  analyzeBacklinks,
  analyzeTraffic,
  compareDomains,
  getApiUnitBalance,
  getDomainCompetitors,
  getDomainKeywords,
  getDomainOverview,
  getMapRankings,
  manageListing,
  managePositionTracking,
  manageProject,
  manageSiteAudit,
  researchKeyword
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    getApiUnitBalance,
    getDomainOverview,
    getDomainKeywords,
    getDomainCompetitors,
    compareDomains,
    researchKeyword,
    analyzeBacklinks,
    analyzeTraffic,
    manageProject,
    managePositionTracking,
    manageSiteAudit,
    manageListing,
    getMapRankings
  ],
  triggers: []
});
