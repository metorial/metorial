import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'nextdns',
  name: 'NextDNS',
  description:
    'Cloud-based DNS filtering service that blocks security threats, ads, trackers, and provides parental controls across all devices and networks.',
  metadata: {},
  config,
  auth
});
