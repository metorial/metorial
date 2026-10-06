import { Slate } from 'slates';
import { spec } from './spec';
import {
  copyMoveFile,
  deleteFiles,
  downloadFile,
  getBulkJobStatus,
  getFile,
  getFileMetadata,
  getFileUrl,
  listFiles,
  manageCustomMetadataFields,
  manageFileVersions,
  manageFolders,
  manageTags,
  purgeCache,
  updateFile,
  uploadFile
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    downloadFile,
    getFileUrl,
    getBulkJobStatus,
    uploadFile,
    listFiles,
    getFile,
    updateFile,
    deleteFiles,
    copyMoveFile,
    manageTags,
    manageCustomMetadataFields,
    getFileMetadata,
    purgeCache,
    manageFolders,
    manageFileVersions
  ],
  triggers: []
});
