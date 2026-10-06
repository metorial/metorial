import { Slate } from 'slates';
import { spec } from './spec';
import {
  checkLinkStatusTool,
  findLinkIntersectTool,
  getAnchorTextTool,
  getGlobalTopTool,
  getKeywordMetricsTool,
  getKeywordSuggestionsTool,
  getLinkingDomainsTool,
  getLinksTool,
  getRankingKeywordsTool,
  getSearchIntentTool,
  getSiteMetricsTool,
  getTopPagesTool,
  getUrlMetricsTool,
  getUsageAndIndexTool
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getUrlMetricsTool,
    getLinksTool,
    getAnchorTextTool,
    getLinkingDomainsTool,
    getTopPagesTool,
    getGlobalTopTool,
    getKeywordMetricsTool,
    getKeywordSuggestionsTool,
    getSearchIntentTool,
    getSiteMetricsTool,
    getRankingKeywordsTool,
    findLinkIntersectTool,
    checkLinkStatusTool,
    getUsageAndIndexTool
  ],
  triggers: []
});
