import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'truvera',
  name: 'Truvera',
  description:
    'Issue, verify, and manage W3C-compliant verifiable credentials with decentralized identifiers, credential schemas, revocation registries, and proof requests.',
  metadata: {},
  config,
  auth
});
