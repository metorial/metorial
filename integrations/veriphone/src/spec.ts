import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'veriphone',
  name: 'Veriphone',
  description:
    'Validate and format phone numbers, look up original and current carriers, check account credits, and verify CSV lists with downloadable results.',
  metadata: {},
  config,
  auth
});
