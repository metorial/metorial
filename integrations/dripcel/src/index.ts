import { Slate } from 'slates';
import { spec } from './spec';
import {
  bulkUpdateContacts,
  checkCompliance,
  createExchangeTransactions,
  deleteContact,
  getContact,
  getCreditBalance,
  getDeliveries,
  listCampaigns,
  listCampaignsV2,
  listEmailTemplates,
  manageExchangeTransactions,
  manageTags,
  searchContacts,
  searchReplies,
  searchSendLogs,
  sendBulkEmail,
  sendSms,
  updateContact,
  uploadContacts,
  uploadSales
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getContact,
    searchContacts,
    uploadContacts,
    updateContact,
    deleteContact,
    bulkUpdateContacts,
    sendSms,
    sendBulkEmail,
    listEmailTemplates,
    listCampaigns,
    listCampaignsV2,
    getDeliveries,
    searchSendLogs,
    searchReplies,
    uploadSales,
    manageTags,
    checkCompliance,
    manageExchangeTransactions,
    createExchangeTransactions,
    getCreditBalance
  ],
  triggers: []
});
