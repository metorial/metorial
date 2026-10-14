import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'autobound',
  name: 'Autobound',
  description:
    'Generate personalized sales content and retrieve company and contact buying signals.',
  metadata: {},
  config,
  auth
});
