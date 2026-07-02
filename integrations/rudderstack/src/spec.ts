import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'rudderstack',
  name: 'RudderStack',
  description:
    'Customer data platform for collecting, routing, and processing event data to 200+ downstream destinations including data warehouses, analytics tools, and marketing platforms.',
  metadata: {},
  config,
  auth
});
