import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'twelve-data',
  name: 'Twelve Data',
  description:
    'Financial market data for stocks, forex, cryptocurrencies, ETFs, indices, and mutual funds. Retrieve available prices, history, fundamentals, and indicators; coverage, freshness, and access depend on the instrument, exchange, and subscription.',
  metadata: {},
  config,
  auth
});
