import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'flexisign',
  name: 'Flexisign',
  description:
    'Digital signature platform for signing, sending, and managing documents securely.',
  metadata: {},
  config,
  auth
});
