import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'outreach',
  name: 'Outreach',
  description:
    'Manage sales records, sequences and enrollment transitions, reusable content, and external call history in Outreach.',
  metadata: {},
  config,
  auth
});
