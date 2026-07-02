import { Slate } from 'slates';
import { spec } from './spec';
import {
  archiveCustomer,
  checkAvailability,
  createCustomer,
  createOrder,
  createPayment,
  createProduct,
  getCustomer,
  getDocument,
  getOrder,
  getProduct,
  listCustomers,
  listDocuments,
  listLocations,
  listOrders,
  listPayments,
  listProducts,
  manageCoupons,
  manageStock,
  sendEmail,
  updateCustomer,
  updateOrder,
  updateProduct
} from './tools';
import {
  customerEvents,
  documentEvents,
  orderEvents,
  paymentEvents,
  productEvents
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listCustomers,
    getCustomer,
    createCustomer,
    updateCustomer,
    archiveCustomer,
    listOrders,
    getOrder,
    createOrder,
    updateOrder,
    listProducts,
    getProduct,
    createProduct,
    updateProduct,
    checkAvailability,
    listDocuments,
    getDocument,
    manageStock,
    listLocations,
    listPayments,
    createPayment,
    manageCoupons,
    sendEmail
  ],
  triggers: [orderEvents, customerEvents, productEvents, documentEvents, paymentEvents]
});
