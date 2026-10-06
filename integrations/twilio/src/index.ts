import { Slate } from '@slates/provider';
import { spec } from './spec';
import {
  checkVerification,
  conversationParticipants,
  listCalls,
  listMessages,
  listRecordings,
  listVerifyServices,
  lookupPhoneNumber,
  makeCall,
  manageConversation,
  manageMessagingService,
  managePhoneNumber,
  modifyCall,
  searchPhoneNumbers,
  sendConversationMessage,
  sendMessage,
  sendVerification
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    sendMessage,
    listMessages,
    makeCall,
    listCalls,
    modifyCall,
    lookupPhoneNumber,
    sendVerification,
    checkVerification,
    searchPhoneNumbers,
    managePhoneNumber,
    manageConversation,
    conversationParticipants,
    sendConversationMessage,
    manageMessagingService,
    listRecordings,
    listVerifyServices
  ],
  triggers: []
});
