import { Slate } from 'slates';
import { spec } from './spec';
import {
  cleanCampaign,
  createInboxTest,
  deleteCampaign,
  getCampaign,
  getCampaignPdf,
  getCampaignStatus,
  getCredits,
  getInboxTestResults,
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
    getCampaignPdf,
    createInboxTest,
    getInboxTestResults
  ],
  triggers: []
});
