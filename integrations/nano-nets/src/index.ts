import { Slate } from 'slates';
import { spec } from './spec';
import {
  classifyImage,
  createModel,
  detectObjects,
  extractDocumentData,
  extractFullText,
  getModel,
  getPredictionResults,
  listProcessedFiles,
  retryFileProcessing,
  reviewFile,
  trainModel,
  uploadTrainingData
} from './tools';
import { documentProcessed } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createModel,
    getModel,
    extractDocumentData,
    getPredictionResults,
    listProcessedFiles,
    reviewFile,
    trainModel,
    uploadTrainingData,
    classifyImage,
    detectObjects,
    extractFullText,
    retryFileProcessing
  ],
  triggers: [documentProcessed]
});
