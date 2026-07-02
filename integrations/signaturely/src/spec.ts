import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'signaturely',
  name: 'Signaturely',
  description:
    'Cloud-based electronic signature platform for sending, signing, and managing legally binding documents.',
  metadata: {},
  config,
  auth
});
