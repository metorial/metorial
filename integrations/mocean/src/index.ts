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
  reportSmsConversion,
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
    reportSmsConversion,
    sendWhatsApp,
    manageWhatsAppTemplates,
    getAccountInfo
  ],
  triggers: []
});
