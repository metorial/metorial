import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'dadataru',
  name: 'DaData.ru',
  description:
    'Russian SaaS platform for standardization, validation, enrichment, and autocomplete of contact and business data.',
  metadata: {},
  config,
  auth
});
