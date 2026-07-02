import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'needle',
  name: 'Needle',
  description:
    'Knowledge management and RAG platform that indexes documents into searchable collections and provides AI-powered semantic search across them.',
  metadata: {},
  config,
  auth
});
