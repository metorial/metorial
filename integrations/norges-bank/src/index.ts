import { Slate } from 'slates';
import { spec } from './spec';
import { getExchangeRates, getGenericRates } from './tools';

export let provider = Slate.create({
  spec,
  tools: [getExchangeRates, getGenericRates],
  triggers: []
});
