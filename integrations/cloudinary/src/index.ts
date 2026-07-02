import { Slate } from 'slates';
import { spec } from './spec';
import {
  deleteAssets,
  getAsset,
  getUsage,
  listAssets,
  manageFolders,
  manageTags,
  searchAssets,
  updateAsset,
  uploadAsset
} from './tools';
import { assetEvent } from './triggers';

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
    getUsage
  ],
  triggers: [assetEvent]
});
