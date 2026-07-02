import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'godial',
  name: 'Godial',
  description:
    'Mobile-first auto dialer and CRM platform for outbound calling operations. Manage contacts, calling lists, teams, and agents.',
  metadata: {},
  config,
  auth
});
