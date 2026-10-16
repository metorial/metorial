import { Slate } from 'slates';
import { spec } from './spec';
import {
  analyzeKeywords,
  getGoogleShoppingStatus,
  getTikTokAd,
  getTikTokAdDetails,
  lookupGoogleAds,
  lookupGoogleShoppingAds,
  lookupLinkedInAds,
  lookupMetaAds,
  searchMetaAds,
  searchTikTokAds,
  submitGoogleShoppingSearch
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    lookupMetaAds,
    searchMetaAds,
    lookupLinkedInAds,
    lookupGoogleAds,
    lookupGoogleShoppingAds,
    searchTikTokAds,
    getTikTokAdDetails,
    getTikTokAd,
    getGoogleShoppingStatus,
    submitGoogleShoppingSearch,
    analyzeKeywords
  ],
  triggers: []
});
