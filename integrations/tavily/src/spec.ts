import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'tavily',
  name: 'Tavily',
  description:
    'AI-optimized search engine and web data API for LLMs and RAG workflows. Provides web search, content extraction, website crawling, site mapping, and automated research capabilities.',
  metadata: {},
  config,
  auth
});
