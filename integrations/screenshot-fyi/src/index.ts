import { Slate } from 'slates';
import { spec } from './spec';
import { takeScreenshot } from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [takeScreenshot],
  triggers: [inboundWebhook]
});
