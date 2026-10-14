import { Slate } from 'slates';
import { spec } from './spec';
import {
  addCustomFieldToContact,
  createEmailCampaign,
  createOrUpdateContact,
  getCampaignStatistics,
  getContactFields,
  getContacts,
  getCurrentAccount,
  getEmailCampaigns,
  listSenders,
  manageContactListMembers,
  manageContactLists,
  manageTags,
  searchContacts,
  sendEmail
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    getCurrentAccount,
    listSenders,
    getCampaignStatistics,
    createOrUpdateContact,
    getContacts,
    searchContacts,
    manageContactLists,
    manageContactListMembers,
    manageTags,
    createEmailCampaign,
    getEmailCampaigns,
    sendEmail,
    getContactFields,
    addCustomFieldToContact
  ],
  triggers: []
});
