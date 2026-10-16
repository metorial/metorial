import { Slate } from 'slates';
import { toolCategories } from './categories';
import { spec } from './spec';
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
  getMarketNews,
  getMarketStatus,
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
export let provider = Slate.create({
  spec,
  tools: [
    getCorporateActions,
    getFinancialStatements,
    getFinancialRatios,
    getReferenceData,
    getGroupedDailyBars,
    getIndicesSnapshot,
    getForexSnapshots,
    getAggregateBars,
    getStockSnapshot,
    getStockTradesAndQuotes,
    getStockMovers,
    getPreviousClose,
    getOptionsChain,
    getForexData,
    getCryptoData,
    getTechnicalIndicators,
    getTickerDetails,
    searchTickers,
    getMarketNews,
    getMarketStatus,
    getStockFinancials,
    getSplitsDividends,
    getUnifiedSnapshot
  ],
  toolCategories,
  triggers: []
});
