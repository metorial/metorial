import { Slate } from 'slates';
import { spec } from './spec';
import {
  createWebhook,
  deleteUserData,
  deleteWebhook,
  listCampaigns,
  listContacts,
  listWebhooks
} from './tools';
import { formSubmission } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listContacts,
    listCampaigns,
    listWebhooks,
    createWebhook,
    deleteWebhook,
    deleteUserData
  ],
  triggers: [formSubmission]
});
