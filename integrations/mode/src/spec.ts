import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'mode',
  name: 'Mode',
  description:
    'Collaborative analytics platform for writing SQL queries, building reports and dashboards, and performing advanced analytics.',
  metadata: {},
  config,
  auth
});
