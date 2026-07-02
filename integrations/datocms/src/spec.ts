import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'datocms',
  name: 'Dato CMS',
  description: undefined,
  metadata: {},
  config,
  auth
});
