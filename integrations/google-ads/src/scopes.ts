import { anyOf } from 'slates';

export let googleAdsScopes = {
  adwords: 'https://www.googleapis.com/auth/adwords'
} as const;

let adwordsAccess = anyOf(googleAdsScopes.adwords);

export let googleAdsActionScopes = {
  listAccounts: adwordsAccess,
  searchReports: adwordsAccess,
  manageCampaigns: adwordsAccess,
  manageAdGroups: adwordsAccess,
  manageAds: adwordsAccess,
  manageKeywords: adwordsAccess,
  manageBiddingStrategies: adwordsAccess,
  manageConversionActions: adwordsAccess,
  generateKeywordIdeas: adwordsAccess,
  uploadOfflineConversions: adwordsAccess,
  manageAudienceLists: adwordsAccess,
  leadFormSubmit: adwordsAccess
} as const;
