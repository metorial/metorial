import { Slate } from 'slates';
import { spec } from './spec';
import {
  appendContactData,
  carrierLookup,
  checkBalance,
  dncCheck,
  fraudDetection,
  genderLookup,
  getAccountInfo,
  getUsage,
  ipGeolocation,
  nameLookup,
  profileDataLookup,
  propertyDataLookup,
  reverseEmailLookup,
  reversePhoneLookup,
  smsGatewayLookup,
  verifyEmail,
  verifyPhone,
  verifyPhoneOwner,
  verifyPostalAddress,
  zipcodeLookup
} from './tools';

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
    checkBalance,
    getAccountInfo,
    getUsage,
    verifyPhoneOwner
  ],
  triggers: []
});
