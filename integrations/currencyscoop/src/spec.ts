import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'currencyscoop',
  name: 'Currency Scoop',
  description:
    'Real-time and historical exchange rates for 168 fiat currencies and 2,000+ cryptocurrencies. Provides currency conversion, time-series data, and a comprehensive list of supported currencies.',
  metadata: {},
  config,
  auth
});
