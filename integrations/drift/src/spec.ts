import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'drift',
  name: 'Drift',
  description:
    'Conversational marketing and sales platform with live chat, chatbots, meeting scheduling, and visitor engagement tools.',
  metadata: {},
  config,
  auth
});
