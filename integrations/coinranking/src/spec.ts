import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'coinranking',
  name: 'Coinranking',
  description:
    'Cryptocurrency data provider offering real-time and historical data on coins, exchanges, markets, and global crypto statistics.',
  metadata: {},
  config,
  auth
});
