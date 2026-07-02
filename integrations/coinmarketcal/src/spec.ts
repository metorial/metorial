import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'coinmarketcal',
  name: 'Coin Market Cal',
  description: undefined,
  metadata: {},
  config,
  auth
});
