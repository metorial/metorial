import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'lexoffice',
  name: 'Lexoffice',
  description:
    'Cloud-based accounting software for the German market providing invoicing, bookkeeping, contact management, and tax preparation.',
  metadata: {},
  config,
  auth
});
