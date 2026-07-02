import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'zyte-api',
  name: 'Zyte API',
  description:
    'Web scraping API that handles anti-bot bypassing, browser rendering, and AI-powered data extraction from any website.',
  metadata: {},
  config,
  auth
});
