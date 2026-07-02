import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'gatherup',
  name: 'GatherUp',
  description:
    'Customer feedback and online review management platform for businesses and agencies.',
  metadata: {},
  config,
  auth
});
