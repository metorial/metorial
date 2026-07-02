import { Slate } from 'slates';
import { spec } from './spec';
import {
  createFolder,
  createUploadSession,
  documentCheckinCheckout,
  documentPreview,
  documentVersions,
  downloadDocument,
  getDocument,
  listDocuments,
  listPermissions,
  manageDocument,
  removePermission,
  searchDocuments,
  shareDocument,
  uploadDocument
} from './tools';
import { driveItemChanges } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    getDocument,
    listDocuments,
    searchDocuments,
    uploadDocument,
    createUploadSession,
    downloadDocument,
    manageDocument,
    shareDocument,
    listPermissions,
    removePermission,
    documentVersions,
    documentCheckinCheckout,
    documentPreview,
    createFolder
  ],
  triggers: [driveItemChanges]
});
