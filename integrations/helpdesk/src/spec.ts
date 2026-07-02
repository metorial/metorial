import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'helpdesk',
  name: 'HelpDesk',
  description:
    'HelpDesk by Text is a ticketing system for managing customer email communication through tickets. It provides ticket management, team organization, automation rules, email domain configuration, reporting, and integrates with the LiveChat ecosystem.',
  metadata: {},
  config,
  auth
});
