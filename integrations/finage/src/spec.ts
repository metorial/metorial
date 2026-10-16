import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'finage',
  name: 'Finage',
  description:
    'Stock, forex, and cryptocurrency prices, historical bars, company fundamentals, symbol discovery, market news, calendars, and technical analysis.',
  metadata: {},
  config,
  auth
});
