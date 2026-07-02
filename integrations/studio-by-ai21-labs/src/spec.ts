import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'studio-by-ai21-labs',
  name: 'Studio by Ai 21 Labs',
  description: undefined,
  metadata: {},
  config,
  auth
});
