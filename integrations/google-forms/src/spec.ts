import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'google-forms',
  name: 'Google Forms',
  description:
    'Create, manage, and retrieve Google Forms and their responses. Supports form creation, quiz configuration, response retrieval, and push notification watches.',
  metadata: {},
  config,
  auth
});
