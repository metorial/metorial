import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'parma',
  name: 'Parma',
  description:
    'Parma is a minimalistic CRM for managing customer relationships, notes, and stay-in-touch reminders. It focuses on the post-sales phase of customer management.',
  metadata: {},
  config,
  auth
});
