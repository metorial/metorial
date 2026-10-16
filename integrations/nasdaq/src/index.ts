import { Slate } from 'slates';
import { toolCategories } from './categories';
import { spec } from './spec';
import {
  exportDatabase,
  exportTable,
  getBars,
  getDatabaseInfo,
  getDatasetInfo,
  getFileUrl,
  getIndexData,
  getLastSale,
  getOptionGreeks,
  getOptionsChain,
  getSnapshot,
  getSymbol,
  getTableMetadata,
  getTimeSeries,
  listDatabases,
  listIndexes,
  listSymbols,
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
    getOptionsChain,
    getDatabaseInfo,
    exportDatabase,
    listSymbols,
    getSymbol,
    listIndexes,
    getIndexData,
    getOptionGreeks,
    getFileUrl
  ],
  toolCategories,
  triggers: []
});
