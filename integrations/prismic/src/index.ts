import { Slate } from 'slates';
import { spec } from './spec';
import {
  createCustomType,
  createMigrationDocument,
  createSharedSlice,
  deleteAsset,
  deleteCustomType,
  deleteSharedSlice,
  downloadAsset,
  getCustomType,
  getDocument,
  getRepositoryInfo,
  getSharedSlice,
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
export let provider = Slate.create({
  spec,
  tools: [
    getSharedSlice,
    downloadAsset,
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
  triggers: []
});
