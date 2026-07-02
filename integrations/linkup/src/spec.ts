import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'linkup',
  name: 'Linkup',
  description:
    'Search the web using natural language queries and retrieve real-time content for AI grounding. Supports standard and deep search, structured data extraction, and webpage fetching.',
  metadata: {},
  config,
  auth
});
