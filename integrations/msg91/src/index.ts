import { Slate } from 'slates';
import { spec } from './spec';
import {
  createOrUpdateContact,
  deleteContacts,
  getMessagingLogs,
  getPhonebookFields,
  listEmailTemplates,
  listWhatsAppNumbers,
  listWhatsAppTemplates,
  resendOtp,
  runCampaign,
  searchContacts,
  sendEmail,
  sendOtp,
  sendRcsMessage,
  sendSms,
  sendVoiceMessage,
  sendWhatsAppMessage,
  trackEvent,
  validateEmail,
  verifyOtp
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    sendSms,
    sendOtp,
    verifyOtp,
    resendOtp,
    sendEmail,
    validateEmail,
    sendWhatsAppMessage,
    sendVoiceMessage,
    sendRcsMessage,
    runCampaign,
    createOrUpdateContact,
    searchContacts,
    deleteContacts,
    getPhonebookFields,
    trackEvent,
    getMessagingLogs,
    listEmailTemplates,
    listWhatsAppNumbers,
    listWhatsAppTemplates
  ],
  triggers: []
});
