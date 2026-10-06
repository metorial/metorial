import { Slate } from 'slates';
import { spec } from './spec';
import {
  exportTable,
  getBars,
  getDatasetInfo,
  getLastSale,
  getOptionsChain,
  getSnapshot,
  getTableMetadata,
  getTimeSeries,
  listDatabases,
  queryTable,
  searchDatasets
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    queryTable,
    getTimeSeries,
    searchDatasets,
    getTableMetadata,
    getDatasetInfo,
    listDatabases,
    exportTable,
    getLastSale,
    getBars,
    getSnapshot,
    getOptionsChain
  ],
  triggers: []
});
