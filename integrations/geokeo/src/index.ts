import { Slate } from 'slates';
import { spec } from './spec';
import { forwardGeocode, reverseGeocode } from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [forwardGeocode, reverseGeocode],
  triggers: [inboundWebhook]
});
