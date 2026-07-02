import { Slate } from 'slates';
import { spec } from './spec';
import { convertDocument, extractText, getAccountInfo } from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [extractText, convertDocument, getAccountInfo],
  triggers: [inboundWebhook]
});
