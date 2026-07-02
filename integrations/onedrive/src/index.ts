import { Slate } from 'slates';
import { spec } from './spec';
import {
  copyItemTool,
  createFolderTool,
  createUploadSessionTool,
  deleteItemTool,
  downloadFileTool,
  getItemTool,
  listDrivesTool,
  listItemsTool,
  managePermissionsTool,
  moveRenameItemTool,
  searchFilesTool,
  shareItemTool,
  uploadFileTool
} from './tools';
import { driveItemChangesTrigger } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listDrivesTool,
    listItemsTool,
    getItemTool,
    uploadFileTool,
    createUploadSessionTool,
    downloadFileTool,
    createFolderTool,
    copyItemTool,
    moveRenameItemTool,
    deleteItemTool,
    searchFilesTool,
    shareItemTool,
    managePermissionsTool
  ],
  triggers: [driveItemChangesTrigger]
});
