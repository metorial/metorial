import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'lemlist',
  name: 'Lemlist',
  description:
    'Manage outreach campaigns and their leads, inspect campaign sequences and statistics, read activity history and team credits, discover database filters and search for people, and manage current variable or contact opt-outs.',
  metadata: {},
  config,
  auth
});
