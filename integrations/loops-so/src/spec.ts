import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'loopsso',
  name: 'Loops.so',
  description:
    'Manage Loops contacts and mailing-list subscriptions, discover published transactional templates, verify team identity, check suppression, and submit requested emails or workflow events.',
  metadata: {},
  config,
  auth
});
