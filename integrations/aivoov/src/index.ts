import { Slate } from 'slates';
import { spec } from './spec';
import { generateAudio, listVoices } from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [generateAudio, listVoices],
  triggers: [inboundWebhook]
});
