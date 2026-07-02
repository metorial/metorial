import { Slate } from 'slates';
import { spec } from './spec';
import {
  getAggregateBars,
  getCryptoData,
  getForexData,
  getMarketNews,
  getMarketStatus,
  getOptionsChain,
  getPreviousClose,
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
import { inboundWebhook, newMarketNews, stockPriceChange } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
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
  triggers: [inboundWebhook, newMarketNews, stockPriceChange]
});
