import { Slate } from 'slates';
import { spec } from './spec';
import {
  checkVerification,
  getAccountInfo,
  listCalls,
  makeCall,
  manageApplications,
  manageCall,
  manageNumbers,
  numberInsight,
  sendMessage,
  sendSms,
  verifyUser
} from './tools';
import { messageEvents, verifyEvents, voiceEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    sendMessage,
    sendSms,
    makeCall,
    manageCall,
    listCalls,
    verifyUser,
    checkVerification,
    numberInsight,
    manageNumbers,
    manageApplications,
    getAccountInfo
  ],
  triggers: [messageEvents, voiceEvents, verifyEvents]
});
