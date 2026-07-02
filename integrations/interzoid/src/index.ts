import { Slate } from 'slates';
import { spec } from './spec';
import {
  businessIntelligence,
  classifyData,
  companyInsights,
  contactIntelligence,
  customDataEnrichment,
  generateSimilarityKey,
  getCurrencyRate,
  getRemainingCredits,
  getWeather,
  matchScore,
  pagePerformance,
  parseAddress,
  standardizeData,
  stockAnalysis,
  translateText
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    generateSimilarityKey,
    matchScore,
    customDataEnrichment,
    businessIntelligence,
    companyInsights,
    contactIntelligence,
    standardizeData,
    classifyData,
    translateText,
    parseAddress,
    getWeather,
    getCurrencyRate,
    pagePerformance,
    getRemainingCredits,
    stockAnalysis
  ],
  triggers: [inboundWebhook]
});
