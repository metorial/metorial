import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'segment',
  name: 'Segment',
  description:
    'Customer data platform by Twilio for collecting, unifying, and routing event data across analytics and marketing tools.',
  metadata: {},
  config,
  auth
});
