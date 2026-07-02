import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'feathery',
  name: 'Feathery',
  description:
    'Form builder and data intake automation platform for creating forms, collecting submissions, generating documents, and extracting data using AI.',
  metadata: {},
  config,
  auth
});
