import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'sharepoint',
  name: 'SharePoint',
  description:
    'Microsoft SharePoint cloud-based platform for document management, content collaboration, and intranet sites. Manage sites, document libraries, lists, files, and permissions via the Microsoft Graph API.',
  metadata: {},
  config,
  auth
});
