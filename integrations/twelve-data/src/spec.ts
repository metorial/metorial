import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'twelve-data',
  name: 'Twelve Data',
  description:
    'Financial market data provider offering real-time and historical data for stocks, forex, cryptocurrencies, ETFs, indices, mutual funds, and commodities across 50+ global exchanges.',
  metadata: {},
  config,
  auth
});
