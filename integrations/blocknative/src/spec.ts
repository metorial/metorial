import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'blocknative',
  name: 'Blocknative',
  description:
    'Legacy gas fee estimation, chain and oracle discovery, L2 batch decoding, and blob retrieval. Blocknative announced API shutdown after June 19, 2026.',
  metadata: {},
  config,
  auth
});
