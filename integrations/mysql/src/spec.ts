import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'mysql',
  name: 'MySQL',
  description:
    'Connect to MySQL databases to query, insert, update, and delete data, manage schemas and tables, and monitor table changes.',
  metadata: {},
  config,
  auth
});
