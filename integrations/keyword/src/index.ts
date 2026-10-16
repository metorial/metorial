import { Slate } from 'slates';
import { spec } from './spec';
import {
  getAiCitations,
  getAiDomain,
  getAiMetrics,
  getAiSearchTerms,
  getAiSentiment,
  getKeywordCompetitors,
  getKeywordMetrics,
  getKeywordRankings,
  getProject,
  getProjectRegions,
  getShareOfVoice,
  listAiDomains,
  listKeywords,
  listProjects,
  manageKeywords,
  manageProject,
  refreshKeywords,
  updateKeyword,
  whoAmI
} from './tools';

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
    getAiCitations,
    getAiDomain,
    getProject,
    getKeywordCompetitors,
    getShareOfVoice,
    updateKeyword,
    whoAmI
  ],
  triggers: []
});
