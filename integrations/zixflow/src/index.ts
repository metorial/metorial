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
  triggers: []
});
