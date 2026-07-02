import { Slate } from 'slates';
import { spec } from './spec';
import { createLead } from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [createLead],
  triggers: [inboundWebhook]
});
