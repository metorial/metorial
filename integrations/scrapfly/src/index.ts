import { Slate } from 'slates';
import { spec } from './spec';
import {
  cancelCrawl,
  captureScreenshot,
  downloadCrawlArtifact,
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
    cancelCrawl,
    downloadCrawlArtifact,
    getAccountInfo
  ],
  triggers: []
});
