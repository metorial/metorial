import { Slate } from 'slates';
import { spec } from './spec';
import {
  checkVerification,
  getAccountInfo,
  getMessageStatus,
  hangupCall,
  makeVoiceCall,
  manageWhatsAppTemplates,
  numberLookup,
  resendVerification,
  sendSms,
  sendVerification,
  sendWhatsApp
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    sendSms,
    getMessageStatus,
    makeVoiceCall,
    hangupCall,
    sendVerification,
    checkVerification,
    resendVerification,
    numberLookup,
    sendWhatsApp,
    manageWhatsAppTemplates,
    getAccountInfo
  ],
  triggers: []
});
