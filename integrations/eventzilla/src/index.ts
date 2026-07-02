import { Slate } from 'slates';
import { spec } from './spec';
import {
  checkinAttendeeTool,
  confirmCheckoutTool,
  createCheckoutTool,
  fillOrderTool,
  getAttendeeTool,
  getCategoriesTool,
  getEventTicketsTool,
  getEventTool,
  getTransactionTool,
  listAttendeesTool,
  listEventsTool,
  listTransactionsTool,
  listUsersTool,
  manageOrderTool,
  prepareCheckoutTool,
  toggleEventSalesTool
} from './tools';
import { inboundWebhook, newAttendeeTrigger, newTransactionTrigger } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listEventsTool,
    getEventTool,
    getEventTicketsTool,
    listAttendeesTool,
    getAttendeeTool,
    checkinAttendeeTool,
    listTransactionsTool,
    getTransactionTool,
    manageOrderTool,
    toggleEventSalesTool,
    prepareCheckoutTool,
    createCheckoutTool,
    fillOrderTool,
    confirmCheckoutTool,
    listUsersTool,
    getCategoriesTool
  ],
  triggers: [inboundWebhook, newAttendeeTrigger, newTransactionTrigger]
});
