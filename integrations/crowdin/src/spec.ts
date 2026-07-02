import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'crowdin',
  name: 'Crowdin',
  description: undefined,
  metadata: {},
  config,
  auth
});
