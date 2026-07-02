import { Slate } from 'slates';
import { spec } from './spec';
import { agentCompletion, chatCompletion, generateEmbeddings, webSearch } from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [chatCompletion, webSearch, agentCompletion, generateEmbeddings],
  triggers: [inboundWebhook]
});
