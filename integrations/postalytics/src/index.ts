import { Slate } from 'slates';
import { spec } from './spec';
import {
  createLoginLink,
  getCampaignEvents,
  manageAccount,
  manageCampaigns,
  manageContacts,
  manageFlows,
  manageSuppressionLists,
  manageTemplates,
  manageWebhooks,
  sendMail
} from './tools';
import { mailEvent } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
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
  triggers: [mailEvent]
});
