import { Slate } from 'slates';
import { spec } from './spec';
import {
  getConversationContext,
  manageReplyDraft,
  searchConversations,
  sendReply,
  triageConversation
} from './tools';
import { conversationChanges, inboundWebhook } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    searchConversations.build(),
    getConversationContext.build(),
    triageConversation.build(),
    manageReplyDraft.build(),
    sendReply.build()
  ],
  triggers: [inboundWebhook, conversationChanges.build()]
});
