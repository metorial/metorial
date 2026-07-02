import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'control-d',
  name: 'Control D',
  description:
    'Customizable DNS filtering and traffic redirection platform for blocking, redirecting, and spoofing DNS responses.',
  metadata: {},
  config,
  auth
});
