import { Slate } from 'slates';
import { spec } from './spec';
import {
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
import {
  collaborationEvents,
  commentEvents,
  fileEvents,
  folderEvents,
  metadataEvents,
  sharedLinkEvents,
  signRequestEvents,
  taskAssignmentEvents
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    getFileInfo,
    uploadFile,
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
  triggers: [
    fileEvents,
    folderEvents,
    collaborationEvents,
    commentEvents,
    sharedLinkEvents,
    metadataEvents,
    taskAssignmentEvents,
    signRequestEvents
  ] as any
});
