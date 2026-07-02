import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'twitch',
  name: 'Twitch',
  description:
    'Live-streaming platform for gaming, esports, and creative content. Manage channels, streams, chat, moderation, and viewer engagement via the Helix API.',
  metadata: {},
  config,
  auth
});
