import { Slate } from 'slates';
import { spec } from './spec';
import { createLink, deleteLink, updateLink } from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [createLink, updateLink, deleteLink],
  triggers: [inboundWebhook]
});
