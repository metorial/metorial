import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'telegram',
  name: 'Telegram',
  description:
    'Cloud-based messaging platform with a Bot API for sending messages, managing chats, processing payments, handling inline queries, and receiving real-time webhook events.',
  metadata: {},
  config,
  auth
});
