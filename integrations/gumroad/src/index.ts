import { Slate } from 'slates';
import { spec } from './spec';
import {
  getProduct,
  getSale,
  getSubscriber,
  getUser,
  listProducts,
  listSales,
  listSubscribers,
  manageCustomFields,
  manageLicense,
  manageOfferCodes,
  manageProduct,
  manageSale,
  manageVariants
} from './tools';
import { saleEvents, subscriptionEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listProducts,
    getProduct,
    manageProduct,
    manageOfferCodes,
    manageVariants,
    manageCustomFields,
    listSales,
    getSale,
    manageSale,
    listSubscribers,
    getSubscriber,
    manageLicense,
    getUser
  ],
  triggers: [saleEvents, subscriptionEvents]
});
