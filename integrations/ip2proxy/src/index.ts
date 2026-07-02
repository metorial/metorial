import { Slate } from 'slates';
import { spec } from './spec';
import { checkCredits, lookupIp } from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [lookupIp, checkCredits],
  triggers: [inboundWebhook]
});
