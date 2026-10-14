import { Slate } from 'slates';
import { spec } from './spec';
import {
  aiExtract,
  amazonPricing,
  amazonSearch,
  captureScreenshot,
  checkUsage,
  extractData,
  googleSearch,
  pageContent,
  runJsScenario,
  scrapeWebpage,
  walmartSearch,
  youtubeSearch,
  youtubeVideo
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    scrapeWebpage,
    extractData,
    aiExtract,
    captureScreenshot,
    runJsScenario,
    googleSearch,
    amazonSearch,
    amazonPricing,
    pageContent,
    youtubeSearch,
    youtubeVideo,
    walmartSearch,
    checkUsage
  ] as any,
  triggers: []
});
