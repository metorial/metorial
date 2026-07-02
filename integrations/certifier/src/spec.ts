import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'certifier',
  name: 'Certifier',
  description:
    'Create, issue, and manage digital credentials such as certificates and badges with Certifier.',
  metadata: {},
  config,
  auth
});
