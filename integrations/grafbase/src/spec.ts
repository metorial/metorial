import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'grafbase',
  name: 'Grafbase',
  description:
    'GraphQL Federation platform for managing federated graphs, schema registries, subgraph composition, and schema checks through a unified management API.',
  metadata: {
    categories: ['apis-and-http-requests']
  },
  config,
  auth
});
