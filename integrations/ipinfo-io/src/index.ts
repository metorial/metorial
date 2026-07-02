import { Slate } from 'slates';
import { spec } from './spec';
import {
  batchLookup,
  getAbuseContact,
  getHostedDomains,
  getIpRanges,
  lookupAsn,
  lookupIp,
  lookupIpLite
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    lookupIp,
    lookupIpLite,
    lookupAsn,
    getAbuseContact,
    getIpRanges,
    getHostedDomains,
    batchLookup
  ],
  triggers: [inboundWebhook]
});
