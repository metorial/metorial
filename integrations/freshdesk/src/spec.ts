import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'freshdesk',
  name: 'Freshdesk',
  description: undefined,
  metadata: {},
  config,
  auth
});
