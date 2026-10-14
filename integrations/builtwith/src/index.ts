import { Slate } from 'slates';
import { spec } from './spec';
import {
  checkTrust,
  findRelationships,
  freeLookup,
  getDomainTags,
  getFinancialData,
  getKeywords,
  getRecommendations,
  getRedirects,
  getTechnologyChanges,
  getTechnologyTrends,
  listTechnologySites,
  liveDomainDetection,
  lookupDomain,
  resolveCompanyUrl,
  searchKeywordSites,
  searchProducts
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    lookupDomain,
    liveDomainDetection,
    listTechnologySites,
    findRelationships,
    getTechnologyTrends,
    resolveCompanyUrl,
    getKeywords,
    checkTrust,
    getRedirects,
    getRecommendations,
    searchProducts,
    getDomainTags,
    freeLookup,
    getFinancialData,
    getTechnologyChanges,
    searchKeywordSites
  ] as any,
  triggers: []
});
