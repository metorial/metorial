import { Slate } from 'slates';
import { spec } from './spec';
import {
  createUpdateContact,
  deleteContact,
  deleteDeal,
  getContact,
  listAccounts,
  listAutomations,
  listContacts,
  listDeals,
  listTemplates,
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
    listAccounts,
    listAutomations,
    listContacts,
    manageContactTags,
    manageContactLists,
    sendMessage,
    sendTemplate,
    startAutomation,
    manageDeal,
    deleteDeal,
    listDeals,
    listTemplates,
    manageLists
  ],
  triggers: []
});
