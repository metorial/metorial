import { Slate, type SlateTool } from 'slates';
import { spec } from './spec';
import { captureScreenshot, extractContent, queryPage, scrapeHtml, unfurlUrl } from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    unfurlUrl,
    scrapeHtml,
    captureScreenshot,
    extractContent,
    queryPage
  ] as unknown as SlateTool<any, any, any, any>[],
  triggers: [inboundWebhook]
});
