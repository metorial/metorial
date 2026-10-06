import { Slate } from 'slates';
import { spec } from './spec';
import {
  captureWebsite,
  convertFile,
  getAccount,
  getFileInfo,
  getTask,
  listConversions,
  listTasks,
  manageTask
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
    getAccount
  ],
  triggers: []
});
