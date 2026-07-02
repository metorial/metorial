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
import {
  conversationUpdated,
  csatReceived,
  newConversation,
  newEmail,
  noteCreated
} from './triggers';

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
  triggers: [
    conversationUpdated.build(),
    newEmail.build(),
    newConversation.build(),
    noteCreated.build(),
    csatReceived.build()
  ]
});
