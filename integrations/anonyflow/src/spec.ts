import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'anonyflow',
  name: 'Anonyflow',
  description:
    'Encrypt and decrypt sensitive values and selected data fields using the AnonyFlow cloud API.',
  metadata: {},
  config,
  auth
});
