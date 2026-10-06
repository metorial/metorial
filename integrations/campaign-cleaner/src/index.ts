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
  triggers: []
});
