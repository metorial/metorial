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
  getTaskResult,
  googleShoppingSearch,
  keywordResearch,
  keywordSuggestions,
  keywordsForSite,
  onPageAudit,
  onPageResults,
  rankedKeywords,
  serpSearch
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    serpSearch,
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
