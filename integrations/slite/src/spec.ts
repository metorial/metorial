import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'slite',
  name: 'Slite',
  description:
    'AI-powered knowledge base for teams to create, organize, and share internal documentation with collaborative editing, AI-powered Q&A, and document verification workflows.',
  metadata: {},
  config,
  auth
});
