import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'semantic-scholar',
  name: 'Semantic Scholar',
  description:
    'Search and retrieve academic paper metadata, citation graphs, author profiles, and recommendations from scientific publications.',
  metadata: {},
  config,
  auth
});
