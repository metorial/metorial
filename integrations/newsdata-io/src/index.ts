import { Slate } from 'slates';
import { spec } from './spec';
import { discoverSources, searchArticles, topHeadlines } from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [searchArticles, topHeadlines, discoverSources],
  triggers: [inboundWebhook]
});
