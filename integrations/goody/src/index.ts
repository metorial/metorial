import { Slate } from 'slates';
import { spec } from './spec';
import {
  calculateBatchPrice,
  cancelOrder,
  getCollection,
  getCurrentUser,
  getOrder,
  getOrderBatch,
  getProduct,
  listBrands,
  listCards,
  listCollections,
  listOrderActivities,
  listOrderBatches,
  listOrderBatchOrders,
  listOrderBatchRecipients,
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
    getCurrentUser,
    listBrands,
    listCollections,
    getCollection,
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
    listOrderBatchRecipients,
    listOrderActivities,
    calculateBatchPrice,
    listPaymentMethods,
    listWorkspaces
  ],
  triggers: []
});
