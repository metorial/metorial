import { Slate } from 'slates';
import { spec } from './spec';
import {
  getAnalystRatings,
  getCommodities,
  getEodPrices,
  getEtfHoldings,
  getGovernmentBonds,
  getIntradayPrices,
  getMarketIndices,
  getSecFinancialData,
  getSplitsAndDividends,
  getTickerDetails,
  listExchanges,
  searchSecFilings,
  searchTickers
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    getEodPrices,
    getIntradayPrices,
    searchTickers,
    getTickerDetails,
    getSplitsAndDividends,
    listExchanges,
    getCommodities,
    getMarketIndices,
    getGovernmentBonds,
    getEtfHoldings,
    getAnalystRatings,
    searchSecFilings,
    getSecFinancialData
  ],
  triggers: [inboundWebhook]
});
