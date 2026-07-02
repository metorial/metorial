import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'powerpoint-online',
  name: 'Power Point Online',
  description: undefined,
  metadata: {},
  config,
  auth
});
