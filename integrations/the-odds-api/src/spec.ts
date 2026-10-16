import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'the-odds-api',
  name: 'The Odds API',
  description:
    'Discover sports and events, retrieve betting odds and scores, and explore historical market snapshots.',
  metadata: {},
  config,
  auth
});
