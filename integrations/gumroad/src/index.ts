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
  listProductReviews,
  listProducts,
  listSales,
  listSubscribers,
  manageCustomFields,
  manageEmails,
  manageLicense,
  manageOfferCodes,
  manageProduct,
  manageSale,
  manageVariants
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listCategories,
    listProducts,
    getProduct,
    listProductReviews,
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
    manageEmails,
    listPayouts,
    getPayout,
    getUpcomingPayouts,
    getEarnings,
    getUser
  ],
  triggers: []
});
