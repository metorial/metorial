import { Slate } from 'slates';
import { spec } from './spec';
import {
  cancelCards,
  createContact,
  deleteContact,
  getCard,
  getCards,
  getContact,
  getContacts,
  getUser,
  listCampaigns,
  listQuicksendTemplates,
  listTemplates,
  scheduleDripCampaign,
  sendCard
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    sendCard,
    scheduleDripCampaign,
    cancelCards,
    getContacts,
    getCards,
    getUser,
    listTemplates,
    createContact,
    deleteContact,
    getContact,
    getCard,
    listCampaigns,
    listQuicksendTemplates
  ],
  triggers: []
});
