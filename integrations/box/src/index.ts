import { Slate } from 'slates';
import { spec } from './spec';
import {
  downloadFile,
  getDownloadUrl,
  getFileInfo,
  listFolderItems,
  listUsers,
  manageCollaboration,
  manageComments,
  manageFile,
  manageFolder,
  manageMetadata,
  manageSharedLink,
  manageSignRequest,
  manageTasks,
  manageWebLink,
  searchContent,
  uploadFile
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getFileInfo,
    uploadFile,
    downloadFile,
    manageFile,
    getDownloadUrl,
    listFolderItems,
    manageFolder,
    searchContent,
    manageCollaboration,
    manageSharedLink,
    manageComments,
    manageTasks,
    manageMetadata,
    manageSignRequest,
    listUsers,
    manageWebLink
  ] as any,
  triggers: []
});
