import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'ambee',
  name: 'Ambee',
  description: undefined,
  metadata: {},
  config,
  auth
});
