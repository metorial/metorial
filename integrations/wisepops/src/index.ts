import { Slate } from 'slates';
import { spec } from './spec';
import {
  createWebhook,
  deleteUserData,
  deleteWebhook,
  exportContacts,
  listCampaigns,
  listContacts,
  listWebhooks
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listContacts,
    exportContacts,
    listCampaigns,
    listWebhooks,
    createWebhook,
    deleteWebhook,
    deleteUserData
  ],
  triggers: []
});
