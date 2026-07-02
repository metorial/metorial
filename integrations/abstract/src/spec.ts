import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'abstract',
  name: 'Abstract',
  description:
    'A suite of utility APIs for data enrichment, validation, and lookup including email validation, phone validation, IP geolocation, company enrichment, exchange rates, and more.',
  metadata: {},
  config,
  auth
});
