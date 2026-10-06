import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'ramp',
  name: 'Ramp',
  description:
    'Read corporate spending and business data; manage users, departments, spend programs, approved bills, cards and funds.',
  metadata: {},
  config,
  auth
});
