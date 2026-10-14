import { Slate } from 'slates';
import { spec } from './spec';
import {
  createContact,
  getContact,
  getEmail,
  getForm,
  listContacts,
  listEmails,
  listForms,
  listLists,
  listReports,
  unsubscribeContact,
  updateContact
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listLists,
    listContacts,
    getContact,
    createContact,
    updateContact,
    unsubscribeContact,
    listEmails,
    getEmail,
    listReports,
    listForms,
    getForm
  ],
  triggers: []
});
