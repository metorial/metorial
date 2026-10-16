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
  getStockDetails,
  getStockPrice,
  getStockSignals,
  getStockSnapshot,
  getTechnicalIndicator,
  listSymbols,
  searchMarket
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getStockPrice,
    getStockDetails,
    listSymbols,
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
