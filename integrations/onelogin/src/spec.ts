import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'onelogin',
  name: 'One Login',
  description: undefined,
  metadata: {},
  config,
  auth
});
