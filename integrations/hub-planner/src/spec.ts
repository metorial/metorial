import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'hub-planner',
  name: 'Hub Planner',
  description: undefined,
  metadata: {},
  config,
  auth
});
