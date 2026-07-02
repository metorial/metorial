import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'userflow',
  name: 'Userflow',
  description: undefined,
  metadata: {},
  config,
  auth
});
