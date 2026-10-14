import { Slate } from 'slates';
import { spec } from './spec';
import {
  agenticScrape,
  crawlWebsite,
  discoverSitemap,
  extractData,
  generateSchema,
  getCredits,
  getRequestStatus,
  listHistory,
  markdownify,
  rawScrape,
  smartScrape,
  webSearch
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    smartScrape,
    webSearch,
    crawlWebsite,
    markdownify,
    rawScrape,
    discoverSitemap,
    agenticScrape,
    getCredits,
    getRequestStatus,
    extractData,
    generateSchema,
    listHistory
  ],
  triggers: []
});
