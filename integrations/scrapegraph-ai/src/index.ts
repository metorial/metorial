import { Slate } from 'slates';
import { spec } from './spec';
import {
  agenticScrape,
  crawlWebsite,
  discoverSitemap,
  getCredits,
  getRequestStatus,
  markdownify,
  rawScrape,
  smartScrape,
  webSearch
} from './tools';
import { crawlCompleted } from './triggers';

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
    getRequestStatus
  ],
  triggers: [crawlCompleted]
});
