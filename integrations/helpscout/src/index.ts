import { Slate } from 'slates';
import { spec } from './spec';
import {
  addThread,
  createConversation,
  createCustomer,
  deleteConversation,
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
import {
  beaconChatEvents,
  conversationEvents,
  customerEvents,
  organizationEvents,
  satisfactionEvents,
  tagEvents,
  userEvents
} from './triggers';

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
  triggers: [
    conversationEvents,
    customerEvents,
    satisfactionEvents,
    organizationEvents,
    tagEvents,
    beaconChatEvents,
    userEvents
  ]
});
