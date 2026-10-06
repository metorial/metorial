import { Slate } from 'slates';
import { spec } from './spec';
import {
  aiExtract,
  amazonSearch,
  captureScreenshot,
  checkUsage,
  extractData,
  googleSearch,
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
    youtubeSearch,
    youtubeVideo,
    walmartSearch,
    checkUsage
  ] as any,
  triggers: []
});
