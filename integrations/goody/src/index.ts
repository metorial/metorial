import { Slate } from 'slates';
import { spec } from './spec';
import {
  calculateBatchPrice,
  cancelOrder,
  getOrder,
  getOrderBatch,
  getProduct,
  listCards,
  listOrderBatches,
  listOrderBatchOrders,
  listOrders,
  listPaymentMethods,
  listProducts,
  listWorkspaces,
  sendGift,
  updateOrderExpiration
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listProducts,
    getProduct,
    listCards,
    sendGift,
    getOrder,
    listOrders,
    cancelOrder,
    updateOrderExpiration,
    getOrderBatch,
    listOrderBatches,
    listOrderBatchOrders,
    calculateBatchPrice,
    listPaymentMethods,
    listWorkspaces
  ],
  triggers: []
});
