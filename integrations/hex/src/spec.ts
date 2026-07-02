import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'hex',
  name: 'Hex',
  description:
    'Collaborative data workspace for building notebooks, data apps, and analytics projects using SQL and Python.',
  metadata: {},
  config,
  auth
});
