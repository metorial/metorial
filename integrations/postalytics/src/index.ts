import { Slate } from 'slates';
import { spec } from './spec';
import {
  createCampaign,
  createLoginLink,
  getCampaignEvents,
  manageAccount,
  manageCampaigns,
  manageContacts,
  manageFlows,
  manageSuppressionLists,
  manageTemplates,
  manageWebhooks,
  sendMail,
  whoAmI
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    whoAmI,
    createCampaign,
    sendMail,
    manageContacts,
    manageCampaigns,
    manageTemplates,
    manageFlows,
    getCampaignEvents,
    manageWebhooks,
    manageAccount,
    manageSuppressionLists,
    createLoginLink
  ],
  triggers: []
});
