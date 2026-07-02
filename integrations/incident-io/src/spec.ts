import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'incidentio',
  name: 'Incident.io',
  description:
    'Incident management, on-call scheduling, alert routing, service catalog, and status pages platform.',
  metadata: {},
  config,
  auth
});
