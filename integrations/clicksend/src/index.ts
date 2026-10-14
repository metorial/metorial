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
  getSmsReceiptsTool,
  listContactListsTool,
  listContactsTool,
  listDedicatedNumbersTool,
  listEmailAddressesTool,
  listInboundSmsTool,
  sendEmailTool,
  sendLetterTool,
  sendMmsTool,
  sendSmsTool,
  sendVoiceTool,
  updateContactTool
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    sendSmsTool,
    getSmsHistoryTool,
    getSmsReceiptsTool,
    listInboundSmsTool,
    listEmailAddressesTool,
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
  triggers: []
});
