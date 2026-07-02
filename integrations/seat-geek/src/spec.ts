import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'seat-geek',
  name: 'Seat Geek',
  description: undefined,
  metadata: {},
  config,
  auth
});
