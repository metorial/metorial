import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'fullstory',
  name: 'FullStory',
  description:
    'Digital experience analytics platform for capturing and replaying user sessions, tracking custom events, managing user profiles, segmenting users, and exporting behavioral data via the FullStory API.',
  metadata: {},
  config,
  auth
});
