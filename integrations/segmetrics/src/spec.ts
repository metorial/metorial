import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'segmetrics',
  name: 'SegMetrics',
  description:
    'Marketing attribution and analytics platform for tracking leads, revenue, and customer journeys across marketing tools and ad platforms.',
  metadata: {},
  config,
  auth
});
