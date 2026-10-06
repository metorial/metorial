import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'xata',
  name: 'Xata',
  description:
    'Inspect current Xata organizations and projects and manage Postgres child branches. Historical Xata Lite operations remain deprecated after the provider retired that product.',
  metadata: {},
  config,
  auth
});
