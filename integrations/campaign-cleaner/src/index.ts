import { Slate } from 'slates';
import { spec } from './spec';
import {
  cleanCampaign,
  deleteCampaign,
  getCampaign,
  getCampaignPdf,
  getCampaignStatus,
  getCredits,
  listCampaigns
} from './tools';
import { campaignCompleted, inboundWebhook } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    cleanCampaign,
    getCampaign,
    getCampaignStatus,
    listCampaigns,
    deleteCampaign,
    getCredits,
    getCampaignPdf
  ],
  triggers: [inboundWebhook, campaignCompleted]
});
