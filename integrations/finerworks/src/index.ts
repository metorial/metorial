import { Slate } from 'slates';
import { spec } from './spec';
import {
  addImages,
  browseCatalog,
  browseFraming,
  buildFrame,
  deleteImages,
  getOrder,
  getOrderStatus,
  getPrices,
  getProductDetails,
  getShippingOptions,
  listImages,
  listOrderStatusDefinitions,
  listOrders,
  listVirtualInventory,
  submitOrder,
  updateCustomer,
  updateImages,
  updateOrder,
  validateAddress,
  whoAmI
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    whoAmI,
    listOrders,
    getOrder,
    listVirtualInventory,
    buildFrame,
    submitOrder,
    getOrderStatus,
    updateOrder,
    updateCustomer,
    getShippingOptions,
    validateAddress,
    getPrices,
    getProductDetails,
    browseCatalog,
    listImages,
    addImages,
    updateImages,
    deleteImages,
    browseFraming,
    listOrderStatusDefinitions
  ],
  triggers: []
});
