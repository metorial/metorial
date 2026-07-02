import { Slate } from '@slates/provider';
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
import { accountEvent, messageDelivery, messageReceived } from './triggers';

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
  triggers: [messageReceived, messageDelivery, accountEvent]
});
