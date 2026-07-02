import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'simplero',
  name: 'Simplero',
  description:
    'All-in-one platform for online course creators and information publishers, offering email marketing, billing, membership sites, and digital content delivery.',
  metadata: {},
  config,
  auth
});
