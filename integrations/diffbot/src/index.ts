import { Slate } from 'slates';
import { spec } from './spec';
import {
  analyzeText,
  enhanceEntity,
  extractPage,
  manageBulkJob,
  manageCrawl,
  searchKnowledgeGraph
} from './tools';
import { crawlBulkJobCompleted, inboundWebhook } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    extractPage,
    searchKnowledgeGraph,
    enhanceEntity,
    analyzeText,
    manageCrawl,
    manageBulkJob
  ],
  triggers: [inboundWebhook, crawlBulkJobCompleted]
});
