import { Slate } from 'slates';
import { spec } from './spec';
import {
  getMessageReport,
  listCollections,
  listLists,
  listWhatsAppResources,
  listWorkspaceMembers,
  manageActivities,
  manageCollectionRecords,
  manageListEntries,
  sendEmail,
  sendOtp,
  sendRcsMessage,
  sendSms,
  sendWhatsAppMessage
} from './tools';
import { incomingRcsMessage, incomingWhatsAppMessage } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    sendWhatsAppMessage,
    sendSms,
    sendRcsMessage,
    sendEmail,
    sendOtp,
    listWhatsAppResources,
    getMessageReport,
    manageCollectionRecords,
    listCollections,
    manageListEntries,
    listLists,
    manageActivities,
    listWorkspaceMembers
  ],
  triggers: [incomingWhatsAppMessage, incomingRcsMessage]
});
