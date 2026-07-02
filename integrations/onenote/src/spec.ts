import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'onenote',
  name: 'OneNote',
  description:
    'Microsoft OneNote digital note-taking application, accessed through the Microsoft Graph API.',
  metadata: {},
  config,
  auth
});
