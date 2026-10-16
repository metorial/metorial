import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'currents-api',
  name: 'Currents API',
  description:
    'Retrieve current news feeds and search articles with date, publisher, language, country, and category filters. Discover filter codes and check the connected API key.',
  metadata: {},
  config,
  auth
});
