import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'agility-cms',
  name: 'Agility CMS',
  description:
    'Cloud-based headless CMS for managing and delivering structured content, pages, and media assets via REST, GraphQL, and Management APIs.',
  metadata: {},
  config,
  auth
});
