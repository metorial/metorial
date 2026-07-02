import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'ip2whois',
  name: 'IP2WHOIS',
  description:
    'Domain WHOIS lookup service providing registration and ownership information for domain names, hosted domain discovery by IP address, and domain name utilities.',
  metadata: {},
  config,
  auth
});
