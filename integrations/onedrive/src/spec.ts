import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'onedrive',
  name: 'OneDrive',
  description:
    'Microsoft OneDrive cloud file storage and synchronization service. Connect to OneDrive, OneDrive for Business, and SharePoint document libraries via Microsoft Graph API.',
  metadata: {},
  config,
  auth
});
