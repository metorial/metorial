import { Slate } from 'slates';
import { spec } from './spec';
import {
  getCommodityPrice,
  getCompanyOverview,
  getCryptoPrice,
  getDividendsAndSplits,
  getEarnings,
  getEconomicIndicator,
  getFinancialStatements,
  getForexRate,
  getMarketStatus,
  getNewsSentiment,
  getOptionsChain,
  getQuote,
  getStockPrice,
  getTechnicalIndicator,
  getTopMovers,
  searchSymbol
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    getStockPrice,
    getQuote,
    searchSymbol,
    getCompanyOverview,
    getFinancialStatements,
    getEarnings,
    getDividendsAndSplits,
    getForexRate,
    getCryptoPrice,
    getCommodityPrice,
    getEconomicIndicator,
    getTechnicalIndicator,
    getNewsSentiment,
    getOptionsChain,
    getTopMovers,
    getMarketStatus
  ],
  triggers: [inboundWebhook]
});
