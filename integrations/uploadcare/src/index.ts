import { Slate } from 'slates';
import { spec } from './spec';
import {
  buildCdnUrl,
  convertDocument,
  copyFile,
  createGroup,
  createWebhook,
  deleteFile,
  deleteWebhook,
  encodeVideo,
  executeAddon,
  getAddonStatus,
  getDocumentConversionStatus,
  getFile,
  getGroup,
  getProject,
  getVideoEncodingStatus,
  listFiles,
  listGroups,
  listWebhooks,
  manageMetadata,
  storeFile,
  storeGroup,
  updateWebhook,
  uploadFromUrl
} from './tools';
import { fileEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listFiles,
    getFile,
    storeFile,
    deleteFile,
    copyFile,
    manageMetadata,
    uploadFromUrl,
    listGroups,
    getGroup,
    createGroup,
    storeGroup,
    convertDocument,
    getDocumentConversionStatus,
    encodeVideo,
    getVideoEncodingStatus,
    executeAddon,
    getAddonStatus,
    getProject,
    listWebhooks,
    createWebhook,
    updateWebhook,
    deleteWebhook,
    buildCdnUrl
  ],
  triggers: [fileEvents]
});
