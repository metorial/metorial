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
import { smsEvents, voiceEvents, whatsappEvents } from './triggers';

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
  triggers: [smsEvents, whatsappEvents, voiceEvents]
});
