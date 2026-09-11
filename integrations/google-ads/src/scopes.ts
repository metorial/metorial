import { anyOf } from 'slates';

export let googleAdsScopes = {
  adwords: 'https://www.googleapis.com/auth/adwords',
  userInfoEmail: 'https://www.googleapis.com/auth/userinfo.email',
  userInfoProfile: 'https://www.googleapis.com/auth/userinfo.profile'
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
