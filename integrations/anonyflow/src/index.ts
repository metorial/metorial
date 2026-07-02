import { Slate } from 'slates';
import { spec } from './spec';
import { protectData, protectValue, unprotectData } from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [protectData, unprotectData, protectValue],
  triggers: [inboundWebhook]
});
