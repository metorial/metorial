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
  triggers: []
});
