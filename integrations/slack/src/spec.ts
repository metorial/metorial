import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'slack',
  name: 'Slack',
  description: undefined,
  metadata: {},
  config,
  auth
});
