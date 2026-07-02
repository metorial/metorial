import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'bubble',
  name: 'Bubble',
  description:
    'No-code platform for building web applications. Perform CRUD operations on application databases, search and filter records, trigger server-side workflows, and manage user authentication through the Bubble Data API and Workflow API.',
  metadata: {},
  config,
  auth
});
