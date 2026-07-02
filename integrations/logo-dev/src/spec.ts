import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'logodev',
  name: 'Logo.dev',
  description:
    'Retrieve company logos, brand colors, social links, and enrichment data from tens of millions of companies. Look up logos by domain, stock ticker, crypto symbol, ISIN, or company name, and search for domains by brand name.',
  metadata: {},
  config,
  auth
});
