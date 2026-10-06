import { Slate } from 'slates';
import { spec } from './spec';
import {
  createInvoiceTool,
  createUserTool,
  getInvoiceTool,
  getSettingsTool,
  getSiteTool,
  getUnitTool,
  getUserTool,
  listInvoicesTool,
  listSitesTool,
  listUnitRentalsTool,
  listUnitsTool,
  listUsersTool,
  manageInvoiceTool,
  manageLeadTool,
  manageMoveInTool,
  manageMoveOutTool,
  manageValetOrderTool,
  updateUserTool
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listSitesTool,
    getSiteTool,
    listUnitsTool,
    getUnitTool,
    listUsersTool,
    getUserTool,
    createUserTool,
    updateUserTool,
    listInvoicesTool,
    getInvoiceTool,
    createInvoiceTool,
    manageInvoiceTool,
    listUnitRentalsTool,
    manageMoveInTool,
    manageMoveOutTool,
    manageValetOrderTool,
    manageLeadTool,
    getSettingsTool
  ],
  triggers: []
});
