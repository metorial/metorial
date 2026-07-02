import { Slate } from 'slates';
import { spec } from './spec';
import {
  createOrder,
  fulfillOrder,
  getContact,
  getContactTransactionSummaries,
  getOrder,
  getProduct,
  getProfile,
  getSiteInfo,
  listContacts,
  listOrders,
  listProducts,
  listProfiles,
  listStorePages,
  listTransactions,
  manageContact,
  manageContactAddress,
  manageInventory,
  manageProduct,
  manageProductVariant
} from './tools';
import { extensionEvents, orderEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listOrders,
    getOrder,
    createOrder,
    fulfillOrder,
    listProducts,
    getProduct,
    manageProduct,
    manageProductVariant,
    manageInventory,
    listContacts,
    getContact,
    manageContact,
    manageContactAddress,
    getContactTransactionSummaries,
    listProfiles,
    getProfile,
    listTransactions,
    getSiteInfo,
    listStorePages
  ],
  triggers: [orderEvents, extensionEvents]
});
