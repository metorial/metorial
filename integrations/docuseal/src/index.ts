import { Slate } from 'slates';
import { spec } from './spec';
import {
  archiveSubmission,
  archiveTemplate,
  cloneTemplate,
  createSubmission,
  createSubmissionFromPdf,
  createTemplate,
  getSubmission,
  getSubmitter,
  getTemplate,
  listSubmissions,
  listSubmitters,
  listTemplates,
  mergeTemplates,
  updateSubmitter,
  updateTemplate
} from './tools';
import { formEvent, submissionEvent, templateEvent } from './triggers';

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
    getSubmission,
    archiveSubmission,
    listSubmitters,
    getSubmitter,
    updateSubmitter
  ],
  triggers: [formEvent, submissionEvent, templateEvent]
});
