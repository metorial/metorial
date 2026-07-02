import { Slate } from 'slates';
import { spec } from './spec';
import {
  convertCurrency,
  getExchangeRates,
  getHistoricalRates,
  getTimeSeries,
  listCurrencies
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    getExchangeRates,
    getHistoricalRates,
    convertCurrency,
    getTimeSeries,
    listCurrencies
  ],
  triggers: [inboundWebhook]
});
