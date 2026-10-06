import { Slate } from 'slates';
import { spec } from './spec';
import {
  convertCurrency,
  getExchangeRates,
  getHistoricalRates,
  getTimeSeries,
  listCurrencies
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    getExchangeRates,
    getHistoricalRates,
    convertCurrency,
    getTimeSeries,
    listCurrencies
  ],
  triggers: []
});
