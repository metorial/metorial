import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'dub',
  name: 'Dub',
  description:
    'Link attribution platform for short links, conversion tracking, and affiliate programs.',
  metadata: {},
  config,
  auth
});
