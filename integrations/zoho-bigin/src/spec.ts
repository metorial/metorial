import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'zoho-bigin',
  name: 'Zoho Bigin',
  description:
    'Manage contacts, companies, deals, products, and activities across supported Zoho data centers.',
  metadata: {},
  config,
  auth
});
