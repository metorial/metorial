import { Slate } from 'slates';
import { spec } from './spec';
import {
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
