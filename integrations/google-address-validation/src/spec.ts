import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'google-address-validation',
  name: 'Google Address Validation',
  description:
    'Validates, standardizes, and geocodes postal addresses using the Google Maps Platform Address Validation API.',
  metadata: {},
  config,
  auth
});
