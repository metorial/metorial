import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'whoisfreaks',
  name: 'WhoisFreaks',
  description:
    'Domain and IP intelligence platform providing WHOIS, DNS, IP geolocation, subdomain discovery, SSL certificate, and security lookup data.',
  metadata: {},
  config,
  auth
});
