import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export const spec = SlateSpecification.create({
  key: 'ksef-gov-pl',
  name: 'KSeF',
  description:
    'Search, download, and submit Polish electronic invoices through KSeF API v2 and track official processing receipts.',
  metadata: {},
  config,
  auth
});
