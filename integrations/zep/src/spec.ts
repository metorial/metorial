import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'zep',
  name: 'Zep',
  description:
    'Context engineering platform providing persistent memory and knowledge graph capabilities for AI agents.',
  metadata: {},
  config,
  auth
});
