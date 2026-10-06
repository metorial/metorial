import { Slate } from 'slates';
import { spec } from './spec';
import {
  createContact,
  getContact,
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
    listReports,
    listForms,
    getForm
  ],
  triggers: []
});
