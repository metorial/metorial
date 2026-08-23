import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'metabase',
  name: 'Metabase',
  description:
    'Run queries and manage analytics content, metadata, access, sharing, and alerts in Metabase.',
  metadata: {},
  config,
  auth
});
