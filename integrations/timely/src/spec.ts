import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'timely',
  name: 'Timely',
  description: undefined,
  metadata: {},
  config,
  auth
});
