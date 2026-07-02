import { Slate } from 'slates';
import { spec } from './spec';
import {
  createOrUpdateContact,
  deleteContacts,
  getMessagingLogs,
  getPhonebookFields,
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
import {
  emailDeliveryReport,
  rcsDeliveryReport,
  smsDeliveryReport,
  voiceCallReport,
  whatsappDeliveryReport
} from './triggers';

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
    getMessagingLogs
  ],
  triggers: [
    smsDeliveryReport,
    emailDeliveryReport,
    whatsappDeliveryReport,
    voiceCallReport,
    rcsDeliveryReport
  ]
});
