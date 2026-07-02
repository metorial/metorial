import { Slate } from 'slates';
import { spec } from './spec';
import {
  createCategory,
  createContact,
  createProduct,
  deleteCategory,
  deleteProduct,
  getContact,
  getProduct,
  listAutomations,
  listCampaigns,
  listCategories,
  listContacts,
  listProducts,
  sendEvent,
  updateContact
} from './tools';
import { campaignChanges, contactChanges, inboundWebhook } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createContact,
    getContact,
    listContacts,
    updateContact,
    createProduct,
    getProduct,
    listProducts,
    deleteProduct,
    sendEvent,
    listCampaigns,
    listAutomations,
    listCategories,
    createCategory,
    deleteCategory
  ],
  triggers: [inboundWebhook, contactChanges, campaignChanges]
});
