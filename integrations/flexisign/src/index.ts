import { Slate } from 'slates';
import { spec } from './spec';
import { getTemplate, listTemplates, sendDocument } from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [listTemplates, getTemplate, sendDocument],
  triggers: [inboundWebhook]
});
