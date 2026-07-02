import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'hiver',
  name: 'Hiver',
  description:
    'AI-powered customer service platform that integrates with Gmail and Outlook, enabling teams to manage shared inboxes, assign and track email conversations, and collaborate on customer support.',
  metadata: {},
  config,
  auth
});
