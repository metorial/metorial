import { Slate } from 'slates';
import { spec } from './spec';
import {
  browseCategories,
  checkStoreStock,
  getAccount,
  getCollectionResults,
  getProductDetails,
  getReviews,
  manageCollectionRequests,
  manageCollections,
  manageDestinations,
  manageZipcodes,
  searchProducts
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    searchProducts,
    getProductDetails,
    getReviews,
    browseCategories,
    checkStoreStock,
    manageZipcodes,
    manageCollections,
    manageCollectionRequests,
    getCollectionResults,
    manageDestinations,
    getAccount
  ],
  triggers: []
});
