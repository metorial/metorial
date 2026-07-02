import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'klipfolio',
  name: 'Klipfolio',
  description:
    'Business dashboard and analytics platform for connecting data sources, building visualizations, and managing dashboards.',
  metadata: {},
  config,
  auth
});
