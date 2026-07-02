import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'calcom',
  name: 'Cal.com',
  description: undefined,
  metadata: {},
  config,
  auth
});
