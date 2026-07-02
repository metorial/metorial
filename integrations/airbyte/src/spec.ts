import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'airbyte',
  name: 'Airbyte',
  description:
    'Open-source data integration platform for syncing data from sources (APIs, databases, files) to destinations (data warehouses, lakes, databases) with 600+ pre-built connectors.',
  metadata: {},
  config,
  auth
});
