import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'leadfeeder',
  name: 'Leadfeeder',
  description:
    'Access B2B website leads, visit behavior, custom feeds, downloadable exports, and IP-to-company enrichment using existing Leadfeeder legacy API credentials.',
  metadata: {},
  config,
  auth
});
