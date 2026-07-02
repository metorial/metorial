import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'loomio',
  name: 'Loomio',
  description:
    'Collaborative decision-making platform for group discussions, proposals, and polls with various voting methods.',
  metadata: {},
  config,
  auth
});
