import { Slate } from 'slates';
import { spec } from './spec';
import {
  createContact,
  createCreditNote,
  createInvoice,
  createOrderConfirmation,
  createQuotation,
  getContact,
  getInvoice,
  getPayment,
  getProfile,
  listArticles,
  listContacts,
  listVouchers,
  manageArticle,
  manageVoucher,
  updateContact
} from './tools';
import {
  articleEvents,
  contactEvents,
  invoiceEvents,
  paymentEvents,
  voucherEvents
} from './triggers';

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
    getProfile
  ],
  triggers: [contactEvents, invoiceEvents, articleEvents, voucherEvents, paymentEvents]
});
