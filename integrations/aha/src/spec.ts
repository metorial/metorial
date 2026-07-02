import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'aha',
  name: 'Aha!',
  description: undefined,
  metadata: {},
  config,
  auth
});
