import { Slate } from 'slates';
import { spec } from './spec';
import {
  createFolder,
  getFileInfo,
  listFolder,
  listUsers,
  manageAutomation,
  manageFile,
  manageGroup,
  manageNotification,
  managePermission,
  manageShareLink,
  manageUser,
  searchHistory
} from './tools';
import {
  downloadFile,
  getCurrentUser,
  getFileOperation,
  uploadFile
} from './tools/file-transfer';
export let provider = Slate.create({
  spec,
  tools: [
    listFolder,
    getFileInfo,
    manageFile,
    createFolder,
    listUsers,
    manageUser,
    manageGroup,
    managePermission,
    manageShareLink,
    manageAutomation,
    manageNotification,
    searchHistory,
    downloadFile,
    uploadFile,
    getFileOperation,
    getCurrentUser
  ],
  triggers: []
});
