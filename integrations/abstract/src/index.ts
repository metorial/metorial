import { Slate } from 'slates';
import { spec } from './spec';
import {
  captureScreenshot,
  enrichCompany,
  exchangeRates,
  generateAvatar,
  geolocateIp,
  processImage,
  publicHolidays,
  scrapeWebsite,
  timezone,
  validateEmail,
  validateIban,
  validatePhone,
  validateVat
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    validateEmail,
    validatePhone,
    geolocateIp,
    enrichCompany,
    exchangeRates,
    publicHolidays,
    timezone,
    scrapeWebsite,
    captureScreenshot,
    validateVat,
    validateIban,
    processImage,
    generateAvatar
  ],
  triggers: [inboundWebhook]
});
