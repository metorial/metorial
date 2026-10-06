import { Slate } from 'slates';
import { spec } from './spec';
import {
  getApiStatus,
  getCustomer,
  getProduct,
  getPurchase,
  getStorefront,
  getSubscriber,
  listCustomers,
  listProducts,
  listPurchases,
  listStorefronts,
  listSubscribers,
  reactivatePurchase,
  verifyNotification,
  verifySubscriber
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getApiStatus,
    listStorefronts,
    getStorefront,
    listProducts,
    getProduct,
    listPurchases,
    getPurchase,
    reactivatePurchase,
    listCustomers,
    getCustomer,
    listSubscribers,
    getSubscriber,
    verifySubscriber,
    verifyNotification
  ],
  triggers: []
});
