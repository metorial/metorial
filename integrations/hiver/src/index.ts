import { Slate } from 'slates';
import { spec } from './spec';
import {
  createInboxTag,
  getConversation,
  getInbox,
  listConversations,
  listInboxes,
  searchTags,
  searchUsers,
  updateConversation
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    createInboxTag.build(),
    listInboxes.build(),
    getInbox.build(),
    listConversations.build(),
    getConversation.build(),
    updateConversation.build(),
    searchUsers.build(),
    searchTags.build()
  ],
  triggers: []
});
