import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'eodhd-apis',
  name: 'EODHD APIs',
  description:
    'Financial data provider offering 30+ years of historical end-of-day prices, real-time market data, intraday data, and fundamental data for stocks, ETFs, mutual funds, indices, bonds, forex pairs, and cryptocurrencies across 70+ global exchanges.',
  metadata: {},
  config,
  auth
});
