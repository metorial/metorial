import { Slate } from 'slates';
import { spec } from './spec';
import {
  getCollection,
  getSite,
  listAssets,
  listCollectionItems,
  listCollections,
  listFormSubmissions,
  listOrders,
  listPages,
  listProducts,
  listSites,
  listUsers,
  manageCollectionItem,
  manageInventory,
  manageProduct,
  manageUser,
  publishCollectionItems,
  publishSite,
  updateOrder,
  updatePageSettings
} from './tools';
import {
  collectionItemEventsTrigger,
  ecommerceEventsTrigger,
  formSubmissionTrigger,
  pageEventsTrigger,
  sitePublishTrigger,
  userAccountEventsTrigger
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listSites,
    getSite,
    publishSite,
    listCollections,
    getCollection,
    listCollectionItems,
    manageCollectionItem,
    publishCollectionItems,
    listPages,
    updatePageSettings,
    listFormSubmissions,
    listProducts,
    manageProduct,
    listOrders,
    updateOrder,
    manageInventory,
    listUsers,
    manageUser,
    listAssets
  ],
  triggers: [
    formSubmissionTrigger,
    sitePublishTrigger,
    pageEventsTrigger,
    ecommerceEventsTrigger,
    userAccountEventsTrigger,
    collectionItemEventsTrigger
  ]
});
