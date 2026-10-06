import { Slate } from 'slates';
import { spec } from './spec';
import {
  aggregateCollection,
  batchCreateObjects,
  batchDeleteObjects,
  clusterStatus,
  createCollection,
  createObject,
  deleteCollection,
  deleteObject,
  generativeSearch,
  getCollection,
  getCurrentUser,
  getObject,
  listCollections,
  listObjects,
  manageBackup,
  manageReferences,
  manageTenants,
  searchObjects,
  updateCollection,
  updateObject
} from './tools/index';

export let provider = Slate.create({
  spec,
  tools: [
    listCollections,
    getCollection,
    getCurrentUser,
    createCollection,
    updateCollection,
    deleteCollection,
    createObject,
    getObject,
    updateObject,
    deleteObject,
    listObjects,
    batchCreateObjects,
    batchDeleteObjects,
    searchObjects,
    generativeSearch,
    aggregateCollection,
    manageTenants,
    manageBackup,
    manageReferences,
    clusterStatus
  ],
  triggers: []
});
