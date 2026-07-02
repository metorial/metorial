import { Slate } from 'slates';
import { spec } from './spec';
import {
  cancelScheduledSmsTool,
  createContactListTool,
  createContactTool,
  deleteContactListTool,
  deleteContactTool,
  getAccountTool,
  getSmsHistoryTool,
  listContactListsTool,
  listContactsTool,
  listDedicatedNumbersTool,
  sendEmailTool,
  sendLetterTool,
  sendMmsTool,
  sendSmsTool,
  sendVoiceTool,
  updateContactTool
} from './tools';
import { inboundSmsTrigger, smsDeliveryReceiptTrigger } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    sendSmsTool,
    getSmsHistoryTool,
    cancelScheduledSmsTool,
    sendMmsTool,
    sendVoiceTool,
    sendEmailTool,
    sendLetterTool,
    createContactTool,
    updateContactTool,
    deleteContactTool,
    listContactsTool,
    listContactListsTool,
    createContactListTool,
    deleteContactListTool,
    getAccountTool,
    listDedicatedNumbersTool
  ],
  triggers: [inboundSmsTrigger, smsDeliveryReceiptTrigger]
});
