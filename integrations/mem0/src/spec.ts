import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'mem0',
  name: 'Mem0',
  description:
    'Memory layer for AI applications that enables persistent storage, retrieval, and management of contextual memories across users, agents, and sessions.',
  metadata: {},
  config,
  auth
});
