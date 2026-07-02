import { Slate } from 'slates';
import { spec } from './spec';
import {
  extractArticle,
  extractData,
  extractProduct,
  fetchPage,
  renderPage,
  takeScreenshot
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [fetchPage, renderPage, takeScreenshot, extractProduct, extractArticle, extractData],
  triggers: [inboundWebhook]
});
