import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'pilvio',
  name: 'Pilvio',
  description:
    'API-first cloud infrastructure platform providing virtual machines, block storage, object storage, networking, firewalls, and load balancers.',
  metadata: {},
  config,
  auth
});
