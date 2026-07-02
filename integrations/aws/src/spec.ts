import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'amazon-web-services',
  name: 'Amazon Web Services',
  description: undefined,
  metadata: {},
  config,
  auth
});
