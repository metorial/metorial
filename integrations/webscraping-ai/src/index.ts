import { Slate } from 'slates';
import { spec } from './spec';
import {
  askQuestion,
  extractFields,
  extractText,
  getAccountInfo,
  scrapeHtml,
  selectElements
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [scrapeHtml, extractText, askQuestion, extractFields, selectElements, getAccountInfo],
  triggers: [inboundWebhook]
});
