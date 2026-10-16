import { Slate } from 'slates';
import { toolCategories } from './categories';
import { spec } from './spec';
import {
  captureScreenshot,
  emailReputation,
  enrichCompany,
  exchangeRates,
  generateAvatar,
  geolocateIp,
  ipIntelligence,
  phoneIntelligence,
  processImage,
  publicHolidays,
  scrapeWebsite,
  timezone,
  validateEmail,
  validateIban,
  validatePhone,
  validateVat
} from './tools';

export let provider = Slate.create({
  spec,
  toolCategories,
  tools: [
    emailReputation,
    phoneIntelligence,
    ipIntelligence,
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
  triggers: []
});
