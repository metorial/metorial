import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'jigsawstack',
  name: 'Jigsawstack',
  description:
    'Search and scrape websites, process text and media, classify content, and generate vector embeddings with JigsawStack.',
  metadata: {},
  config,
  auth
});
