import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'apiverve',
  name: 'APIVerve',
  description:
    'Access 300+ utility, data, and AI-powered APIs through a single unified interface. Covers data validation, text analysis, finance, weather, geography, AI/computer vision, domain data, and more.',
  metadata: {},
  config,
  auth
});
