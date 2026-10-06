import { Slate } from 'slates';
import { spec } from './spec';
import {
  downloadFile,
  exportUrl,
  generatePdf,
  getPageContent,
  manageCrawl,
  mapSite,
  runFunction,
  runPerformanceAudit,
  scrapePage,
  smartScrape,
  takeScreenshot,
  unblockPage,
  webSearch
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    scrapePage,
    getPageContent,
    smartScrape,
    generatePdf,
    takeScreenshot,
    exportUrl,
    downloadFile,
    unblockPage,
    runPerformanceAudit,
    webSearch,
    runFunction,
    mapSite,
    manageCrawl
  ],
  triggers: []
});
