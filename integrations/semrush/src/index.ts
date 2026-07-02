import { Slate } from 'slates';
import { spec } from './spec';
import {
  analyzeBacklinks,
  analyzeTraffic,
  compareDomains,
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

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
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
  triggers: [inboundWebhook]
});
