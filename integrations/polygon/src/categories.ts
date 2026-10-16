import { toolCategory } from 'slates';
import {
  getAggregateBars,
  getCorporateActions,
  getCryptoData,
  getFinancialRatios,
  getFinancialStatements,
  getForexData,
  getForexSnapshots,
  getGroupedDailyBars,
  getIndicesSnapshot,
  getOptionsChain,
  getPreviousClose,
  getReferenceData,
  getSplitsDividends,
  getStockFinancials,
  getStockMovers,
  getStockSnapshot,
  getStockTradesAndQuotes,
  getTechnicalIndicators,
  getTickerDetails,
  getUnifiedSnapshot,
  searchTickers
} from './tools';

let commonTools = [
  getAggregateBars,
  getPreviousClose,
  getTechnicalIndicators,
  getTickerDetails,
  searchTickers,
  getReferenceData,
  getUnifiedSnapshot
];

export let toolCategories = [
  toolCategory({
    key: 'stocks',
    name: 'Stocks',
    description:
      'US equities market data, financial statements, corporate actions, and reference information.',
    tools: [
      ...commonTools,
      getStockSnapshot,
      getStockTradesAndQuotes,
      getStockMovers,
      getStockFinancials,
      getSplitsDividends,
      getFinancialStatements,
      getFinancialRatios,
      getCorporateActions,
      getGroupedDailyBars
    ]
  }),
  toolCategory({
    key: 'options',
    name: 'Options',
    description: 'Options contracts, chain snapshots, and historical market data.',
    tools: [...commonTools, getOptionsChain]
  }),
  toolCategory({
    key: 'forex',
    name: 'Forex',
    description: 'Currency-pair snapshots, conversions, quotes, and historical market data.',
    tools: [...commonTools, getForexData, getForexSnapshots, getStockMovers]
  }),
  toolCategory({
    key: 'crypto',
    name: 'Crypto',
    description: 'Cryptocurrency snapshots, movers, and historical market data.',
    tools: [...commonTools, getCryptoData, getStockMovers]
  }),
  toolCategory({
    key: 'indices',
    name: 'Indices',
    description: 'Index snapshots, values, historical bars, and technical indicators.',
    tools: [...commonTools, getIndicesSnapshot]
  })
];
