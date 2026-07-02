import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'front',
  name: 'Front',
  description:
    'Customer operations platform for team-based email, SMS, chat, and social media communication. Provides shared inboxes, conversation management, contact and account tracking, tagging, commenting, analytics, and knowledge base capabilities.',
  metadata: {},
  config,
  auth
});
