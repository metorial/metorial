import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'exist',
  name: 'Exist',
  description: undefined,
  metadata: {},
  config,
  auth
});
