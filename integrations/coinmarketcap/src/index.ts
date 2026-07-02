import { Slate } from 'slates';
import { spec } from './spec';
import {
  convertPrice,
  getCryptocurrencyInfo,
  getCryptocurrencyQuotes,
  getExchangeInfo,
  getGlobalMetrics,
  getMarketPairs,
  listCryptocurrencies,
  listExchanges,
  listFiatCurrencies,
  searchCryptocurrencies
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    listCryptocurrencies,
    getCryptocurrencyQuotes,
    getCryptocurrencyInfo,
    convertPrice,
    getGlobalMetrics,
    searchCryptocurrencies,
    getMarketPairs,
    listExchanges,
    getExchangeInfo,
    listFiatCurrencies
  ],
  triggers: [inboundWebhook]
});
