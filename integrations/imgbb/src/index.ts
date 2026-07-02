import { Slate } from 'slates';
import { spec } from './spec';
import { uploadImage } from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [uploadImage],
  triggers: [inboundWebhook]
});
