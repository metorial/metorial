import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'keyword',
  name: 'Keyword',
  description:
    'Keyword rank tracking and SERP analytics platform for SEO professionals. Track keyword positions across Google search results, monitor AI search visibility across ChatGPT, Perplexity, AI Mode, and Gemini, and analyze share of voice and competitor rankings.',
  metadata: {},
  config,
  auth
});
