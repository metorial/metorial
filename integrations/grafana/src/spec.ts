import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'grafana',
  name: 'Grafana',
  description:
    'Open-source observability and data visualization platform for managing dashboards, data sources, alerts, annotations, and more.',
  metadata: {},
  config,
  auth
});
