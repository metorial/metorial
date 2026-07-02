import { Slate } from 'slates';
import { spec } from './spec';
import {
  addFilesToCollection,
  createCollection,
  deleteCollection,
  deleteFilesFromCollection,
  getCollection,
  getFileDownloadUrl,
  getFileUploadUrl,
  listCollectionFiles,
  listCollections,
  listConnectors,
  searchCollection
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    listCollections,
    getCollection,
    createCollection,
    deleteCollection,
    searchCollection,
    listCollectionFiles,
    addFilesToCollection,
    deleteFilesFromCollection,
    getFileUploadUrl,
    getFileDownloadUrl,
    listConnectors
  ],
  triggers: [inboundWebhook]
});
