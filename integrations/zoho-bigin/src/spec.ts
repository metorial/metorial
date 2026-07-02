import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'zoho-bigin',
  name: 'Zoho Bigin',
  description:
    'Lightweight CRM for small businesses with pipeline-centric sales management. Manage contacts, companies, deals, products, and activities.',
  metadata: {},
  config,
  auth
});
