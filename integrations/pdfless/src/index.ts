import { Slate } from 'slates';
import { spec } from './spec';
import { generatePdf, listTemplates } from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [generatePdf, listTemplates],
  triggers: [inboundWebhook]
});
