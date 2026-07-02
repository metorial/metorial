import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'hightouch',
  name: 'Hightouch',
  description:
    'Data activation (reverse ETL) platform that syncs data from data warehouses to 200+ SaaS destinations like CRMs, ad platforms, and marketing tools.',
  metadata: {},
  config,
  auth
});
