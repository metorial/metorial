import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'updownio',
  name: 'Updown.io',
  description:
    'Website monitoring service that checks site availability via HTTPS, HTTP, ICMP, TCP, and pulse checks from multiple global locations, with alerts for downtime, SSL issues, and performance drops.',
  metadata: {},
  config,
  auth
});
