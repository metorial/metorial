import { Slate } from 'slates';
import { spec } from './spec';
import {
  convertCurrency,
  getExchangeRates,
  getFluctuation,
  getHistoricalRates,
  getTimeSeries,
  listCurrencies
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    getExchangeRates,
    convertCurrency,
    getHistoricalRates,
    getTimeSeries,
    getFluctuation,
    listCurrencies
  ],
  triggers: []
});
