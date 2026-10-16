import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'currencyscoop',
  name: 'Currency Scoop',
  description:
    'Retrieve currency exchange rates, historical rates, conversions, time-series data, and supported currency metadata through the CurrencyBeacon API.',
  metadata: {},
  config,
  auth
});
