import { Slate } from 'slates';
import { spec } from './spec';
import {
  addressAndFullNameMatch,
  businessIntelligence,
  classifyData,
  companyAndAddressMatch,
  companyAndFullNameMatch,
  companyInsights,
  contactIntelligence,
  customDataEnrichment,
  generateSimilarityKey,
  getCountryInfo,
  getCurrencyRate,
  getOrganizationStandard,
  getParentCompanyInfo,
  getRemainingCredits,
  getWeather,
  matchScore,
  pagePerformance,
  parseAddress,
  standardizeData,
  stockAnalysis,
  translateText
} from './tools';

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
    stockAnalysis,
    addressAndFullNameMatch,
    companyAndAddressMatch,
    companyAndFullNameMatch,
    getCountryInfo,
    getOrganizationStandard,
    getParentCompanyInfo
  ],
  triggers: []
});
