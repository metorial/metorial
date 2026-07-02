import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'evernote',
  name: 'Evernote',
  description:
    'Note-taking and organization service for creating, storing, and managing notes, notebooks, tags, and file attachments.',
  metadata: {},
  config,
  auth
});
