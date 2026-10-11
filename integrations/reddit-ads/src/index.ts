import { Slate } from 'slates';
import { spec } from './spec';
import {
  deleteCustomAudience,
  getAccountInfo,
  getPerformanceReport,
  getResource,
  listAdAccounts,
  listAdGroups,
  listAds,
  listCampaigns,
  listCustomAudiences,
  listPixels,
  listPosts,
  listTargetingOptions,
  manageAd,
  manageAdGroup,
  manageAudienceUsers,
  manageCampaign,
  manageCustomAudience,
  sendConversionEvents
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getAccountInfo,
    listAdAccounts,
    listPixels,
    getResource,
    deleteCustomAudience,
    listCampaigns,
    manageCampaign,
    listTargetingOptions,
    listAdGroups,
    manageAdGroup,
    listAds,
    listPosts,
    manageAd,
    getPerformanceReport,
    listCustomAudiences,
    manageCustomAudience,
    manageAudienceUsers,
    sendConversionEvents
  ],
  triggers: []
});
