import { Slate } from 'slates';
import { spec } from './spec';
import {
  createNote,
  createOrUpdateAccount,
  createOrUpdateContact,
  createOrUpdateDeal,
  createOrUpdateTask,
  deleteContact,
  deleteDeal,
  getContact,
  getDeal,
  listAutomations,
  listCampaigns,
  listCustomFields,
  listPipelinesAndStages,
  manageContactAutomation,
  manageContactTags,
  manageListSubscription,
  manageLists,
  manageTags,
  searchAccounts,
  searchContacts,
  searchDeals
} from './tools';
import { campaignEvents, contactEvents, dealEvents, smsEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createOrUpdateContact,
    getContact,
    searchContacts,
    deleteContact,
    manageContactTags,
    manageListSubscription,
    manageContactAutomation,
    createOrUpdateDeal,
    getDeal,
    searchDeals,
    deleteDeal,
    manageTags,
    manageLists,
    listCampaigns,
    listAutomations,
    createOrUpdateAccount,
    searchAccounts,
    createNote,
    createOrUpdateTask,
    listPipelinesAndStages,
    listCustomFields
  ],
  triggers: [contactEvents, dealEvents, campaignEvents, smsEvents]
});
