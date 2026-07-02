import { Slate } from 'slates';
import { spec } from './spec';
import {
  extractDocument,
  getExtractionStatus,
  getHighlights,
  getUsageInfo,
  manageWebhook,
  retrieveExtraction
} from './tools';
import { extractionCompleted } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    extractDocument,
    getExtractionStatus,
    retrieveExtraction,
    getHighlights,
    getUsageInfo,
    manageWebhook
  ],
  triggers: [extractionCompleted]
});
