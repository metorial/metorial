import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'ipinfoio',
  name: 'IPinfo.io',
  description:
    'IP address data and intelligence provider offering geolocation, ASN, privacy detection, carrier, company, and network data for IPv4 and IPv6 addresses.',
  metadata: {},
  config,
  auth
});
