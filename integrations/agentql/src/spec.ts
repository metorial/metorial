import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'agentql',
  name: 'AgentQL',
  description:
    'AI-powered web data extraction and automation platform. Extract structured JSON data from web pages, PDFs, and images using natural language or structured queries. Create remote browser sessions with CDP access for browser automation.',
  metadata: {},
  config,
  auth
});
