import { Slate } from 'slates';
import { spec } from './spec';
import {
  addThread,
  createConversation,
  createCustomer,
  deleteConversation,
  deleteCustomer,
  getConversation,
  getCustomer,
  getReport,
  listConversations,
  listCustomers,
  listMailboxes,
  listSatisfactionRatings,
  listTeams,
  listUsers,
  manageDocs,
  manageOrganization,
  manageTags,
  manageWorkflow,
  updateConversation,
  updateCustomer
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listConversations,
    getConversation,
    createConversation,
    updateConversation,
    deleteConversation,
    addThread,
    listCustomers,
    getCustomer,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    manageOrganization,
    listMailboxes,
    manageTags,
    listUsers,
    listTeams,
    manageWorkflow,
    getReport,
    listSatisfactionRatings,
    manageDocs
  ],
  triggers: []
});
