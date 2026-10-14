import { Slate } from 'slates';
import { spec } from './spec';
import {
  extractDocument,
  getExtractionDetails,
  getExtractionStatus,
  getHighlights,
  getTagUsage,
  getUsageInfo,
  manageWebhook,
  retrieveExtraction
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    extractDocument,
    getExtractionStatus,
    retrieveExtraction,
    getHighlights,
    getUsageInfo,
    getExtractionDetails,
    getTagUsage,
    manageWebhook
  ],
  triggers: []
});
