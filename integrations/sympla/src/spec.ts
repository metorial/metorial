import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'sympla',
  name: 'Sympla',
  description:
    'Brazilian event management and ticketing platform for creating, promoting, and managing events.',
  metadata: {},
  config,
  auth
});
