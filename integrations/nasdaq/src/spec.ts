import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'nasdaq',
  name: 'Nasdaq',
  description:
    'Query Nasdaq Data Link historical datasets and tables, prepare bulk downloads, and retrieve real-time or delayed equities, options, and index data from the Nasdaq Cloud REST API.',
  metadata: {},
  config,
  auth
});
