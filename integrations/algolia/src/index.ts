import { Slate } from 'slates';
import { spec } from './spec';
import {
  getRecommendations,
  indexSettings,
  manageAbTests,
  manageApiKeys,
  manageIndices,
  manageRecords,
  manageRules,
  manageSynonyms,
  monitoring,
  search,
  searchAnalytics,
  sendEvents
} from './tools';
import { inboundWebhook, indexUpdated } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    search,
    manageRecords,
    manageIndices,
    indexSettings,
    manageSynonyms,
    manageRules,
    searchAnalytics,
    sendEvents,
    manageApiKeys,
    manageAbTests,
    getRecommendations,
    monitoring
  ],
  triggers: [inboundWebhook, indexUpdated]
});
