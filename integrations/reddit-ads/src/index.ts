import { Slate } from 'slates';
import { spec } from './spec';
import {
  getAccountInfo,
  getPerformanceReport,
  listAdGroups,
  listAds,
  listCampaigns,
  listCustomAudiences,
  manageAd,
  manageAdGroup,
  manageAudienceUsers,
  manageCampaign,
  manageCustomAudience,
  sendConversionEvents
} from './tools';
import { campaignStatusChange, inboundWebhook } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    getAccountInfo,
    listCampaigns,
    manageCampaign,
    listAdGroups,
    manageAdGroup,
    listAds,
    manageAd,
    getPerformanceReport,
    listCustomAudiences,
    manageCustomAudience,
    manageAudienceUsers,
    sendConversionEvents
  ],
  triggers: [inboundWebhook, campaignStatusChange]
});
