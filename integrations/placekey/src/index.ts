import { Slate } from 'slates';
import { spec } from './spec';
import { bulkLookupPlacekeys, lookupPlacekey } from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [lookupPlacekey, bulkLookupPlacekeys],
  triggers: [inboundWebhook]
});
