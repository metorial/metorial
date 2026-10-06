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
  triggers: []
});
