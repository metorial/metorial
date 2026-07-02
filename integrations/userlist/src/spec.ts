import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'userlist',
  name: 'Userlist',
  description:
    'Email marketing automation platform for SaaS companies. Manage users, companies, events, and transactional messages.',
  metadata: {},
  config,
  auth
});
