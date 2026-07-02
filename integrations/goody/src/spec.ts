import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'goody',
  name: 'Goody',
  description:
    'Corporate gifting platform for sending physical products and gifts programmatically without needing recipient addresses.',
  metadata: {},
  config,
  auth
});
