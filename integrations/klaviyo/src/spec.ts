import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'klaviyo',
  name: 'Klaviyo',
  description:
    'Email, SMS, and push notification marketing automation platform for eCommerce brands.',
  metadata: {},
  config,
  auth
});
