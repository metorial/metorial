import { Slate } from 'slates';
import { spec } from './spec';
import {
  getAccount,
  getAutocomplete,
  getCollection,
  getCollectionResults,
  getProduct,
  getReviews,
  getSellerFeedback,
  getSellerProfile,
  listCollectionRequests,
  listCollections,
  listDestinations,
  listErrorLogs,
  manageCollection,
  manageCollectionRequests,
  searchProducts
} from './tools';
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
    getCollection,
    listCollectionRequests,
    manageCollectionRequests,
    listDestinations,
    listErrorLogs,
    getAccount
  ],
  triggers: []
});
