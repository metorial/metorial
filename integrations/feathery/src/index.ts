import { Slate } from 'slates';
import { spec } from './spec';
import {
  copyForm,
  createForm,
  createHiddenField,
  createSubmission,
  createUser,
  createWorkspace,
  deleteForm,
  deleteUser,
  deleteWorkspace,
  exportSubmissionPdf,
  fillDocument,
  getForm,
  getLogs,
  getUser,
  inviteTeamMember,
  listDocumentEnvelopes,
  listDocumentTemplates,
  listExtractionRuns,
  listForms,
  listHiddenFields,
  listSubmissions,
  listUsers,
  listWorkspaces,
  removeTeamMember,
  updateForm,
  updateWorkspace
} from './tools';
import { formEvent } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listForms,
    getForm,
    createForm,
    updateForm,
    deleteForm,
    copyForm,
    listSubmissions,
    createSubmission,
    exportSubmissionPdf,
    listUsers,
    getUser,
    createUser,
    deleteUser,
    fillDocument,
    listDocumentTemplates,
    listDocumentEnvelopes,
    listExtractionRuns,
    listWorkspaces,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    listHiddenFields,
    createHiddenField,
    inviteTeamMember,
    removeTeamMember,
    getLogs
  ],
  triggers: [formEvent]
});
