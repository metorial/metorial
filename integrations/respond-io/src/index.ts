import { Slate } from 'slates';
import { spec } from './spec';
import {
  addComment,
  assignConversation,
  createContact,
  deleteContact,
  getContact,
  listContacts,
  listCustomFields,
  listMessages,
  listMessageTemplates,
  listWorkspaceResources,
  manageContactTags,
  manageConversation,
  mergeContacts,
  sendMessage,
  sendTemplateMessage,
  updateContact
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    createContact,
    getContact,
    updateContact,
    deleteContact,
    listContacts,
    mergeContacts,
    manageContactTags,
    sendMessage,
    sendTemplateMessage,
    listMessages,
    listMessageTemplates,
    manageConversation,
    assignConversation,
    addComment,
    listCustomFields,
    listWorkspaceResources
  ],
  triggers: []
});
