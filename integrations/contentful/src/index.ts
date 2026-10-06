import { Slate } from 'slates';
import { spec } from './spec';
import {
  createAsset,
  createEntry,
  downloadAsset,
  getAsset,
  getCurrentUser,
  getEntry,
  listContentTypes,
  listEnvironments,
  listLocales,
  listSpaces,
  manageAssetLifecycle,
  manageContentType,
  manageEntryLifecycle,
  manageRelease,
  manageTags,
  scheduleAction,
  searchAssets,
  searchEntries,
  syncContent,
  updateEntry
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getCurrentUser,
    listSpaces,
    downloadAsset,
    searchEntries,
    getEntry,
    createEntry,
    updateEntry,
    manageEntryLifecycle,
    searchAssets,
    getAsset,
    createAsset,
    manageAssetLifecycle,
    listContentTypes,
    manageContentType,
    manageTags,
    listLocales,
    listEnvironments,
    syncContent,
    scheduleAction,
    manageRelease
  ],
  triggers: []
});
