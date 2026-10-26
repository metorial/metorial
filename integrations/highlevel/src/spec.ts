import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'highlevel',
  name: 'HighLevel',
  description:
    'Manage contacts, calendars, conversations, opportunities, payments, blogs, email templates, and social posts in one HighLevel sub-account.',
  metadata: {},
  auth,
  config
});
