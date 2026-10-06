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
  manageProductMedia,
  searchCustomers,
  searchOrders,
  searchProducts
} from './tools';
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
    manageProductMedia,
    manageCart,
    manageCategory,
    manageCms,
    getStoreInfo
  ],
  triggers: []
});
