import { Slate } from 'slates';
import { spec } from './spec';
import {
  fulfillOrder,
  getStoreInfo,
  manageCart,
  manageCategory,
  manageCms,
  manageCustomer,
  manageInventory,
  manageOrder,
  manageProduct,
  searchCustomers,
  searchOrders,
  searchProducts
} from './tools';
import { customerChange, inboundWebhook, newOrder, productChange } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    manageProduct,
    searchProducts,
    manageOrder,
    searchOrders,
    fulfillOrder,
    manageCustomer,
    searchCustomers,
    manageInventory,
    manageCart,
    manageCategory,
    manageCms,
    getStoreInfo
  ],
  triggers: [inboundWebhook, newOrder, productChange, customerChange]
});
