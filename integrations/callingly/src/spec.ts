import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'callingly',
  name: 'Callingly',
  description:
    'Call automation platform that connects sales teams with incoming leads through automated phone calls, SMS messaging, and call management.',
  metadata: {},
  config,
  auth
});
