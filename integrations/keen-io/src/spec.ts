import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'keenio',
  name: 'Keen.io',
  description:
    'Event streaming and analytics platform for collecting, storing, and analyzing custom event data via API. Built on Apache Kafka, Storm, and Cassandra.',
  metadata: {},
  config,
  auth
});
