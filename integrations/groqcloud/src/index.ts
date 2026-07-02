import { Slate } from 'slates';
import { spec } from './spec';
import {
  analyzeImage,
  cancelBatch,
  createBatch,
  createResponse,
  deleteFile,
  downloadFile,
  generateSpeech,
  generateText,
  getBatch,
  getFile,
  getModel,
  listBatches,
  listFiles,
  listModels,
  moderateContent,
  transcribeAudio,
  translateAudio,
  uploadFile
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
    createResponse,
    listModels,
    getModel,
    uploadFile,
    listFiles,
    getFile,
    downloadFile,
    deleteFile,
    createBatch,
    getBatch,
    listBatches,
    cancelBatch
  ],
  triggers: [inboundWebhook, batchStatus]
});
