import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'resend',
  name: 'Resend',
  description: 'Email API platform for sending transactional and marketing emails.',
  metadata: {},
  config,
  auth
});
