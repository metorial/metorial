import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'aeroleads',
  name: 'Aeroleads',
  description:
    'Look up LinkedIn profiles and find business email addresses using a prospect’s name and company domain.',
  metadata: {},
  config,
  auth
});
