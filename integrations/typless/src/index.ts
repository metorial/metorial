import { Slate } from 'slates';
import { spec } from './spec';
import {
  addDocumentFeedback,
  extractDocument,
  getExtractionResult,
  listDocumentTypes,
  manageUserProfile,
  startTraining
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    extractDocument,
    addDocumentFeedback,
    startTraining,
    listDocumentTypes,
    manageUserProfile,
    getExtractionResult
  ],
  triggers: [inboundWebhook]
});
