import { Slate } from 'slates';
import { spec } from './spec';
import {
  checkQueueStatus,
  generateImage,
  generateSpeech,
  generateVideo,
  getAccount,
  getModelPricing,
  runModel,
  searchModels,
  submitQueueRequest,
  transcribeAudio,
  uploadFile
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    generateImage,
    generateVideo,
    transcribeAudio,
    generateSpeech,
    searchModels,
    getAccount,
    getModelPricing,
    submitQueueRequest,
    checkQueueStatus,
    uploadFile,
    runModel
  ],
  triggers: []
});
