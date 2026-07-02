import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'rudderstack-transformation',
  name: 'RudderStack Transformation',
  description:
    'Manage RudderStack transformations and reusable code libraries. Create, update, publish, and version-control custom JavaScript or Python functions that transform event data in real-time before it reaches destinations.',
  metadata: {},
  config,
  auth
});
