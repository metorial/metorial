import { Slate } from 'slates';
import { spec } from './spec';
import {
  checkPhoneActive,
  checkReassignedNumber,
  dncLookup,
  identifyPhoneType,
  scoreFraudRisk,
  scrubPhone,
  validatePhone,
  verifyEmail
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    validatePhone,
    scrubPhone,
    checkPhoneActive,
    identifyPhoneType,
    dncLookup,
    scoreFraudRisk,
    checkReassignedNumber,
    verifyEmail
  ],
  triggers: [inboundWebhook]
});
