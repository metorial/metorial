import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'freshsales',
  name: 'Freshsales',
  description:
    'Freshsales CRM by Freshworks - manage leads, contacts, accounts, deals, tasks, appointments, notes, and sales activities.',
  metadata: {},
  config,
  auth
});
