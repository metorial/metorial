import { Slate } from 'slates';
import { spec } from './spec';
import {
  createCustomer,
  createOrder,
  editCustomer,
  editOrder,
  getCustomer,
  getOrder,
  getReferenceData,
  listCustomers,
  listOrders,
  listProducts,
  listSegments,
  listUsers,
  manageCustomerNotes,
  manageCustomFields,
  manageOrderPayments,
  manageTasks
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listCustomers,
    getCustomer,
    createCustomer,
    editCustomer,
    listOrders,
    getOrder,
    createOrder,
    editOrder,
    listProducts,
    manageCustomerNotes,
    getReferenceData,
    listSegments,
    listUsers,
    manageTasks,
    manageOrderPayments,
    manageCustomFields
  ],
  triggers: []
});
