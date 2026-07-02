import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'serpapi',
  name: 'SerpApi',
  description:
    'Real-time search engine results API that extracts structured JSON data from Google, Bing, YouTube, Amazon, and 100+ other search engines and platforms.',
  metadata: {},
  config,
  auth
});
