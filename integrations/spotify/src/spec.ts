import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'spotify',
  name: 'Spotify',
  description:
    'Music streaming service providing access to catalog browsing, search, playlist management, playback control, library management, user profiles, and personalization data.',
  metadata: {},
  config,
  auth
});
