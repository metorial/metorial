import { Slate } from 'slates';
import { spec } from './spec';
import {
  addressAutocompleteTool,
  addressMetadataTool,
  addressVerificationTool,
  locationMetadataTool,
  locationSearchTool,
  reverseGeocodeTool,
  verifyEmailTool,
  verifyPhoneTool
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    addressAutocompleteTool,
    addressMetadataTool,
    addressVerificationTool,
    locationSearchTool,
    locationMetadataTool,
    reverseGeocodeTool,
    verifyEmailTool,
    verifyPhoneTool
  ],
  triggers: [inboundWebhook]
});
