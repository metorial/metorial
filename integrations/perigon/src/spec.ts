import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'perigon',
  name: 'Perigon',
  description:
    'Search news and story clusters, discover entities and media sources, query Wikipedia, and check connected account usage.',
  metadata: {},
  config,
  auth
});
