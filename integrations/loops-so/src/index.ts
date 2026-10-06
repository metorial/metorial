import { Slate } from 'slates';
import { spec } from './spec';
import {
  checkContactSuppression,
  createContact,
  deleteContact,
  findContact,
  getCurrentTeam,
  listContactProperties,
  listMailingLists,
  listTransactionalEmails,
  sendEvent,
  sendTransactionalEmail,
  updateContact
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    createContact,
    checkContactSuppression,
    getCurrentTeam,
    updateContact,
    findContact,
    deleteContact,
    sendEvent,
    sendTransactionalEmail,
    listMailingLists,
    listContactProperties,
    listTransactionalEmails
  ],
  triggers: []
});
