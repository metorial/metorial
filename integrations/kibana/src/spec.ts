import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'kibana',
  name: 'Kibana',
  description:
    'Kibana is the visualization and management frontend for the Elastic Stack. Manage dashboards, data views, alerting rules, connectors, cases, SLOs, Fleet agents, and security roles.',
  metadata: {},
  config,
  auth
});
