import { Slate } from 'slates';
import { spec } from './spec';
import {
  clearCache,
  manageDomains,
  manageSitemaps,
  recacheUrls,
  renderPage,
  searchCache,
  setRecacheSpeed
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    recacheUrls,
    searchCache,
    clearCache,
    manageSitemaps,
    manageDomains,
    setRecacheSpeed,
    renderPage
  ],
  triggers: [inboundWebhook]
});
