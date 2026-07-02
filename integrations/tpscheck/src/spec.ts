import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'tpscheck',
  name: 'TPSCheck',
  description:
    'Verify UK phone numbers against TPS and CTPS registers with real-time phone intelligence including line type, carrier, location, reachability, and compliance risk scoring.',
  metadata: {},
  config,
  auth
});
