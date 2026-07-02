import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'statuscake',
  name: 'StatusCake',
  description:
    'Website monitoring platform providing uptime, page speed, SSL certificate, and heartbeat monitoring.',
  metadata: {},
  config,
  auth
});
