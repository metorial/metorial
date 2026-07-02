import { Slate } from 'slates';
import { spec } from './spec';
import {
  analyzeSentiment,
  callApi,
  checkSpelling,
  checkSsl,
  convertCurrency,
  dnsLookup,
  generateQrCode,
  getWeather,
  lookupIp,
  validateEmail,
  validatePhone
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    validateEmail,
    validatePhone,
    getWeather,
    convertCurrency,
    dnsLookup,
    checkSsl,
    lookupIp,
    analyzeSentiment,
    checkSpelling,
    generateQrCode,
    callApi
  ],
  triggers: [inboundWebhook]
});
