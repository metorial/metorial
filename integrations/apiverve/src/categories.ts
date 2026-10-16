import { toolCategory } from 'slates';
import {
  analyzeSentiment,
  checkSpelling,
  checkSsl,
  convertCurrency,
  dnsLookup,
  generateQrCode,
  getWeather,
  lookupIp,
  translateText,
  validateEmail,
  validatePhone
} from './tools';

export let toolCategories = [
  toolCategory({
    key: 'data_validation',
    name: 'Data Validation',
    description: 'Email and phone validation APIs.',
    tools: [validateEmail, validatePhone]
  }),
  toolCategory({
    key: 'weather',
    name: 'Weather',
    description: 'Current conditions and weather forecasts.',
    tools: [getWeather]
  }),
  toolCategory({
    key: 'finance',
    name: 'Finance',
    description: 'Currency conversion and exchange-rate data.',
    tools: [convertCurrency]
  }),
  toolCategory({
    key: 'domain_data',
    name: 'Domain Data',
    description: 'DNS records and SSL certificate inspection.',
    tools: [dnsLookup, checkSsl]
  }),
  toolCategory({
    key: 'geography',
    name: 'Geography',
    description: 'IP geolocation data.',
    tools: [lookupIp]
  }),
  toolCategory({
    key: 'text_processing',
    name: 'Text Processing',
    description: 'Sentiment, spelling and translation APIs.',
    tools: [analyzeSentiment, checkSpelling, translateText]
  }),
  toolCategory({
    key: 'data_generation',
    name: 'Data Generation',
    description: 'Downloadable QR code generation.',
    tools: [generateQrCode]
  })
];
