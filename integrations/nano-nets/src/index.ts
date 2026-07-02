import { Slate } from 'slates';
import { spec } from './spec';
import {
  assignFiles,
  classifyImage,
  createModel,
  deleteFiles,
  detectObjects,
  extractDocumentData,
  extractFullText,
  getModel,
  getPredictionResults,
  listProcessedFiles,
  retryFileProcessing,
  reviewFile,
  trainModel,
  updateFileFields,
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
    assignFiles,
    updateFileFields,
    deleteFiles,
    trainModel,
    uploadTrainingData,
    classifyImage,
    detectObjects,
    extractFullText,
    retryFileProcessing
  ],
  triggers: [documentProcessed]
});
