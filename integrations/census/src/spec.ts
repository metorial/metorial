import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'census',
  name: 'Census',
  description:
    'Census, now Fivetran Activations, syncs warehouse data to business applications. Manage workspace syncs, monitor runs and discover connection metadata.',
  metadata: {},
  config,
  auth
});
