import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'fireberry',
  name: 'Fireberry',
  description:
    'Customizable all-in-one CRM platform unifying Sales, Marketing, and Service. Manage contacts, accounts, opportunities, invoices, tickets, projects, and more with support for custom objects and fields.',
  metadata: {},
  config,
  auth
});
