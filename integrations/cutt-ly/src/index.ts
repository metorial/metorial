import { Slate } from 'slates';
import { spec } from './spec';
import { deleteLink, editLink, getLinkAnalytics, shortenUrl } from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [shortenUrl, editLink, getLinkAnalytics, deleteLink],
  triggers: [inboundWebhook]
});
