import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'statbank-norway-ssb',
  name: 'Statbank Norway – SSB',
  description:
    'Search Statbank Norway – SSB tables and query public PxWebApi v2 statistics data.',
  metadata: {},
  config,
  auth
});
