import { Slate } from 'slates';
import { spec } from './spec';
import {
  createCustomer,
  createProduct,
  deleteCustomer,
  deleteProduct,
  getCategory,
  getCustomer,
  getOrder,
  getProduct,
  getVariant,
  listCategories,
  listCustomerGroups,
  listCustomers,
  listOrders,
  listProducts,
  listVariants,
  listVendors,
  manageCategory,
  updateCustomer,
  updateInventory,
  updateOrder,
  updateProduct
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    listProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct,
    listOrders,
    getOrder,
    updateOrder,
    listCustomers,
    getCustomer,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    listCategories,
    manageCategory,
    updateInventory,
    getCategory,
    listVendors,
    listCustomerGroups,
    listVariants,
    getVariant
  ],
  triggers: []
});
