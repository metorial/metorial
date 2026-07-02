import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'ibm-x-force-exchange',
  name: 'IBM X-Force Exchange',
  description:
    'Cloud-based threat intelligence sharing platform enabling research of security threats, IP/URL reputation lookups, malware analysis, vulnerability intelligence, and collaborative threat intelligence collections.',
  metadata: {},
  config,
  auth
});
