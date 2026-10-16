import { Slate } from 'slates';
import { spec } from './spec';
import {
  captureWebsite,
  convertFile,
  downloadFile,
  getAccount,
  getFileInfo,
  getTask,
  listConversions,
  listTasks,
  manageTask,
  uploadFile
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    convertFile,
    getTask,
    listTasks,
    listConversions,
    manageTask,
    getFileInfo,
    captureWebsite,
    getAccount,
    uploadFile,
    downloadFile
  ],
  triggers: []
});
