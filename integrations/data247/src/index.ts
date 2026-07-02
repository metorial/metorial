import { Slate } from 'slates';
import { spec } from './spec';
import {
  appendContactData,
  carrierLookup,
  checkBalance,
  dncCheck,
  fraudDetection,
  genderLookup,
  ipGeolocation,
  nameLookup,
  profileDataLookup,
  propertyDataLookup,
  reverseEmailLookup,
  reversePhoneLookup,
  smsGatewayLookup,
  verifyEmail,
  verifyPhone,
  verifyPostalAddress,
  zipcodeLookup
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    carrierLookup,
    smsGatewayLookup,
    verifyEmail,
    verifyPostalAddress,
    verifyPhone,
    reversePhoneLookup,
    reverseEmailLookup,
    appendContactData,
    nameLookup,
    genderLookup,
    zipcodeLookup,
    profileDataLookup,
    propertyDataLookup,
    ipGeolocation,
    dncCheck,
    fraudDetection,
    checkBalance
  ],
  triggers: [inboundWebhook]
});
