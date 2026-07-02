import { Slate } from 'slates';
import { spec } from './spec';
import {
  controlSearchJob,
  createIndex,
  createKVStoreCollection,
  createSavedSearch,
  deleteKVStoreCollection,
  deleteKVStoreRecords,
  deleteSavedSearch,
  dispatchSavedSearch,
  getCurrentUser,
  getIndex,
  getSearchResults,
  getServerInfo,
  listApps,
  listFiredAlerts,
  listIndexes,
  listKVStoreCollections,
  listSavedSearches,
  listUsers,
  queryKVStoreRecords,
  runSearch,
  sendHecEvent,
  sendHecRawEvent,
  updateSavedSearch,
  upsertKVStoreRecord
} from './tools';
import { alertFired } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    runSearch,
    getSearchResults,
    controlSearchJob,
    listSavedSearches,
    createSavedSearch,
    updateSavedSearch,
    deleteSavedSearch,
    dispatchSavedSearch,
    sendHecEvent,
    sendHecRawEvent,
    listIndexes,
    createIndex,
    getIndex,
    listKVStoreCollections,
    createKVStoreCollection,
    deleteKVStoreCollection,
    queryKVStoreRecords,
    upsertKVStoreRecord,
    deleteKVStoreRecords,
    listApps,
    listUsers,
    getCurrentUser,
    getServerInfo,
    listFiredAlerts
  ],
  triggers: [alertFired]
});
