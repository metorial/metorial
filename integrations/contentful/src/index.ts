import { Slate } from 'slates';
import { spec } from './spec';
import {
  createAsset,
  createEntry,
  getAsset,
  getEntry,
  listContentTypes,
  listEnvironments,
  listLocales,
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
import { assetEvents, contentTypeEvents, entryEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
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
  triggers: [entryEvents, assetEvents, contentTypeEvents]
});
