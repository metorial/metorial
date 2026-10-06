import { Slate } from 'slates';
import { spec } from './spec';
import {
  findEmail,
  findPhone,
  getCampaignStatistics,
  listEmailCampaigns,
  manageAdvancedCampaign,
  manageBlacklist,
  manageCampaignContacts,
  manageEmailCampaign,
  manageEmailProviders,
  manageLinkedInCampaign,
  manageLinkedInScraper,
  manageWebhooks,
  sendReply,
  sendTestEmail,
  updateEmailCampaign,
  verifyEmail
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listEmailCampaigns,
    manageEmailCampaign,
    updateEmailCampaign,
    getCampaignStatistics,
    manageCampaignContacts,
    manageLinkedInCampaign,
    manageAdvancedCampaign,
    findEmail,
    findPhone,
    verifyEmail,
    manageEmailProviders,
    manageBlacklist,
    sendReply,
    sendTestEmail,
    manageLinkedInScraper,
    manageWebhooks
  ],
  triggers: []
});
