import { Slate } from 'slates';
import { spec } from './spec';
import {
  completeActivity,
  confirmPurchaseOrder,
  confirmSaleOrder,
  countRecords,
  createRecord,
  deleteRecords,
  downloadAttachment,
  executeMethod,
  getCurrentUser,
  listModelFields,
  listModels,
  markOpportunityWon,
  postInvoice,
  readRecords,
  searchRecords,
  updateRecords
} from './tools';
import { inboundWebhook, recordChanges } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    getCurrentUser,
    listModels,
    listModelFields,
    searchRecords,
    countRecords,
    readRecords,
    createRecord,
    updateRecords,
    deleteRecords,
    downloadAttachment,
    confirmSaleOrder,
    postInvoice,
    confirmPurchaseOrder,
    markOpportunityWon,
    completeActivity,
    executeMethod
  ],
  triggers: [inboundWebhook, recordChanges]
});
