import { Slate } from 'slates';
import { spec } from './spec';
import {
  callAction,
  dialCall,
  getBalance,
  getFax,
  getFileUrl,
  getMessage,
  listConnections,
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
    getBalance,
    listConnections,
    getFax,
    getFileUrl
  ],
  triggers: []
});
