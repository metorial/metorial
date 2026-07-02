import { Slate } from '@slates/provider';
import { spec } from './spec';
import {
  createCustomer,
  createFulfillment,
  createProduct,
  deleteProduct,
  getCustomer,
  getOrder,
  getProduct,
  getShop,
  listCustomers,
  listLocations,
  listOrders,
  listProducts,
  manageCollections,
  manageDiscounts,
  manageDraftOrders,
  manageInventory,
  manageMetafields,
  manageOrder,
  managePages,
  manageVariants,
  updateCustomer,
  updateProduct
} from './tools';
import {
  customerEvents,
  fulfillmentEvents,
  inventoryEvents,
  orderEvents,
  productEvents
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct,
    manageVariants,
    listOrders,
    getOrder,
    manageOrder,
    listCustomers,
    getCustomer,
    createCustomer,
    updateCustomer,
    manageInventory,
    listLocations,
    createFulfillment,
    manageCollections,
    manageDiscounts,
    manageDraftOrders,
    getShop,
    managePages,
    manageMetafields
  ],
  triggers: [orderEvents, productEvents, customerEvents, inventoryEvents, fulfillmentEvents]
});
