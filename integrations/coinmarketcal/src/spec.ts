import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'coinmarketcal',
  name: 'Coin Market Cal',
  description:
    'Search the CoinMarketCal cryptocurrency event catalog, discover coins and event categories, and read API plan usage.',
  metadata: {},
  config,
  auth
});
