import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'diffbot',
  name: 'Diffbot',
  description:
    'AI-powered web data extraction and knowledge graph platform for extracting structured data from web pages, searching a knowledge graph of billions of entities, and analyzing natural language text.',
  metadata: {},
  config,
  auth
});
