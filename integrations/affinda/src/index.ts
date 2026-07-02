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
  listWorkspaces,
  matchResumeToJob,
  redactResume,
  searchAndMatch,
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
    listDocumentTypes,
    listOrganizations
  ],
  triggers: [documentEvents]
});
