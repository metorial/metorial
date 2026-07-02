import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'docupost',
  name: 'Docupost',
  description:
    'Send physical postal mail including letters and postcards via U.S. mail. HIPAA-compliant service for sending documents online.',
  metadata: {},
  config,
  auth
});
