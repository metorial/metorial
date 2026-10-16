import { Slate } from 'slates';
import { spec } from './spec';
import {
  checkinAttendeeTool,
  confirmCheckoutTool,
  createCheckoutTool,
  createFreeTicketTypeTool,
  fillOrderTool,
  getAttendeeTool,
  getCategoriesTool,
  getEventTicketsTool,
  getEventTool,
  getTransactionTool,
  getUserTool,
  listAttendeesTool,
  listEventsTool,
  listTransactionsTool,
  listUsersTool,
  manageOrderTool,
  prepareCheckoutTool,
  toggleEventSalesTool,
  updateFreeTicketTypeTool
} from './tools';
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
    getCategoriesTool,
    getUserTool,
    createFreeTicketTypeTool,
    updateFreeTicketTypeTool
  ],
  triggers: []
});
