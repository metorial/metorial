import { Slate } from 'slates';
import { spec } from './spec';
import {
  convertCurrency,
  getCryptoAggregates,
  getCryptoPrice,
  getEconomicCalendar,
  getFinancialStatements,
  getForexAggregates,
  getForexPrice,
  getMarketMovers,
  getMarketNews,
  getMarketStatus,
  getSectorPerformance,
  getStockAggregates,
  getStockPrice,
  getStockSignals,
  getStockSnapshot,
  getTechnicalIndicator,
  searchMarket
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getStockPrice,
    getStockAggregates,
    getStockSnapshot,
    getForexPrice,
    getForexAggregates,
    convertCurrency,
    getCryptoPrice,
    getCryptoAggregates,
    getFinancialStatements,
    getMarketNews,
    getMarketMovers,
    searchMarket,
    getMarketStatus,
    getTechnicalIndicator,
    getSectorPerformance,
    getEconomicCalendar,
    getStockSignals
  ],
  triggers: []
});
