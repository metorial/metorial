import { Slate } from 'slates';
import { spec } from './spec';
import {
  createAgreement,
  createContact,
  createCustomer,
  createOffer,
  createProduct,
  createProject,
  createSalesNote,
  createSalesOpportunity,
  createTask,
  createTimeEntry,
  createTransaction,
  deleteCustomer,
  getCustomer,
  listContacts,
  listCustomers,
  listDocuments,
  listEmails,
  listOffers,
  listProducts,
  listProjects,
  listSalesNotes,
  listSalesOpportunities,
  listTasks,
  listTimeEntries,
  listTransactions,
  listWarehouseDocuments,
  updateCustomer,
  updateProduct,
  updateProject,
  updateTask
} from './tools';
import {
  customerChanges,
  inboundWebhook,
  salesOpportunityChanges,
  taskChanges,
  transactionChanges
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listCustomers,
    getCustomer,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    listContacts,
    createContact,
    listProjects,
    createProject,
    updateProject,
    listTasks,
    createTask,
    updateTask,
    listTransactions,
    createTransaction,
    listOffers,
    createOffer,
    createAgreement,
    listProducts,
    createProduct,
    updateProduct,
    listSalesOpportunities,
    createSalesOpportunity,
    listSalesNotes,
    createSalesNote,
    listTimeEntries,
    createTimeEntry,
    listEmails,
    listDocuments,
    listWarehouseDocuments
  ],
  triggers: [
    inboundWebhook,
    customerChanges,
    taskChanges,
    transactionChanges,
    salesOpportunityChanges
  ]
});
