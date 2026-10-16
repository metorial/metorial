import { Slate } from 'slates';
import { spec } from './spec';
import {
  confirmOrder,
  createExport,
  createOrder,
  createTranslationOrder,
  deleteTranscription,
  downloadExport,
  downloadTranscriptionMedia,
  exportTranscription,
  getExport,
  getMeetingSummary,
  getOrder,
  getTranscription,
  getUploadUrl,
  listGlossaries,
  listOrganizations,
  listStyleGuides,
  listTranscriptions,
  updateTranscription
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    createExport,
    getExport,
    downloadExport,
    listOrganizations,
    updateTranscription,
    getMeetingSummary,
    downloadTranscriptionMedia,
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
  triggers: []
});
