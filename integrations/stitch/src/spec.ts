import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'stitch',
  name: 'Stitch',
  description:
    'Cloud-based ETL service by Talend that replicates data from SaaS applications, databases, and other sources into data warehouses.',
  metadata: {},
  config,
  auth
});
