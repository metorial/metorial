import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'netsuite',
  name: 'NetSuite',
  description:
    'Oracle NetSuite cloud ERP platform integration for managing records, financial data, orders, inventory, customers, and vendors via REST API and SuiteQL.',
  metadata: {},
  config,
  auth
});
