import { Slate } from 'slates';
import { spec } from './spec';
import { bulkLookupIps, checkThreat, lookupAsn, lookupIp } from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [lookupIp, bulkLookupIps, lookupAsn, checkThreat],
  triggers: [inboundWebhook]
});
