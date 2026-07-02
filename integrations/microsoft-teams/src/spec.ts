import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'microsoft-teams',
  name: 'Microsoft Teams',
  description:
    'Microsoft Teams integration via Microsoft Graph API. Manage teams, channels, messaging, chats, meetings, presence, members, shifts, and tags.',
  metadata: {},
  config,
  auth
});
