import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'abuseipdb',
  name: 'AbuseIPDB',
  description:
    'Community-driven database for reporting and checking IP addresses associated with malicious activity such as hacking, spamming, and vulnerability scanning.',
  metadata: {},
  config,
  auth
});
