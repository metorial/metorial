import { Slate } from 'slates';
import { spec } from './spec';
import {
  createAnalyticsReport,
  createCustomChannelMessage,
  createPost,
  getConversation,
  getTask,
  listContactBooks,
  listContacts,
  listConversationDrafts,
  listConversations,
  listOrganizationsAndUsers,
  listTasks,
  manageContacts,
  manageConversation,
  manageResponses,
  manageSharedLabels,
  manageTasks,
  manageTeams,
  sendMessage
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listConversations,
    getConversation,
    getTask,
    listConversationDrafts,
    sendMessage,
    createCustomChannelMessage,
    createPost,
    manageConversation,
    manageContacts,
    listContacts,
    listContactBooks,
    manageSharedLabels,
    manageTeams,
    manageTasks,
    listTasks,
    manageResponses,
    createAnalyticsReport,
    listOrganizationsAndUsers
  ],
  triggers: []
});
