import { Slate } from 'slates';
import { spec } from './spec';
import {
  calculateTax,
  createCustomer,
  createOrder,
  createRefund,
  deleteCustomer,
  deleteOrder,
  deleteRefund,
  getCustomer,
  getOrder,
  getRefund,
  listCategories,
  listCustomers,
  listNexusRegions,
  listOrders,
  listRefunds,
  listSummarizedRates,
  lookupRates,
  updateCustomer,
  updateOrder,
  updateRefund,
  validateAddress
} from './tools';
import { inboundWebhook, newOrderTrigger, newRefundTrigger } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    calculateTax,
    lookupRates,
    listCategories,
    listOrders,
    getOrder,
    createOrder,
    updateOrder,
    deleteOrder,
    listRefunds,
    getRefund,
    createRefund,
    updateRefund,
    deleteRefund,
    listCustomers,
    getCustomer,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    listNexusRegions,
    validateAddress,
    listSummarizedRates
  ],
  triggers: [inboundWebhook, newOrderTrigger, newRefundTrigger]
});
