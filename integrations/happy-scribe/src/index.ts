import { Slate } from 'slates';
import { spec } from './spec';
import {
  confirmOrder,
  createOrder,
  createTranslationOrder,
  deleteTranscription,
  exportTranscription,
  getOrder,
  getTranscription,
  getUploadUrl,
  listGlossaries,
  listStyleGuides,
  listTranscriptions
} from './tools';
import { inboundWebhook, transcriptionUpdated } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createOrder,
    createTranslationOrder,
    getOrder,
    confirmOrder,
    listTranscriptions,
    getTranscription,
    deleteTranscription,
    exportTranscription,
    getUploadUrl,
    listGlossaries,
    listStyleGuides
  ],
  triggers: [inboundWebhook, transcriptionUpdated]
});
