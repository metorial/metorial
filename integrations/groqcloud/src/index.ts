import { Slate } from 'slates';
import { spec } from './spec';
import {
  analyzeImage,
  cancelBatch,
  createBatch,
  generateSpeech,
  generateText,
  getBatch,
  getModel,
  listBatches,
  listModels,
  moderateContent,
  transcribeAudio,
  translateAudio
} from './tools';
import { batchStatus, inboundWebhook } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    generateText,
    transcribeAudio,
    translateAudio,
    generateSpeech,
    analyzeImage,
    moderateContent,
    listModels,
    getModel,
    createBatch,
    getBatch,
    listBatches,
    cancelBatch
  ],
  triggers: [inboundWebhook, batchStatus]
});
