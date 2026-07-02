import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'harvest',
  name: 'Harvest',
  description: undefined,
  metadata: {},
  config,
  auth
});
