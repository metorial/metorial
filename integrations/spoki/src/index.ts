import { Slate } from 'slates';
import { spec } from './spec';
import {
  createUpdateContact,
  deleteContact,
  deleteDeal,
  getContact,
  listContacts,
  listDeals,
  manageContactLists,
  manageContactTags,
  manageDeal,
  manageLists,
  sendMessage,
  sendTemplate,
  startAutomation
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    createUpdateContact,
    deleteContact,
    getContact,
    listContacts,
    manageContactTags,
    manageContactLists,
    sendMessage,
    sendTemplate,
    startAutomation,
    manageDeal,
    deleteDeal,
    listDeals,
    manageLists
  ],
  triggers: []
});
