import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'microsoft-outlook',
  name: 'Microsoft Outlook',
  description:
    'Integration with Microsoft Outlook via Microsoft Graph API. Manage emails, calendar events, contacts, and tasks in user mailboxes.',
  metadata: {},
  config,
  auth
});
