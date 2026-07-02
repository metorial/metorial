import { Slate } from 'slates';
import { spec } from './spec';
import {
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
    listUsers,
    getCurrentUser,
    getServerInfo,
    listFiredAlerts
  ],
  triggers: [alertFired]
});
