import { Slate } from 'slates';
import { spec } from './spec';
import {
  createDocument,
  createDocumentFromTemplate,
  createTemplate,
  deleteDocument,
  deleteTemplate,
  getCompletedPdf,
  getCurrentUser,
  getDocument,
  getTemplate,
  sendDocument,
  sendReminder,
  updateDocumentRecipients,
  updateTemplate
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getCurrentUser,
    createDocument,
    createDocumentFromTemplate,
    getDocument,
    sendDocument,
    sendReminder,
    deleteDocument,
    getCompletedPdf,
    updateDocumentRecipients,
    getTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate
  ],
  triggers: []
});
