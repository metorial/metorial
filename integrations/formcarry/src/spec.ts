import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'formcarry',
  name: 'Formcarry',
  description:
    'Form backend service for collecting form submissions with email notifications, file uploads, spam protection, and third-party integrations.',
  metadata: {},
  config,
  auth
});
