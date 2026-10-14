import { Slate } from 'slates';
import { spec } from './spec';
import {
  createTicketTool,
  deleteCustomerTool,
  getChannelTool,
  getCustomerMessagesTool,
  getCustomerTool,
  getTicketTool,
  listAgentsTool,
  listChannelsTool,
  listCustomersTool,
  listTicketsTool,
  listWhatsAppTemplatesTool,
  sendCustomerTextTool,
  sendMessageTool,
  sendWhatsAppTemplateTool,
  updateCustomerTool,
  updateTicketTool
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listCustomersTool,
    getCustomerTool,
    getCustomerMessagesTool,
    updateCustomerTool,
    deleteCustomerTool,
    sendMessageTool,
    sendCustomerTextTool,
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
  triggers: []
});
