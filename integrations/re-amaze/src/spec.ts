import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'reamaze',
  name: 'Re:amaze',
  description: undefined,
  metadata: {},
  config,
  auth
});
