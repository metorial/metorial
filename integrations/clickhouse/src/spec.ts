import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'clickhouse',
  name: 'ClickHouse',
  description:
    'Manage ClickHouse Cloud organizations, services, and infrastructure via the REST API.',
  metadata: {},
  config,
  auth
});
