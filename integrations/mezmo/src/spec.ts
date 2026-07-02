import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'mezmo',
  name: 'Mezmo',
  description:
    'Mezmo observability platform for log ingestion, search, alerting, and telemetry pipeline management.',
  metadata: {},
  config,
  auth
});
