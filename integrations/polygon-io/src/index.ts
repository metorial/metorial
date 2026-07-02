import { Slate } from 'slates';
import { spec } from './spec';
import {
  getAggregateBars,
  getDailyOpenClose,
  getDividendsSplits,
  getMarketStatus,
  getOptionsChain,
  getSnapshot,
  getStockFinancials,
  getTechnicalIndicator,
  getTickerDetails,
  getTickerNews,
  getTradesQuotes,
  searchTickers
} from './tools';
import { inboundWebhook, newTickerNews, stockPriceChange } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    searchTickers,
    getTickerDetails,
    getAggregateBars,
    getDailyOpenClose,
    getSnapshot,
    getTradesQuotes,
    getTechnicalIndicator,
    getStockFinancials,
    getDividendsSplits,
    getOptionsChain,
    getTickerNews,
    getMarketStatus
  ],
  triggers: [inboundWebhook, newTickerNews, stockPriceChange]
});
