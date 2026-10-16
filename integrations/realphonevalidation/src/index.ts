import { Slate } from 'slates';
import { spec } from './spec';
import {
  checkPhoneActive,
  checkReassignedNumber,
  dncLookup,
  identifyPhoneType,
  scoreFraudRisk,
  scrubPhone,
  validateEmailLightning,
  validatePhone,
  verifyEmail
} from './tools';

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
    verifyEmail,
    validateEmailLightning
  ],
  triggers: []
});
