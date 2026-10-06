import { Slate } from 'slates';
import { spec } from './spec';
import {
  deleteAssets,
  downloadAsset,
  getAsset,
  getEnvironmentContext,
  getUsage,
  listAssets,
  manageFolders,
  manageTags,
  searchAssets,
  updateAsset,
  uploadAsset
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    uploadAsset,
    searchAssets,
    getAsset,
    updateAsset,
    deleteAssets,
    manageTags,
    listAssets,
    manageFolders,
    getUsage,
    getEnvironmentContext,
    downloadAsset
  ],
  triggers: []
});
