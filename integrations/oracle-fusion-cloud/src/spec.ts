import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'oracle-fusion-cloud',
  name: 'Oracle Fusion Cloud',
  description:
    'Explore Oracle Fusion Cloud financials, purchasing, worker assignments, and inventory, and manage eligible invoices and purchasing drafts.',
  metadata: {},
  config,
  auth
});
