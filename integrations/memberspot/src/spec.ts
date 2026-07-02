import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'memberspot',
  name: 'Memberspot',
  description: undefined,
  metadata: {},
  config,
  auth
});
