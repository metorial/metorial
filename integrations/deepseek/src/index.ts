import { Slate } from 'slates';
import { spec } from './spec';
import { chatCompletion, fimCompletion, getBalance, listModels } from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [chatCompletion, fimCompletion, listModels, getBalance],
  triggers: [inboundWebhook]
});
