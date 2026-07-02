import { Slate } from 'slates';
import { spec } from './spec';

import {
  createContact,
  createCustomer,
  createProduct,
  createSaleInvoice,
  createSaleQuote,
  deleteContact,
  deleteCustomer,
  deleteProduct,
  deleteSaleInvoice,
  deleteSaleQuote,
  finalizeSaleInvoice,
  getCustomer,
  getSettings,
  listContacts,
  listCustomers,
  listProducts,
  listReceipts,
  listSaleCredits,
  listSaleInvoices,
  listSaleQuotes,
  listSuppliers,
  manageReceipt,
  manageSaleCredit,
  manageSupplier,
  markInvoiceAsPaid,
  sendSaleInvoiceEmail,
  sendSaleQuoteEmail,
  updateContact,
  updateCustomer,
  updateProduct,
  updateSaleInvoice,
  updateSaleQuote
} from './tools';

import {
  contactEvents,
  customerEvents,
  invoiceEvents,
  productEvents,
  quoteEvents
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listCustomers,
    getCustomer,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    listContacts,
    createContact,
    updateContact,
    deleteContact,
    listSaleInvoices,
    createSaleInvoice,
    updateSaleInvoice,
    deleteSaleInvoice,
    finalizeSaleInvoice,
    markInvoiceAsPaid,
    sendSaleInvoiceEmail,
    listSaleQuotes,
    createSaleQuote,
    updateSaleQuote,
    deleteSaleQuote,
    sendSaleQuoteEmail,
    listSaleCredits,
    manageSaleCredit,
    listProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    listSuppliers,
    manageSupplier,
    listReceipts,
    manageReceipt,
    getSettings
  ],
  triggers: [customerEvents, contactEvents, invoiceEvents, quoteEvents, productEvents]
});
