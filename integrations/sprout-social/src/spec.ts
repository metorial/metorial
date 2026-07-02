import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'sprout-social',
  name: 'Sprout Social',
  description: undefined,
  metadata: {},
  config,
  auth
});
