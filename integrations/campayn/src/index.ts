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
import { inboundWebhook, newContact, newEmail } from './triggers';

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
  triggers: [inboundWebhook, newContact, newEmail]
});
