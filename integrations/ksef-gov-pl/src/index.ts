import { Slate } from 'slates';
import { spec } from './spec';
import {
  closeSessionTool,
  downloadInvoiceTool,
  downloadInvoiceUpoTool,
  downloadSessionUpoTool,
  getConnectionStatusTool,
  getInvoiceStatusTool,
  getSessionStatusTool,
  listSessionInvoicesTool,
  listSessionsTool,
  searchInvoicesTool,
  submitInvoiceTool
} from './tools';

export const provider = Slate.create({
  spec,
  tools: [
    getConnectionStatusTool,
    searchInvoicesTool,
    downloadInvoiceTool,
    submitInvoiceTool,
    listSessionsTool,
    getSessionStatusTool,
    listSessionInvoicesTool,
    getInvoiceStatusTool,
    closeSessionTool,
    downloadInvoiceUpoTool,
    downloadSessionUpoTool
  ],
  triggers: []
});
