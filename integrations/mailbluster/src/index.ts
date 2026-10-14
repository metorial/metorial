import { Slate } from 'slates';
import { spec } from './spec';
import {
  createField,
  createLead,
  createOrder,
  createProduct,
  deleteField,
  deleteLead,
  deleteOrder,
  deleteProduct,
  getLead,
  getOrder,
  getProduct,
  listFields,
  listOrders,
  listProducts,
  updateField,
  updateLead,
  updateOrder,
  updateProduct
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    createLead,
    getLead,
    updateLead,
    deleteLead,
    createProduct,
    getProduct,
    listProducts,
    updateProduct,
    deleteProduct,
    createOrder,
    getOrder,
    listOrders,
    updateOrder,
    deleteOrder,
    listFields,
    createField,
    updateField,
    deleteField
  ],
  triggers: []
});
