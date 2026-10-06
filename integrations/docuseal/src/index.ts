import { Slate } from 'slates';
import { spec } from './spec';
import {
  archiveSubmission,
  archiveTemplate,
  cloneTemplate,
  createSubmission,
  createSubmissionFromPdf,
  createTemplate,
  downloadSubmissionDocuments,
  getSubmission,
  getSubmitter,
  getTemplate,
  listSubmissions,
  listSubmitters,
  listTemplates,
  mergeTemplates,
  updateSubmission,
  updateSubmitter,
  updateTemplate
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listTemplates,
    getTemplate,
    createTemplate,
    updateTemplate,
    cloneTemplate,
    mergeTemplates,
    archiveTemplate,
    createSubmission,
    createSubmissionFromPdf,
    listSubmissions,
    downloadSubmissionDocuments,
    getSubmission,
    archiveSubmission,
    listSubmitters,
    getSubmitter,
    updateSubmission,
    updateSubmitter
  ],
  triggers: []
});
