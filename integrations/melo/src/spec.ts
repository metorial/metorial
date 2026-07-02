import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'melo',
  name: 'Melo',
  description:
    'French real estate data API that aggregates and deduplicates property listings from 900+ sources across France in real time.',
  metadata: {},
  config,
  auth
});
