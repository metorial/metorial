import { Slate } from 'slates';
import { spec } from './spec';
import {
  createCampaign,
  deleteCampaign,
  getCampaign,
  getCampaignReport,
  getContactList,
  listCampaigns,
  listContactLists,
  listContacts,
  manageContact,
  manageContactList,
  sendCampaign,
  updateCampaign,
  whoAmI
} from './tools';
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
    manageContact,
    getContactList,
    whoAmI
  ],
  triggers: []
});
