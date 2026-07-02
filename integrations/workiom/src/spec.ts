import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'workiom',
  name: 'Workiom',
  description:
    'No-code cloud platform for building custom business applications. Manage records, lists, apps, and webhook subscriptions.',
  metadata: {},
  config,
  auth
});
