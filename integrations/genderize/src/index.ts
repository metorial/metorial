import { Slate } from 'slates';
import { spec } from './spec';
import { predictGender } from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [predictGender],
  triggers: [inboundWebhook]
});
