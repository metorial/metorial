import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'rootly',
  name: 'Rootly',
  description:
    'Manage incidents, alerts, follow-up action items and heartbeat monitors, and inspect current on-call coverage and response configuration.',
  metadata: {},
  config,
  auth
});
