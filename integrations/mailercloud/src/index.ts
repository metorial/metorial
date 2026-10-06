import { Slate } from 'slates';
import { spec } from './spec';
import {
  createCampaign,
  createContact,
  createList,
  getAccountPlan,
  listProperties,
  manageProperty,
  manageWebhook,
  searchContacts,
  searchLists,
  updateContact
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    createContact,
    updateContact,
    searchContacts,
    createList,
    searchLists,
    listProperties,
    manageProperty,
    createCampaign,
    getAccountPlan,
    manageWebhook
  ],
  triggers: []
});
