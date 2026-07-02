import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'anchor-browser',
  name: 'Anchor Browser',
  description: undefined,
  metadata: {},
  config,
  auth
});
