import { Slate } from 'slates';
import { spec } from './spec';
import {
  createCustomType,
  createMigrationDocument,
  createSharedSlice,
  deleteAsset,
  deleteCustomType,
  deleteSharedSlice,
  getCustomType,
  getDocument,
  getRepositoryInfo,
  listAssets,
  listCustomTypes,
  listSharedSlices,
  queryDocuments,
  updateAsset,
  updateCustomType,
  updateMigrationDocument,
  updateSharedSlice,
  uploadAsset
} from './tools';
import { documentChanges, releaseChanges, tagChanges } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    queryDocuments,
    getDocument,
    getRepositoryInfo,
    listCustomTypes,
    getCustomType,
    createCustomType,
    updateCustomType,
    deleteCustomType,
    listSharedSlices,
    createSharedSlice,
    updateSharedSlice,
    deleteSharedSlice,
    listAssets,
    uploadAsset,
    updateAsset,
    deleteAsset,
    createMigrationDocument,
    updateMigrationDocument
  ],
  triggers: [documentChanges, releaseChanges, tagChanges]
});
