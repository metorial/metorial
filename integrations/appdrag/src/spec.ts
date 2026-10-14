import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'appdrag',
  name: 'AppDrag',
  description:
    'Access existing AppDrag projects for SQL queries, Cloud Backend function calls, stored files, transactional email, and newsletter management. AppDrag has announced shutdown on November 1, 2026.',
  metadata: {},
  config,
  auth
});
