import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'influxdb-cloud',
  name: 'InfluxDB Cloud',
  description:
    'Managed time-series database platform for storing, querying, and analyzing high-velocity time-series data.',
  metadata: {},
  config,
  auth
});
