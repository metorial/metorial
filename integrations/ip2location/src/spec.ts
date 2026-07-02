import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'ip2location',
  name: 'IP2Location',
  description:
    'IP intelligence service providing geolocation, proxy/VPN detection, domain WHOIS lookups, and hosted domain lookups based on IP addresses.',
  metadata: {},
  config,
  auth
});
