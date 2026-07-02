import { Slate } from 'slates';
import { spec } from './spec';
import {
  getAccount,
  getAutocomplete,
  getCollectionResults,
  getProduct,
  getReviews,
  getSellerFeedback,
  getSellerProfile,
  listCollections,
  manageCollection,
  searchProducts
} from './tools';
import { collectionCompleted } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    searchProducts,
    getProduct,
    getReviews,
    getSellerProfile,
    getSellerFeedback,
    getAutocomplete,
    manageCollection,
    listCollections,
    getCollectionResults,
    getAccount
  ],
  triggers: [collectionCompleted]
});
