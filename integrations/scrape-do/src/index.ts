import { Slate } from 'slates';
import { spec } from './spec';
import {
  amazonProduct,
  amazonSearch,
  createAsyncJob,
  getAccountStats,
  getAsyncJob,
  getCurrentUser,
  googleSearch,
  scrapeWebpage,
  takeScreenshot
} from './tools';
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
    getAccountStats,
    getCurrentUser
  ],
  triggers: []
});
