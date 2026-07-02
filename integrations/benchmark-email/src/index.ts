import { Slate } from 'slates';
import { spec } from './spec';
import {
  createCampaign,
  deleteCampaign,
  getCampaign,
  getCampaignReport,
  listCampaigns,
  listContactLists,
  listContacts,
  manageContact,
  manageContactList,
  sendCampaign,
  updateCampaign
} from './tools';
import { contactListEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listCampaigns,
    getCampaign,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    sendCampaign,
    getCampaignReport,
    listContactLists,
    manageContactList,
    listContacts,
    manageContact
  ],
  triggers: [contactListEvents]
});
