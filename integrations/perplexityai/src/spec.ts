import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'perplexity-ai',
  name: 'Perplexity AI',
  description:
    'AI-powered answer engine providing real-time, web-grounded responses with citations. Offers search-augmented chat completions, raw web search, multi-provider LLM access through the Agent API, and text embeddings.',
  metadata: {},
  config,
  auth
});
