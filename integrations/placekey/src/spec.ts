import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'placekey',
  name: 'Placekey',
  description:
    'Universal, unique identifiers for physical places worldwide. Enables entity matching, deduplication, and merging of location data.',
  metadata: {},
  config,
  auth
});
