import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'college-football-data',
  name: 'College Football Data',
  description: undefined,
  metadata: {},
  config,
  auth
});
