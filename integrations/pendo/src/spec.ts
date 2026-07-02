import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'pendo',
  name: 'Pendo',
  description:
    'Product analytics platform for understanding user behavior, collecting feedback, and delivering in-app guidance.',
  metadata: {},
  config,
  auth
});
