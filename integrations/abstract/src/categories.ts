import { toolCategory } from 'slates';
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

export let toolCategories = [
  toolCategory({
    key: 'email-validation',
    name: 'Email Validation',
    description: 'Email deliverability and validation checks.',
    tools: [validateEmail]
  }),
  toolCategory({
    key: 'email-reputation',
    name: 'Email Reputation',
    description: 'Email reputation, sender enrichment, and breach signals.',
    tools: [emailReputation]
  }),
  toolCategory({
    key: 'phone-validation',
    name: 'Phone Validation',
    description: 'Phone validity, formatting, and carrier lookup.',
    tools: [validatePhone]
  }),
  toolCategory({
    key: 'phone-intelligence',
    name: 'Phone Intelligence',
    description: 'Phone line status, registration, risk, and breach details.',
    tools: [phoneIntelligence]
  }),
  toolCategory({
    key: 'ip-geolocation',
    name: 'IP Geolocation',
    description: 'IP location, timezone, network, and currency lookup.',
    tools: [geolocateIp]
  }),
  toolCategory({
    key: 'ip-intelligence',
    name: 'IP Intelligence',
    description: 'IP security, abuse, and network intelligence.',
    tools: [ipIntelligence]
  }),
  toolCategory({
    key: 'company-enrichment',
    name: 'Company Enrichment',
    description: 'Company details from a domain or email.',
    tools: [enrichCompany]
  }),
  toolCategory({
    key: 'exchange-rates',
    name: 'Exchange Rates',
    description: 'Live and historical exchange rates and conversion.',
    tools: [exchangeRates]
  }),
  toolCategory({
    key: 'holidays',
    name: 'Public Holidays',
    description: 'Country and date-specific holiday lookup.',
    tools: [publicHolidays]
  }),
  toolCategory({
    key: 'timezone',
    name: 'Timezones',
    description: 'Current time and timezone conversion.',
    tools: [timezone]
  }),
  toolCategory({
    key: 'web-scraping',
    name: 'Web Scraping',
    description: 'Website content extraction.',
    tools: [scrapeWebsite]
  }),
  toolCategory({
    key: 'screenshots',
    name: 'Website Screenshots',
    description: 'Website screenshot generation.',
    tools: [captureScreenshot]
  }),
  toolCategory({
    key: 'vat',
    name: 'VAT Validation and Rates',
    description: 'VAT number validation, calculation, and rates.',
    tools: [validateVat]
  }),
  toolCategory({
    key: 'iban',
    name: 'IBAN Validation',
    description: 'International bank account number validation.',
    tools: [validateIban]
  }),
  toolCategory({
    key: 'images',
    name: 'Image Processing',
    description: 'Image compression and optimization.',
    tools: [processImage]
  }),
  toolCategory({
    key: 'avatars',
    name: 'User Avatars',
    description: 'Customizable initials-based avatar generation.',
    tools: [generateAvatar]
  })
];
