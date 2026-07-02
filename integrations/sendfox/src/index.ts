import { Slate } from 'slates';
import { spec } from './spec';
import {
  batchImportContacts,
  createCampaign,
  createContact,
  createList,
  deleteCampaign,
  deleteContact,
  deleteList,
  getAccount,
  getAutomation,
  getCampaign,
  getContact,
  getList,
  listAutomations,
  listCampaigns,
  listContacts,
  listForms,
  listLists,
  manageListContacts,
  sendCampaign,
  unsubscribeContact,
  updateCampaign,
  updateContact
} from './tools';
import { inboundWebhook, newCampaign, newContact } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createContact,
    getContact,
    listContacts,
    updateContact,
    deleteContact,
    unsubscribeContact,
    batchImportContacts,
    createList,
    listLists,
    getList,
    deleteList,
    manageListContacts,
    createCampaign,
    getCampaign,
    listCampaigns,
    updateCampaign,
    deleteCampaign,
    sendCampaign,
    listAutomations,
    getAutomation,
    listForms,
    getAccount
  ],
  triggers: [inboundWebhook, newContact, newCampaign]
});
