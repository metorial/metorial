import { Slate } from 'slates';
import { spec } from './spec';
import {
  createScraperTool,
  deleteScraperTool,
  extractDataTool,
  extractMarkdownTool,
  listScrapersTool,
  parseContentTool,
  runScraperTool
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    extractDataTool,
    parseContentTool,
    extractMarkdownTool,
    createScraperTool,
    runScraperTool,
    listScrapersTool,
    deleteScraperTool
  ],
  triggers: [inboundWebhook]
});
