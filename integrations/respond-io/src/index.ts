import { Slate } from 'slates';
import { spec } from './spec';
import {
  addComment,
  assignConversation,
  createContact,
  deleteContact,
  getContact,
  getMessage,
  listContactChannels,
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
    getMessage,
    listContactChannels,
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
