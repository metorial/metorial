import { Slate } from 'slates';
import { spec } from './spec';
import { extractText, extractTextWithCoordinates, generateSearchablePdf } from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [extractText, generateSearchablePdf, extractTextWithCoordinates],
  triggers: [inboundWebhook]
});
