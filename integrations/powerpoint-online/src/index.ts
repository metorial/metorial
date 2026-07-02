import { Slate } from 'slates';
import { spec } from './spec';
import {
  createFolder,
  deletePresentation,
  downloadPresentation,
  getPresentation,
  getThumbnails,
  listFiles,
  managePermissions,
  moveCopyFile,
  searchPresentations,
  shareFile,
  updateFileMetadata,
  uploadPresentation,
  versionHistory
} from './tools';
import { driveItemChanges } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    getPresentation,
    listFiles,
    uploadPresentation,
    downloadPresentation,
    deletePresentation,
    moveCopyFile,
    updateFileMetadata,
    shareFile,
    managePermissions,
    searchPresentations,
    versionHistory,
    getThumbnails,
    createFolder
  ],
  triggers: [driveItemChanges]
});
