import { Slate } from 'slates';
import { spec } from './spec';
import {
  addDocumentFeedback,
  addTrainingDocument,
  extractDocument,
  extractDocumentAsync,
  getCurrentUser,
  getExtractionData,
  getExtractionResult,
  listDocumentTypes,
  listPendingExtractions,
  manageUserProfile,
  startTraining
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    extractDocument,
    addDocumentFeedback,
    startTraining,
    listDocumentTypes,
    manageUserProfile,
    getExtractionResult,
    extractDocumentAsync,
    getExtractionData,
    listPendingExtractions,
    addTrainingDocument,
    getCurrentUser
  ],
  triggers: []
});
