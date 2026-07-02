import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'docusign',
  name: 'DocuSign',
  description:
    'Electronic signature and digital transaction management platform for sending, signing, and managing documents and agreements.',
  metadata: {},
  config,
  auth
});
