import { Slate } from 'slates';
import { spec } from './spec';
import {
  copyMoveFile,
  deleteFiles,
  getFile,
  getFileMetadata,
  listFiles,
  manageCustomMetadataFields,
  manageFileVersions,
  manageFolders,
  manageTags,
  purgeCache,
  updateFile,
  uploadFile
} from './tools';
import { uploadTransform, videoTransformation } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
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
  triggers: [videoTransformation, uploadTransform]
});
