import { Slate } from 'slates';
import { spec } from './spec';
import {
  captureScreenshot,
  extractData,
  getAccountInfo,
  getCrawlResults,
  getCrawlStatus,
  scrapeWebpage,
  startCrawl
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    scrapeWebpage,
    captureScreenshot,
    extractData,
    startCrawl,
    getCrawlStatus,
    getCrawlResults,
    getAccountInfo
  ],
  triggers: []
});
