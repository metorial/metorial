import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'ipdataco',
  name: 'Ipdata.co',
  description:
    'IP geolocation, threat intelligence, and enrichment API. Look up location, company, ASN, threat profile, and more for any IP address.',
  metadata: {},
  config,
  auth
});
