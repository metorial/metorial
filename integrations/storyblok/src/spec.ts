import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'storyblok',
  name: 'Storyblok',
  description:
    'Discover accessible Storyblok spaces, read authenticated identity, manage stories, components, asset metadata, datasources, collaborators and releases, and inspect editorial context and activities.',
  metadata: {},
  config,
  auth
});
