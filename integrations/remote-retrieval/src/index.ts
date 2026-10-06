import { Slate } from 'slates';
import { spec } from './spec';
import {
  createOrder,
  getCompanyDetails,
  getDevicePrices,
  getOrderDetails,
  listOrders
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [createOrder, listOrders, getOrderDetails, getCompanyDetails, getDevicePrices],
  triggers: []
});
