import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'sevdesk',
  name: 'sevDesk',
  description:
    'Cloud-based accounting platform for SMEs and freelancers, covering invoicing, expense management, contact management, and financial accounting with German GoBD compliance.',
  metadata: {},
  config,
  auth
});
