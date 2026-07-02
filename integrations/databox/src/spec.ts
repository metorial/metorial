import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'databox',
  name: 'Databox',
  description:
    'Business analytics platform for consolidating KPIs and metrics from hundreds of data sources into dashboards, reports, and alerts. Push custom data via API for visualization and analysis.',
  metadata: {},
  config,
  auth
});
