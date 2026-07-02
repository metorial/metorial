import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'boloforms',
  name: 'Boloforms',
  description:
    'BoloForms (BoloSign) eSignature and forms platform for sending documents for signing, managing templates, and collecting form responses.',
  metadata: {},
  config,
  auth
});
