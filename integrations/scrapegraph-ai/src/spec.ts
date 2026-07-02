import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'scrapegraph-ai',
  name: 'ScrapeGraph AI',
  description:
    'AI-powered web scraping API that uses large language models to extract structured data from websites using natural language prompts.',
  metadata: {},
  config,
  auth
});
