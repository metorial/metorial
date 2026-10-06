import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'incidentio',
  name: 'Incident.io',
  description:
    'Manage incidents, on-call overrides, alert events, catalog entries and status-page updates; read users and automation configuration.',
  metadata: {},
  config,
  auth
});
