import { Slate } from 'slates';
import { spec } from './spec';
import {
  createContact,
  createCreditNote,
  createInvoice,
  createOrderConfirmation,
  createQuotation,
  downloadDocument,
  getContact,
  getInvoice,
  getPayment,
  getProfile,
  getResource,
  listArticles,
  listContacts,
  listReferenceData,
  listVouchers,
  manageArticle,
  manageVoucher,
  updateContact
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    createContact,
    getContact,
    updateContact,
    listContacts,
    createInvoice,
    getInvoice,
    createQuotation,
    createCreditNote,
    createOrderConfirmation,
    manageArticle,
    listArticles,
    manageVoucher,
    listVouchers,
    getPayment,
    getProfile,
    getResource,
    downloadDocument,
    listReferenceData
  ],
  triggers: []
});
