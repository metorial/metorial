import { Slate } from 'slates';
import { spec } from './spec';
import {
  analyzeDomain,
  batchAnalyze,
  getAnchors,
  getBacklinks,
  getBrandRadar,
  getDomainHistory,
  getKeywordIdeas,
  getLinkedDomains,
  getMetricsByCountry,
  getOrganicCompetitors,
  getOrganicKeywords,
  getRankTrackerData,
  getReferringDomains,
  getSerpOverview,
  getSiteAudit,
  getTopPages,
  manageRankTracker,
  researchKeywords
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    analyzeDomain,
    getBacklinks,
    getReferringDomains,
    getOrganicKeywords,
    getTopPages,
    getAnchors,
    getOrganicCompetitors,
    getDomainHistory,
    researchKeywords,
    getKeywordIdeas,
    getSerpOverview,
    getRankTrackerData,
    getSiteAudit,
    getBrandRadar,
    batchAnalyze,
    manageRankTracker,
    getLinkedDomains,
    getMetricsByCountry
  ],
  triggers: [inboundWebhook]
});
