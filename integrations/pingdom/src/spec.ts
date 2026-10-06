import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'pingdom',
  name: 'Pingdom',
  description:
    'Monitor website uptime and transactions, manage alert recipients and maintenance, and inspect performance and diagnostics.',
  metadata: {},
  config,
  auth
});
