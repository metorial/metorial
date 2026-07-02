import { Slate } from 'slates';
import { spec } from './spec';
import {
  getBulkEod,
  getDividendsSplits,
  getExchangeInfo,
  getFinancialCalendar,
  getFinancialNews,
  getFundamentals,
  getHistoricalPrices,
  getInsiderTransactions,
  getIntradayPrices,
  getLivePrices,
  getMacroIndicators,
  getOptionsChain,
  getSentiment,
  getTechnicalIndicators,
  screenStocks,
  searchInstruments
} from './tools';
import {
  earningsEvent,
  inboundWebhook,
  insiderTransactionAlert,
  newFinancialNews
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    getHistoricalPrices,
    getIntradayPrices,
    getLivePrices,
    getFundamentals,
    searchInstruments,
    getFinancialNews,
    getSentiment,
    screenStocks,
    getTechnicalIndicators,
    getFinancialCalendar,
    getInsiderTransactions,
    getOptionsChain,
    getMacroIndicators,
    getDividendsSplits,
    getExchangeInfo,
    getBulkEod
  ],
  triggers: [inboundWebhook, newFinancialNews, earningsEvent, insiderTransactionAlert]
});
