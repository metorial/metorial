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
  getTechnologyTrends,
  listTechnologySites,
  liveDomainDetection,
  lookupDomain,
  resolveCompanyUrl,
  searchProducts
} from './tools';
import { inboundWebhook, newTechnologyDetection } from './triggers';

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
    getFinancialData
  ] as any,
  triggers: [inboundWebhook, newTechnologyDetection] as any
});
