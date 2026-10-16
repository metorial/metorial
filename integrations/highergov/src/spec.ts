import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'highergov',
  name: 'HigherGov',
  description:
    'Search government opportunities, awards, suppliers, contacts, documents, and account pursuits.',
  metadata: {},
  config,
  auth
});
