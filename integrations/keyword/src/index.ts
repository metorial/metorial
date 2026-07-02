import { Slate } from 'slates';
import { spec } from './spec';
import {
  getAiCitations,
  getAiMetrics,
  getAiSearchTerms,
  getAiSentiment,
  getKeywordMetrics,
  getKeywordRankings,
  getProjectRegions,
  listAiDomains,
  listKeywords,
  listProjects,
  manageKeywords,
  manageProject,
  refreshKeywords
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    listProjects,
    manageProject,
    listKeywords,
    manageKeywords,
    getKeywordRankings,
    getKeywordMetrics,
    refreshKeywords,
    getProjectRegions,
    listAiDomains,
    getAiSearchTerms,
    getAiMetrics,
    getAiSentiment,
    getAiCitations
  ],
  triggers: [inboundWebhook]
});
