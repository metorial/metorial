import { Slate } from 'slates';
import { spec } from './spec';
import {
  downloadAttachment,
  getConversationContext,
  getProfile,
  manageReplyDraft,
  searchConversations,
  sendReply,
  triageConversation
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getProfile.build(),
    downloadAttachment.build(),
    searchConversations.build(),
    getConversationContext.build(),
    triageConversation.build(),
    manageReplyDraft.build(),
    sendReply.build()
  ],
  triggers: []
});
