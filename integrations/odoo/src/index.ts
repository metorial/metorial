import { Slate } from 'slates';
import { spec } from './spec';
import {
  archiveRecords,
  completeActivity,
  confirmPurchaseOrder,
  confirmSaleOrder,
  countRecords,
  createRecord,
  deleteRecords,
  downloadAttachment,
  executeMethod,
  getCurrentUser,
  getRecordDefaults,
  listModelFields,
  listModels,
  markOpportunityWon,
  postInvoice,
  readRecords,
  searchRecords,
  updateRecords
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getCurrentUser,
    listModels,
    listModelFields,
    searchRecords,
    countRecords,
    readRecords,
    getRecordDefaults,
    createRecord,
    updateRecords,
    deleteRecords,
    archiveRecords,
    downloadAttachment,
    confirmSaleOrder,
    postInvoice,
    confirmPurchaseOrder,
    markOpportunityWon,
    completeActivity,
    executeMethod
  ],
  triggers: []
});
