import { toolCategory } from 'slates';
import {
  badWordFilterTool,
  binLookupTool,
  convertTool,
  domainLookupTool,
  geocodeAddressTool,
  geocodeReverseTool,
  getDomainDetailsTool,
  hostReputationTool,
  ipBlocklistTool,
  ipInfoTool,
  ipProbeTool,
  lookupUserAgentTool,
  phoneVerifyTool,
  qrCodeTool,
  renderHtmlTool,
  resizeImageTool,
  smsVerifyTool,
  urlInfoTool,
  validateEmailTool,
  validatePhoneTool,
  verifyEmailTool,
  verifySecurityCodeTool
} from './tools';

// These API families follow the provider's API documentation and OpenAPI tags.
export const toolCategories = [
  toolCategory({
    key: 'data-tools',
    name: 'Data Tools',
    description: 'Email and phone validation, user-agent lookup, and text moderation.',
    tools: [validateEmailTool, validatePhoneTool, lookupUserAgentTool, badWordFilterTool]
  }),
  toolCategory({
    key: 'www',
    name: 'WWW',
    description: 'URL analysis and web content metadata.',
    tools: [urlInfoTool]
  }),
  toolCategory({
    key: 'telephony',
    name: 'Telephony',
    description: 'SMS and voice verification codes and code validation.',
    tools: [smsVerifyTool, phoneVerifyTool, verifySecurityCodeTool]
  }),
  toolCategory({
    key: 'geolocation',
    name: 'Geolocation',
    description: 'IP geolocation, address search, and reverse geocoding.',
    tools: [ipInfoTool, geocodeAddressTool, geocodeReverseTool]
  }),
  toolCategory({
    key: 'security-networking',
    name: 'Security and Networking',
    description: 'Domain and IP reputation, network intelligence, and SMTP verification.',
    tools: [
      domainLookupTool,
      getDomainDetailsTool,
      ipBlocklistTool,
      ipProbeTool,
      hostReputationTool,
      verifyEmailTool
    ]
  }),
  toolCategory({
    key: 'e-commerce',
    name: 'E-commerce',
    description: 'Card BIN lookup and currency or unit conversion.',
    tools: [binLookupTool, convertTool]
  }),
  toolCategory({
    key: 'imaging',
    name: 'Imaging',
    description: 'QR codes, barcodes, HTML rendering, and image resizing.',
    tools: [qrCodeTool, renderHtmlTool, resizeImageTool]
  })
];
