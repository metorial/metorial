import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'veriphone',
  name: 'Veriphone',
  description:
    'Phone number validation and carrier lookup service. Verify, format, and retrieve metadata for phone numbers worldwide.',
  metadata: {},
  config,
  auth
});
