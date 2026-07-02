import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'dnsfilter',
  name: 'DNSFilter',
  description:
    'Cloud-based DNS security service providing AI-powered content filtering, threat protection, and network visibility at the DNS layer.',
  metadata: {},
  config,
  auth
});
