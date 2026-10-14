import { Slate } from 'slates';
import { spec } from './spec';
import {
  aiOptimization,
  amazonProductSearch,
  appData,
  backlinksAnalysis,
  businessData,
  contentAnalysis,
  domainAnalytics,
  domainCompetitors,
  domainIntersection,
  getCurrentUser,
  getTaskResult,
  googleShoppingSearch,
  keywordResearch,
  keywordSuggestions,
  keywordsForSite,
  listSerpLocations,
  onPageAudit,
  onPageResults,
  rankedKeywords,
  serpSearch
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    serpSearch,
    getCurrentUser,
    listSerpLocations,
    keywordResearch,
    keywordsForSite,
    keywordSuggestions,
    backlinksAnalysis,
    domainAnalytics,
    domainCompetitors,
    domainIntersection,
    rankedKeywords,
    onPageAudit,
    onPageResults,
    contentAnalysis,
    googleShoppingSearch,
    amazonProductSearch,
    appData,
    businessData,
    aiOptimization,
    getTaskResult
  ],
  triggers: []
});
