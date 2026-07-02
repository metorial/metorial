import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'coinmarketcap',
  name: 'CoinMarketCap',
  description:
    'Retrieve real-time and historical cryptocurrency market data for thousands of cryptocurrencies and exchanges.',
  metadata: {},
  config,
  auth
});
