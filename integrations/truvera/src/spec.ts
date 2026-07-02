import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'truvera',
  name: 'Truvera',
  description:
    'Decentralized identity platform for issuing, verifying, and managing W3C-compliant verifiable credentials with DID management, credential schemas, revocation registries, and ecosystem governance.',
  metadata: {},
  config,
  auth
});
