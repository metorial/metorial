import { Slate } from 'slates';
import { spec } from './spec';
import {
  batchUpdateAnnotations,
  createWorkspace,
  deleteDocument,
  deleteWorkspace,
  getDocument,
  listAnnotations,
  listDocuments,
  listDocumentTypes,
  listOrganizations,
  listValidationResults,
  listWorkspaces,
  manageSearchIndexes,
  manageTags,
  matchResumeToJob,
  redactResume,
  searchAndMatch,
  updateDocument,
  uploadDocument
} from './tools';
import { documentEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    uploadDocument,
    getDocument,
    listDocuments,
    deleteDocument,
    redactResume,
    searchAndMatch,
    matchResumeToJob,
    listWorkspaces,
    createWorkspace,
    deleteWorkspace,
    listAnnotations,
    batchUpdateAnnotations,
    updateDocument,
    manageTags,
    manageSearchIndexes,
    listValidationResults,
    listDocumentTypes,
    listOrganizations
  ],
  triggers: [documentEvents]
});
