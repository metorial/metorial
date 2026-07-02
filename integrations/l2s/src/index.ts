import { Slate } from 'slates';
import { spec } from './spec';
import { getUrl, getUserSettings, shortenUrl, updateUrl } from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [shortenUrl, getUrl, updateUrl, getUserSettings],
  triggers: [inboundWebhook]
});
