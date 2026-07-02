import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'esignaturesio',
  name: 'eSignatures.io',
  description:
    'Mobile-first electronic signature platform for creating, sending, and signing legally binding contracts online via REST API.',
  metadata: {},
  config,
  auth
});
