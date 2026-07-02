import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'onesignal-rest-api',
  name: 'OneSignal REST API',
  description:
    'Multi-channel messaging platform for sending push notifications, emails, SMS/MMS, and in-app messages. Manage users, subscriptions, segments, templates, and apps through a unified API.',
  metadata: {},
  config,
  auth
});
