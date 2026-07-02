import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'ignisign',
  name: 'Ignisign',
  description:
    'Electronic and digital signature platform providing legally binding signatures (eIDAS, ESIGN, UETA compliant) with support for Simple, Advanced, and Qualified signature levels, document sealing, and signature proofs.',
  metadata: {},
  config,
  auth
});
