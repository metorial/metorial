import { Slate } from 'slates';
import { spec } from './spec';
import {
  amazonProduct,
  amazonSearch,
  createAsyncJob,
  getAccountStats,
  getAsyncJob,
  googleSearch,
  scrapeWebpage,
  takeScreenshot
} from './tools';
import { scrapeResult } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    scrapeWebpage,
    takeScreenshot,
    googleSearch,
    amazonProduct,
    amazonSearch,
    createAsyncJob,
    getAsyncJob,
    getAccountStats
  ],
  triggers: [scrapeResult]
});
