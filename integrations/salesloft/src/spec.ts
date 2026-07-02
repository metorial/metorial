import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'salesloft',
  name: 'SalesLoft',
  description:
    'Sales engagement platform for managing outreach through cadences, tracking calls and emails, managing contacts and accounts, and leveraging AI-powered workflows.',
  metadata: {},
  config,
  auth
});
