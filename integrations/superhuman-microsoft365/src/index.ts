import { Slate } from 'slates';
import { spec } from './spec';
import {
  getConversationContext,
  manageReplyDraft,
  searchConversations,
  sendReply,
  triageConversation
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    searchConversations,
    getConversationContext,
    triageConversation,
    manageReplyDraft,
    sendReply
  ],
  triggers: []
});
