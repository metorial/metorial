import { Slate } from 'slates';
import { spec } from './spec';
import {
  addFilesToCollection,
  createCollection,
  deleteCollection,
  deleteFilesFromCollection,
  getCollection,
  getCollectionStats,
  getFileDownloadUrl,
  getFileUploadUrl,
  getFileUrl,
  listCollectionFiles,
  listCollections,
  listConnectorFiles,
  listConnectors,
  searchCollection
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    listCollections,
    getCollection,
    getCollectionStats,
    createCollection,
    deleteCollection,
    searchCollection,
    listCollectionFiles,
    addFilesToCollection,
    deleteFilesFromCollection,
    getFileUploadUrl,
    getFileDownloadUrl,
    getFileUrl,
    listConnectors,
    listConnectorFiles
  ],
  triggers: []
});
