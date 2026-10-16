import { Slate } from 'slates';
import { spec } from './spec';
import {
  convertPrice,
  getCryptocurrencyInfo,
  getCryptocurrencyQuotes,
  getExchangeInfo,
  getGlobalMetrics,
  getKeyInfo,
  getMarketPairs,
  listCryptocurrencies,
  listExchanges,
  listFiatCurrencies,
  searchCryptocurrencies,
  searchExchanges
} from './tools';

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
    listFiatCurrencies,
    getKeyInfo,
    searchExchanges
  ],
  triggers: []
});
