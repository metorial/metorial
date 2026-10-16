import { Slate } from 'slates';
import { toolCategories } from './categories';
import { spec } from './spec';
import {
  analyzeSentiment,
  callApi,
  checkSpelling,
  checkSsl,
  convertCurrency,
  dnsLookup,
  generateQrCode,
  getFileUrl,
  getUsage,
  getWeather,
  lookupIp,
  translateText,
  validateEmail,
  validatePhone
} from './tools';

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
    callApi,
    getUsage,
    translateText,
    getFileUrl
  ],
  toolCategories,
  triggers: []
});
