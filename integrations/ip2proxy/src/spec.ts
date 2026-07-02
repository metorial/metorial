import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'ip2proxy',
  name: 'IP2Proxy',
  description:
    'Proxy detection and IP geolocation service by IP2Location. Identifies whether an IP address is associated with a proxy, VPN, TOR exit node, data center, search engine robot, or residential proxy, and provides geolocation and network metadata.',
  metadata: {},
  config,
  auth
});
