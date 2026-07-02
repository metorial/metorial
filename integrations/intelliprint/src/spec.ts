import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'intelliprint',
  name: 'Intelliprint',
  description: undefined,
  metadata: {},
  config,
  auth
});
