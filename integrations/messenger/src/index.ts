import { Slate } from '@slates/provider';
import { messengerChatAdapter, messengerGetFileUrl } from './chat';
import { spec } from './spec';
import {
  getPage,
  getUserProfile,
  handover,
  listConversationMessages,
  listConversations,
  manageProfile,
  senderAction,
  sendMessage,
  sendTemplate,
  uploadAttachment
} from './tools';
import { messengerEventsTriggerGroup } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    sendMessage,
    uploadAttachment,
    sendTemplate,
    manageProfile,
    getUserProfile,
    getPage,
    senderAction,
    handover,
    listConversations,
    listConversationMessages,
    messengerGetFileUrl
  ],
  adapters: [messengerChatAdapter],
  triggerGroups: [messengerEventsTriggerGroup],
  triggers: []
});
