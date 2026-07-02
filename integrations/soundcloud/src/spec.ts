import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'soundcloud',
  name: 'SoundCloud',
  description:
    'Audio streaming and sharing platform for musicians, podcasters, and creators. Upload, stream, search, and manage audio tracks, playlists, and user profiles.',
  metadata: {},
  config,
  auth
});
