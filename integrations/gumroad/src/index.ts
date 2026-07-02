import { Slate } from 'slates';
import { spec } from './spec';
import {
  getEarnings,
  getPayout,
  getProduct,
  getSale,
  getSubscriber,
  getUpcomingPayouts,
  getUser,
  listCategories,
  listPayouts,
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
    listCategories,
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
    listPayouts,
    getPayout,
    getUpcomingPayouts,
    getEarnings,
    getUser
  ],
  triggers: [saleEvents, subscriptionEvents]
});
