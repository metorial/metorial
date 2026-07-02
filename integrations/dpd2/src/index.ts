import { Slate } from 'slates';
import { spec } from './spec';
import {
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
import { purchaseNotification } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
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
  triggers: [purchaseNotification]
});
