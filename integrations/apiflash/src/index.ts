import { Slate } from 'slates';
import { spec } from './spec';
import { captureScreenshot, checkQuota, extractContent } from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [captureScreenshot, checkQuota, extractContent],
  triggers: [inboundWebhook]
});
