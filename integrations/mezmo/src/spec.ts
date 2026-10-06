import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'mezmo',
  name: 'Mezmo',
  description:
    'Mezmo Log Analysis for log ingestion, search, exports, views, alerts, boards, exclusion rules, usage and archiving.',
  metadata: {},
  config,
  auth
});
