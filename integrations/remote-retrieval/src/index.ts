import { Slate } from 'slates';
import { spec } from './spec';
import {
  createOrder,
  createOrdersFromCsv,
  getCompanyDetails,
  getCurrentUser,
  getDevicePrices,
  getOrderDetails,
  listOrders
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    createOrder,
    listOrders,
    getOrderDetails,
    getCompanyDetails,
    getDevicePrices,
    getCurrentUser,
    createOrdersFromCsv
  ],
  triggers: []
});
