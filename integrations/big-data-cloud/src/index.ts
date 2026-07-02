import { Slate } from 'slates';
import { spec } from './spec';
import {
  assessIpRiskTool,
  geolocateIpTool,
  lookupAsnTool,
  lookupNetworkTool,
  reverseGeocodeTool,
  validatePhoneNumberTool,
  verifyEmailTool
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    geolocateIpTool,
    assessIpRiskTool,
    reverseGeocodeTool,
    validatePhoneNumberTool,
    verifyEmailTool,
    lookupAsnTool,
    lookupNetworkTool
  ],
  triggers: [inboundWebhook]
});
