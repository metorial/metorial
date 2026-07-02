import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'piloterr',
  name: 'Piloterr',
  description:
    'Web scraping API platform with 50+ pre-built endpoints for extracting structured data from websites.',
  metadata: {},
  config,
  auth
});
