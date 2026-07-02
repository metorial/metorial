import { Slate } from 'slates';
import { spec } from './spec';
import {
  generatePdf,
  getPageContent,
  runFunction,
  runPerformanceAudit,
  scrapePage,
  takeScreenshot,
  unblockPage,
  webSearch
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    scrapePage,
    getPageContent,
    generatePdf,
    takeScreenshot,
    unblockPage,
    runPerformanceAudit,
    webSearch,
    runFunction
  ],
  triggers: [inboundWebhook]
});
