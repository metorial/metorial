import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'sourcegraph',
  name: 'Sourcegraph',
  description:
    'Search code and read repositories, files and user identity; manage supported Enterprise batch changes, insights and monitors on compatible deployments.',
  metadata: {},
  config,
  auth
});
