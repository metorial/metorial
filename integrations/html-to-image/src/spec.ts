import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'html-to-image',
  name: 'HTML to Image',
  description: undefined,
  metadata: {},
  config,
  auth
});
