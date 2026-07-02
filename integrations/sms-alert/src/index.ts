import { Slate } from 'slates';
import { spec } from './spec';
import {
  checkBalance,
  getDeliveryStatus,
  getSmsReport,
  listSenderIds,
  manageContacts,
  manageGroups,
  manageShortUrls,
  manageTemplates,
  scheduleSms,
  sendOtp,
  sendSms,
  validateOtp
} from './tools';
import { inboundWebhook, smsReport } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    sendSms,
    scheduleSms,
    sendOtp,
    validateOtp,
    manageContacts,
    manageGroups,
    manageTemplates,
    checkBalance,
    listSenderIds,
    getSmsReport,
    getDeliveryStatus,
    manageShortUrls
  ],
  triggers: [inboundWebhook, smsReport]
});
