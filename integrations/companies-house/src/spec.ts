import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'companies-house',
  name: 'Companies House',
  description:
    'Search and inspect companies, officers, filings, charges, insolvency records, and people with significant control in the UK public register.',
  metadata: {},
  config,
  auth
});
