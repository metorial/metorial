import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'interzoid',
  name: 'Interzoid',
  description:
    'AI-powered data quality platform providing REST/JSON APIs for data matching, standardization, enrichment, validation, and classification.',
  metadata: {},
  config,
  auth
});
