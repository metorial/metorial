import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'agencyzoom',
  name: 'AgencyZoom',
  description:
    'Sales automation and CRM platform for P&C insurance agencies by Vertafore. Provides lead management, customer management, policy tracking, task management, service ticketing, and producer performance analytics.',
  metadata: {},
  config,
  auth
});
