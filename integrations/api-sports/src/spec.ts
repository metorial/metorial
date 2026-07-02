import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'api-sports',
  name: 'API Sports',
  description:
    'Access real-time and historical sports data across 12 sports including football, basketball, baseball, hockey, and more. Retrieve fixtures, live scores, standings, team and player statistics, odds, and predictions.',
  metadata: {},
  config,
  auth
});
