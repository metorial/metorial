import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'connecteam',
  name: 'Connecteam',
  description:
    'Workforce management platform for deskless employees with operations, communications, and HR hubs.',
  metadata: {},
  config,
  auth
});
