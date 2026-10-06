import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'wave',
  name: 'Wave',
  description:
    'Manage Wave businesses, customers, invoices, products, taxes and accounting records. API access depends on Wave permissions and subscription eligibility.',
  metadata: {},
  config,
  auth
});
