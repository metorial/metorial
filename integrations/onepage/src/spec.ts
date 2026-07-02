import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'onepage',
  name: 'OnePageCRM',
  description:
    'Action-focused CRM for small businesses. Manage contacts, companies, deals, actions, notes, calls, and meetings through a unified sales pipeline.',
  metadata: {},
  config,
  auth
});
