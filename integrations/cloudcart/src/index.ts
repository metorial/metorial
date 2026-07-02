import { Slate } from 'slates';
import { spec } from './spec';
import {
  createCustomer,
  createProduct,
  deleteCustomer,
  deleteProduct,
  getCustomer,
  getOrder,
  getProduct,
  listCategories,
  listCustomers,
  listOrders,
  listProducts,
  manageCategory,
  updateCustomer,
  updateInventory,
  updateOrder,
  updateProduct
} from './tools';
import { customerEvents, orderEvents, productEvents } from './triggers';

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
    updateInventory
  ],
  triggers: [orderEvents, productEvents, customerEvents]
});
