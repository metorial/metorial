import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'addressfinder',
  name: 'Addressfinder',
  description:
    'Address verification and data quality service for Australia, New Zealand, and international addresses. Provides address autocomplete, verification, location search, reverse geocoding, email verification, and phone verification.',
  metadata: {},
  config,
  auth
});
