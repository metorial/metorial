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
  manageLists,
  manageWebhooks,
  sendReply,
  sendTestEmail,
  updateAdvancedCampaign,
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
    updateAdvancedCampaign,
    manageLists,
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
