import { Slate } from 'slates';
import { spec } from './spec';
import {
  addBroadcastRecipientsTool,
  createBroadcastTool,
  createContactTool,
  deleteContactTool,
  getBusinessTool,
  listBroadcastsTool,
  listChannelsTool,
  listChatsTool,
  listContactsTool,
  listMessageTemplatesTool,
  listWorkflowsTool,
  sendWhatsAppMessageTool,
  startBroadcastTool,
  triggerWorkflowTool,
  updateChatTool,
  updateContactTool
} from './tools';
import { incomingMessageTrigger } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    getBusinessTool,
    listContactsTool,
    createContactTool,
    updateContactTool,
    deleteContactTool,
    sendWhatsAppMessageTool,
    listChannelsTool,
    listMessageTemplatesTool,
    createBroadcastTool,
    listBroadcastsTool,
    startBroadcastTool,
    addBroadcastRecipientsTool,
    listChatsTool,
    updateChatTool,
    listWorkflowsTool,
    triggerWorkflowTool
  ],
  triggers: [incomingMessageTrigger]
});
