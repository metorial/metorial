import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'securitytrails',
  name: 'SecurityTrails',
  description:
    'Cybersecurity intelligence platform providing access to current and historical DNS, IP, WHOIS, and domain-related data for threat intelligence, attack surface mapping, and security research.',
  metadata: {},
  config,
  auth
});
