import { Slate } from 'slates';
import { toolCategories } from './categories';
import { spec } from './spec';
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

export let provider = Slate.create({
  spec,
  toolCategories,
  tools: [
    getDomainDetailsTool,
    lookupUserAgentTool,
    phoneVerifyTool,
    qrCodeTool,
    renderHtmlTool,
    resizeImageTool,
    validateEmailTool,
    verifyEmailTool,
    validatePhoneTool,
    ipInfoTool,
    ipBlocklistTool,
    ipProbeTool,
    hostReputationTool,
    domainLookupTool,
    geocodeAddressTool,
    geocodeReverseTool,
    binLookupTool,
    convertTool,
    badWordFilterTool,
    smsVerifyTool,
    verifySecurityCodeTool,
    urlInfoTool
  ],
  triggers: []
});
