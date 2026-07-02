import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'openperplex',
  name: 'Openperplex',
  description:
    'AI-powered web search and content retrieval API with LLM-generated answers, multi-language support, and web content extraction capabilities.',
  metadata: {},
  config,
  auth
});
