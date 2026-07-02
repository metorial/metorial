import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'v0',
  name: 'V0',
  description:
    "Vercel's AI-powered web application builder that turns natural language prompts into production-ready code.",
  metadata: {},
  config,
  auth
});
