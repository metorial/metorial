import { Slate } from 'slates';
import { spec } from './spec';
import {
  createFolder,
  deleteFile,
  downloadFile,
  fileRevisions,
  getAccountInfo,
  getFileMetadata,
  getTemporaryLink,
  getThumbnail,
  listFolder,
  manageFileRequest,
  manageSharedLink,
  manageUploadSession,
  moveOrCopy,
  searchFiles,
  shareFolder,
  uploadFile
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listFolder,
    getFileMetadata,
    createFolder,
    moveOrCopy,
    deleteFile,
    uploadFile,
    downloadFile,
    searchFiles,
    getTemporaryLink,
    getThumbnail,
    manageUploadSession,
    manageSharedLink,
    shareFolder,
    manageFileRequest,
    getAccountInfo,
    fileRevisions
  ],
  triggers: []
});
