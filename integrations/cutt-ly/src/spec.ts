import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'cuttly',
  name: 'Cutt.ly',
  description:
    'Create and manage short links and retrieve click analytics with the Cutt.ly Regular or Team API.',
  metadata: {},
  config,
  auth
});
