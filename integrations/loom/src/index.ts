import { Slate } from 'slates';
import { spec } from './spec';
import { generateEmbedCode, getVideoMetadata, replaceLoomUrls } from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [getVideoMetadata, generateEmbedCode, replaceLoomUrls],
  triggers: [inboundWebhook]
});
