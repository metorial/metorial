import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'fixer',
  name: 'Fixer',
  description:
    'Foreign exchange rate API providing real-time and historical currency exchange rate data for 170+ world currencies, sourced from trusted financial institutions including the European Central Bank.',
  metadata: {},
  config,
  auth
});
