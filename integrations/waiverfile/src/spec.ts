import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'waiverfile',
  name: 'Waiverfile',
  description:
    'Online waiver form system for signing release waivers digitally. Manage waivers, events, and customer data.',
  metadata: {},
  config,
  auth
});
