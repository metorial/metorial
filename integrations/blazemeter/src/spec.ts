import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'blazemeter',
  name: 'Blazemeter',
  description:
    'BlazeMeter continuous testing platform for performance testing, API monitoring, and service virtualization.',
  metadata: {},
  config,
  auth
});
