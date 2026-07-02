import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'sanity',
  name: 'Sanity',
  description: undefined,
  metadata: {},
  config,
  auth
});
