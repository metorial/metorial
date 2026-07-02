import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'mailercloud',
  name: 'Mailercloud',
  description:
    'Cloud-based email marketing platform for creating campaigns, managing contacts, and tracking email performance.',
  metadata: {},
  config,
  auth
});
