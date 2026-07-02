import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'dock-labs-truvera',
  name: 'Truvera by Dock Labs',
  description:
    'Verifiable Credentials platform for creating, managing, and verifying tamper-proof digital credentials using W3C standards, blockchain anchoring, and decentralized identifiers.',
  metadata: {},
  config,
  auth
});
