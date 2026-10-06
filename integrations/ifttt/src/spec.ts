import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'ifttt',
  name: 'IFTTT',
  description:
    'Read and replace user connection configuration, discover native field options, execute queries and submit actions or realtime notifications using Platform service access. Maker Webhooks execution is currently unavailable.',
  metadata: {},
  config,
  auth
});
