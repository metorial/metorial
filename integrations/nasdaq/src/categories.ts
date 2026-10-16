import { toolCategory } from 'slates';
import {
  exportDatabase,
  exportTable,
  getBars,
  getDatabaseInfo,
  getDatasetInfo,
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

export let toolCategories = [
  toolCategory({
    key: 'data-link',
    name: 'Nasdaq Data Link',
    description:
      'Historical and reference tables, time-series datasets, database discovery, and bulk exports using an API key.',
    tools: [
      queryTable,
      getTimeSeries,
      searchDatasets,
      getTableMetadata,
      getDatasetInfo,
      listDatabases,
      exportTable,
      getDatabaseInfo,
      exportDatabase
    ]
  }),
  toolCategory({
    key: 'cloud-rest',
    name: 'Nasdaq Cloud REST',
    description:
      'Real-time and delayed equity, option, index, and instrument data using client credentials.',
    tools: [
      getLastSale,
      getBars,
      getSnapshot,
      getOptionsChain,
      listSymbols,
      getSymbol,
      listIndexes,
      getIndexData,
      getOptionGreeks
    ]
  })
];
