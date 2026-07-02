import { Slate } from 'slates';
import { spec } from './spec';
import {
  createDocument,
  createDocumentFromTemplate,
  createTemplate,
  deleteDocument,
  deleteTemplate,
  getCompletedPdf,
  getDocument,
  getTemplate,
  sendDocument,
  sendReminder,
  updateDocumentRecipients,
  updateTemplate
} from './tools';
import { documentEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
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
  triggers: [documentEvents]
});
