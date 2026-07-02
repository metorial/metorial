import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'the-odds-api',
  name: 'the Odds API',
  description: undefined,
  metadata: {},
  config,
  auth
});
