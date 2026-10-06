import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'vimeo',
  name: 'Vimeo',
  description:
    'Read, search and organize Vimeo videos. Manage authorized metadata, showcases, folders, channels, comments and likes, and download eligible native video renditions.',
  metadata: {},
  config,
  auth
});
