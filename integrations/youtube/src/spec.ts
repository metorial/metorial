import { SlateSpecification } from '@slates/provider';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'youtube',
  name: 'YouTube',
  description:
    'Video-sharing platform with APIs for managing videos, channels, playlists, comments, captions, subscriptions, and live streams.',
  metadata: {},
  config,
  auth
});
