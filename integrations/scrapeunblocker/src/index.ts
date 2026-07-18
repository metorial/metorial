import { Slate } from 'slates';
import { spec } from './spec';
import { scrapeUrl, searchGoogle } from './tools';
import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [scrapeUrl, searchGoogle],
  triggers: [inboundWebhook]
});
