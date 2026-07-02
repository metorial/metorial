import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'finage',
  name: 'Finage',
  description:
    'Real-time and historical financial market data for stocks, forex, cryptocurrencies, indices, ETFs, commodities, bonds, and fundamentals.',
  metadata: {},
  config,
  auth
});
