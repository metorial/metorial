import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'mopinion',
  name: 'Mopinion',
  description:
    'User feedback platform for collecting, analyzing, and acting on feedback across web, mobile, and email channels.',
  metadata: {},
  config,
  auth
});
