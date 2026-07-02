import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'api-ninjas',
  name: 'API Ninjas',
  description:
    'Access 100+ production-ready REST APIs for finance, AI, places, text processing, health, entertainment, transportation, and more through a single unified interface.',
  metadata: {},
  config,
  auth
});
