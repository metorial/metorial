import { Slate } from '@slates/provider';
import { messengerChatAdapter } from './chat';
import { spec } from './spec';
import {
  getUserProfile,
  handover,
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
    senderAction,
    handover
  ],
  adapters: [messengerChatAdapter],
  triggerGroups: [messengerEventsTriggerGroup],
  triggers: []
});
