import { Slate } from 'slates';
import { spec } from './spec';
import {
  getChannelInfo,
  listChats,
  listDevices,
  listPushes,
  listSubscriptions,
  manageChat,
  manageDevice,
  managePush,
  manageSubscription,
  requestFileUpload,
  sendClipboard,
  sendPush,
  sendSms
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    sendPush,
    listPushes,
    managePush,
    listDevices,
    manageDevice,
    sendSms,
    listChats,
    manageChat,
    listSubscriptions,
    manageSubscription,
    getChannelInfo,
    sendClipboard,
    requestFileUpload
  ],
  triggers: []
});
