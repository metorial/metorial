import { Slate } from 'slates';
import { spec } from './spec';
import {
  createForm,
  createWorkspace,
  deleteForm,
  deleteSubmission,
  deleteWorkspace,
  downloadSubmissionPdf,
  getForm,
  getSubmission,
  getUser,
  getWorkspace,
  listForms,
  listQuestions,
  listSubmissions,
  listWorkspaces,
  updateForm
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getWorkspace,
    downloadSubmissionPdf,
    listForms,
    getForm,
    createForm,
    updateForm,
    deleteForm,
    listSubmissions,
    getSubmission,
    deleteSubmission,
    listQuestions,
    getUser,
    listWorkspaces,
    createWorkspace,
    deleteWorkspace
  ],
  triggers: []
});
