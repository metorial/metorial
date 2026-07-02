import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'activetrail',
  name: 'ActiveTrail',
  description:
    'Marketing automation platform for Email, SMS, WhatsApp, and Push Notification campaigns with contact management, automation workflows, and reporting.',
  metadata: {},
  config,
  auth
});
