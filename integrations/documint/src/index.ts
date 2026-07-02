import { Slate } from 'slates';
import { spec } from './spec';
import { createDocument, listTemplates } from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [listTemplates, createDocument],
  triggers: [inboundWebhook]
});
