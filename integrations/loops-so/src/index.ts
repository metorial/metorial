import { Slate } from 'slates';
import { spec } from './spec';
import {
  createContact,
  deleteContact,
  findContact,
  listContactProperties,
  listMailingLists,
  listTransactionalEmails,
  sendEvent,
  sendTransactionalEmail,
  updateContact
} from './tools';
import { contactEvents, emailEngagementEvents, emailSendingEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createContact,
    updateContact,
    findContact,
    deleteContact,
    sendEvent,
    sendTransactionalEmail,
    listMailingLists,
    listContactProperties,
    listTransactionalEmails
  ],
  triggers: [contactEvents, emailSendingEvents, emailEngagementEvents]
});
