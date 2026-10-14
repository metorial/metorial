import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'ignisign',
  name: 'Ignisign',
  description:
    'Electronic signature platform for signature requests, signer identities, document sealing, and downloadable signature proofs.',
  metadata: {},
  config,
  auth
});
