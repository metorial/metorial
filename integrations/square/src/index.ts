import { Slate } from 'slates';
import { spec } from './spec';
import {
  adjustInventory,
  createCustomer,
  createInvoice,
  createOrder,
  createPayment,
  deleteCatalogObject,
  deleteCustomer,
  getCatalogObject,
  getCustomer,
  getInventory,
  getInvoice,
  getOrder,
  getPayment,
  listCustomers,
  listInvoices,
  listLocations,
  listPayments,
  manageInvoice,
  managePayment,
  refundPayment,
  searchCatalog,
  searchOrders,
  updateCustomer,
  upsertCatalogObject
} from './tools';
import {
  bookingEvents,
  catalogEvents,
  customerEvents,
  disputeEvents,
  inventoryEvents,
  invoiceEvents,
  loyaltyEvents,
  orderEvents,
  paymentEvents,
  refundEvents,
  subscriptionEvents
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listPayments,
    getPayment,
    createPayment,
    managePayment,
    refundPayment,
    searchOrders,
    getOrder,
    createOrder,
    listCustomers,
    getCustomer,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    searchCatalog,
    getCatalogObject,
    upsertCatalogObject,
    deleteCatalogObject,
    getInventory,
    adjustInventory,
    listInvoices,
    getInvoice,
    createInvoice,
    manageInvoice,
    listLocations
  ],
  triggers: [
    paymentEvents,
    orderEvents,
    customerEvents,
    invoiceEvents,
    catalogEvents,
    inventoryEvents,
    refundEvents,
    bookingEvents,
    disputeEvents,
    subscriptionEvents,
    loyaltyEvents
  ]
});
