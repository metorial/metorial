import { Slate } from 'slates';
import { spec } from './spec';
import {
  analyzeText,
  enhanceEntity,
  extractPage,
  getAccount,
  manageBulkJob,
  manageCrawl,
  searchKnowledgeGraph,
  webSearch
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    extractPage,
    searchKnowledgeGraph,
    enhanceEntity,
    analyzeText,
    manageCrawl,
    manageBulkJob,
    getAccount,
    webSearch
  ],
  triggers: []
});
