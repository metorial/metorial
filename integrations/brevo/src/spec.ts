import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'brevo',
  name: 'Brevo',
  description:
    'Marketing and CRM platform providing transactional and marketing email/SMS messaging, contact management, sales CRM, eCommerce tracking, and marketing automation.',
  metadata: {},
  config,
  auth
});
