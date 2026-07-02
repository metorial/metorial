import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'hystruct',
  name: 'Hystruct',
  description:
    'AI-powered web scraping platform that extracts structured data from websites based on user-defined schemas.',
  metadata: {},
  config,
  auth
});
