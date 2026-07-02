import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'blocknative',
  name: 'Blocknative',
  description:
    'Blockchain infrastructure for gas fee estimation, mempool monitoring, L2 batch decoding, and blob data archival across 40+ chains.',
  metadata: {},
  config,
  auth
});
