import { Slate } from 'slates';
import { spec } from './spec';
import {
  browseCategories,
  checkStoreStock,
  getAccount,
  getCollectionResults,
  getProductDetails,
  getReviews,
  manageCollections,
  manageDestinations,
  manageZipcodes,
  searchProducts
} from './tools';
import { collectionCompleted } from './triggers';

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
    getCollectionResults,
    manageDestinations,
    getAccount
  ],
  triggers: [collectionCompleted]
});
