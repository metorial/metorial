import { Slate } from 'slates';
import { spec } from './spec';
import {
  badWordFilterTool,
  binLookupTool,
  convertTool,
  domainLookupTool,
  geocodeAddressTool,
  geocodeReverseTool,
  hostReputationTool,
  ipBlocklistTool,
  ipInfoTool,
  ipProbeTool,
  smsVerifyTool,
  urlInfoTool,
  validateEmailTool,
  validatePhoneTool,
  verifyEmailTool,
  verifySecurityCodeTool
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
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
  triggers: [inboundWebhook]
});
