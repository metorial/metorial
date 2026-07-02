import { Slate } from 'slates';
import { spec } from './spec';
import {
  addOrders,
  bulkUpsertContacts,
  deleteContact,
  deleteOrders,
  generateEvent,
  getAccountInfo,
  getContact,
  getMessageStatus,
  getSegmentContacts,
  listSegments,
  manageUnsubscribes,
  searchContacts,
  sendEmail,
  sendPreparedMessage,
  sendSms,
  updateSegmentMembership,
  upsertContact
} from './tools';
import { messageActivity } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    upsertContact,
    searchContacts,
    getContact,
    deleteContact,
    bulkUpsertContacts,
    listSegments,
    getSegmentContacts,
    updateSegmentMembership,
    sendEmail,
    sendSms,
    sendPreparedMessage,
    getMessageStatus,
    generateEvent,
    addOrders,
    deleteOrders,
    getAccountInfo,
    manageUnsubscribes
  ],
  triggers: [messageActivity]
});
