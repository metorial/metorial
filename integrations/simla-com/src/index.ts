import { Slate } from 'slates';
import { spec } from './spec';
import {
  createCustomer,
  createOrder,
  editCustomer,
  editOrder,
  getApiAccess,
  getCustomer,
  getOrder,
  getReferenceData,
  listCustomers,
  listOrders,
  listProductGroups,
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
    getApiAccess,
    listCustomers,
    getCustomer,
    createCustomer,
    editCustomer,
    listOrders,
    getOrder,
    createOrder,
    editOrder,
    listProducts,
    listProductGroups,
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
