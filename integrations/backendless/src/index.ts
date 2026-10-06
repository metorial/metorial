import { Slate } from 'slates';
import { spec } from './spec';
import {
  createObject,
  deleteFile,
  deleteObject,
  findUsers,
  listFiles,
  manageCache,
  manageCounter,
  publishMessage,
  queryObjects,
  registerUser,
  sendEmail,
  updateObject
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    createObject,
    queryObjects,
    updateObject,
    deleteObject,
    findUsers,
    registerUser,
    listFiles,
    deleteFile,
    publishMessage,
    sendEmail,
    manageCounter,
    manageCache
  ],
  triggers: []
});
