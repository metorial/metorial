import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'mailcoach',
  name: 'Mailcoach',
  description:
    'Email marketing platform by Spatie for sending campaigns, managing subscriber lists, creating automations, and sending transactional emails.',
  metadata: {},
  config,
  auth
});
