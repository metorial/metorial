import { Slate } from 'slates';
import { spec } from './spec';
import {
  createDataSource,
  createDataset,
  deleteDataSource,
  deleteDataset,
  getCurrentUser,
  getDatasetData,
  getIngestionStatus,
  ingestData,
  listAccounts,
  listDataSources,
  listDatasets,
  listIngestions,
  listTimezones,
  purgeDataset,
  validateKey
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    listAccounts,
    createDataSource,
    deleteDataSource,
    listDatasets,
    createDataset,
    deleteDataset,
    purgeDataset,
    ingestData,
    getIngestionStatus,
    listIngestions,
    listTimezones,
    validateKey,
    getCurrentUser,
    getDatasetData,
    listDataSources
  ],
  triggers: []
});
