import { Slate } from 'slates';
import { spec } from './spec';
import {
  getCollection,
  getCollectionItem,
  getOrder,
  getPage,
  getProduct,
  getSite,
  listAssets,
  listCollectionItems,
  listCollections,
  listComments,
  listComponents,
  listCustomCode,
  listCustomDomains,
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
  manageWebhook,
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
    listCustomDomains,
    publishSite,
    listCollections,
    getCollection,
    listCollectionItems,
    getCollectionItem,
    manageCollectionItem,
    publishCollectionItems,
    listPages,
    getPage,
    updatePageSettings,
    listCustomCode,
    listFormSubmissions,
    listComments,
    listComponents,
    listProducts,
    getProduct,
    manageProduct,
    listOrders,
    getOrder,
    updateOrder,
    manageInventory,
    listUsers,
    manageUser,
    listAssets,
    manageWebhook
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
