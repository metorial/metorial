import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'omnisend',
  name: 'Omnisend',
  description:
    'Ecommerce marketing automation platform for email, SMS, and push notification campaigns with contact management, product catalog sync, and event tracking.',
  metadata: {},
  config,
  auth
});
