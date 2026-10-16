import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'influxdb-cloud',
  name: 'InfluxDB Cloud',
  description:
    'InfluxDB Cloud TSM/v2 tools for writing and querying time-series data, discovering resources, and managing scheduled data processing.',
  metadata: {},
  config,
  auth
});
