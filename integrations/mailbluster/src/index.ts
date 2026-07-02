import { Slate } from 'slates';
import { spec } from './spec';
import {
  createField,
  createLead,
  createOrder,
  createProduct,
  deleteLead,
  deleteOrder,
  deleteProduct,
  getLead,
  getOrder,
  getProduct,
  listFields,
  listOrders,
  listProducts,
  updateLead,
  updateOrder,
  updateProduct
} from './tools';
import { inboundWebhook, newOrder, newProduct } from './triggers';

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
    createField
  ],
  triggers: [inboundWebhook, newProduct, newOrder]
});
