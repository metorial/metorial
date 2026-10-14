import { Slate } from 'slates';
import { spec } from './spec';
import {
  createCampaign,
  createContact,
  createList,
  createProperty,
  getAccountPlan,
  getContact,
  listProperties,
  manageProperty,
  manageWebhook,
  searchCampaigns,
  searchContacts,
  searchLists,
  updateContact
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    createContact,
    updateContact,
    getContact,
    searchContacts,
    createList,
    searchLists,
    createProperty,
    listProperties,
    manageProperty,
    createCampaign,
    searchCampaigns,
    getAccountPlan,
    manageWebhook
  ],
  triggers: []
});
