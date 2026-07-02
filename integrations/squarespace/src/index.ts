import { Slate } from 'slates';
import { spec } from './spec';
import {
  createOrder,
  fulfillOrder,
  getOrder,
  getProduct,
  getProfile,
  getSiteInfo,
  listOrders,
  listProducts,
  listProfiles,
  listStorePages,
  listTransactions,
  manageInventory,
  manageProduct
} from './tools';
import { extensionEvents, orderEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listOrders,
    getOrder,
    createOrder,
    fulfillOrder,
    listProducts,
    getProduct,
    manageProduct,
    manageInventory,
    listProfiles,
    getProfile,
    listTransactions,
    getSiteInfo,
    listStorePages
  ],
  triggers: [orderEvents, extensionEvents]
});
