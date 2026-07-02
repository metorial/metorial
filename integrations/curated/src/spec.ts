import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'curated',
  name: 'Curated',
  description:
    'Newsletter platform for creating and managing curated email newsletters with link collection, subscriber management, and issue publishing.',
  metadata: {},
  config,
  auth
});
