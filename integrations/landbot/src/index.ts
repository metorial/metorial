import { Slate } from 'slates';
import { spec } from './spec';
import {
  createTicketTool,
  deleteCustomerTool,
  getChannelTool,
  getCustomerTool,
  getTicketTool,
  listAgentsTool,
  listChannelsTool,
  listCustomersTool,
  listTicketsTool,
  listWhatsAppTemplatesTool,
  sendMessageTool,
  sendWhatsAppTemplateTool,
  updateCustomerTool,
  updateTicketTool
} from './tools';
import { conversationEventTrigger } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listCustomersTool,
    getCustomerTool,
    updateCustomerTool,
    deleteCustomerTool,
    sendMessageTool,
    sendWhatsAppTemplateTool,
    listWhatsAppTemplatesTool,
    listChannelsTool,
    getChannelTool,
    listTicketsTool,
    getTicketTool,
    createTicketTool,
    updateTicketTool,
    listAgentsTool
  ] as any,
  triggers: [conversationEventTrigger] as any
});
