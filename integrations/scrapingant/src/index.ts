import { Slate } from 'slates';
import { spec } from './spec';
import {
  checkUsage,
  downloadMarkdown,
  extractData,
  scrapeAsMarkdown,
  scrapeExtended,
  scrapeWebpage
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    scrapeWebpage,
    scrapeAsMarkdown,
    extractData,
    scrapeExtended,
    checkUsage,
    downloadMarkdown
  ],
  triggers: []
});
