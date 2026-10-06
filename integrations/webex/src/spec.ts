import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'cisco-webex',
  name: 'Cisco Webex',
  description:
    'Send and manage messages, spaces, space memberships and teams. Schedule and manage meetings, discover people and the authenticated person or bot, and read meeting recordings. Prepare exact message files and authorized recording files for download. Webex scopes, roles, licenses, retention and file-scanning policies apply.',
  metadata: {},
  config,
  auth
});
