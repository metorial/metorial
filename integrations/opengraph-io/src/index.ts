import { Slate } from 'slates';
import { spec } from './spec';
import {
  captureScreenshot,
  convertToMarkdown,
  extractContent,
  getFileUrl,
  getOembed,
  queryPage,
  scrapeHtml,
  unfurlUrl
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    unfurlUrl,
    scrapeHtml,
    captureScreenshot,
    extractContent,
    queryPage,
    convertToMarkdown,
    getOembed,
    getFileUrl
  ],
  triggers: []
});
