import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'datadog',
  name: 'Datadog',
  description:
    'Cloud-based monitoring and observability platform for infrastructure, applications, logs, and security. Provides APIs for metrics, monitors, dashboards, incidents, logs, SLOs, and synthetic testing.',
  metadata: {},
  config,
  auth
});
