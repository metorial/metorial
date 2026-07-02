import { Slate } from '@slates/provider';
import { spec } from './spec';
import {
  cloneFormTool,
  createFormTool,
  createReportTool,
  createSubmissionTool,
  deleteFormTool,
  deleteSubmissionTool,
  getFormTool,
  getSubmissionTool,
  getUserTool,
  listFoldersTool,
  listFormFilesTool,
  listFormsTool,
  listReportsTool,
  listSubmissionsTool,
  manageFormQuestionTool,
  manageWebhooksTool,
  updateFormTool,
  updateSubmissionTool
} from './tools';
import { formSubmissionWebhookTrigger, newSubmissionPollingTrigger } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listFormsTool,
    getFormTool,
    createFormTool,
    updateFormTool,
    deleteFormTool,
    cloneFormTool,
    listSubmissionsTool,
    getSubmissionTool,
    createSubmissionTool,
    updateSubmissionTool,
    deleteSubmissionTool,
    getUserTool,
    listFoldersTool,
    manageWebhooksTool,
    listReportsTool,
    createReportTool,
    listFormFilesTool,
    manageFormQuestionTool
  ],
  triggers: [formSubmissionWebhookTrigger, newSubmissionPollingTrigger]
});
