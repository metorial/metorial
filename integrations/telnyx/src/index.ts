import { Slate } from 'slates';
import { spec } from './spec';
import {
  callAction,
  dialCall,
  getBalance,
  getMessage,
  listPhoneNumbers,
  manageMessagingProfile,
  managePhoneNumber,
  manageSimCard,
  manageVerifyProfile,
  numberLookup,
  orderPhoneNumbers,
  searchPhoneNumbers,
  sendFax,
  sendMessage,
  sendVerification,
  verifyCode
} from './tools';
import { callEvents, faxEvents, messagingEvents, verifyEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    sendMessage,
    getMessage,
    searchPhoneNumbers,
    orderPhoneNumbers,
    listPhoneNumbers,
    managePhoneNumber,
    sendVerification,
    verifyCode,
    manageVerifyProfile,
    numberLookup,
    sendFax,
    dialCall,
    callAction,
    manageMessagingProfile,
    manageSimCard,
    getBalance
  ],
  triggers: [messagingEvents, callEvents, faxEvents, verifyEvents]
});
