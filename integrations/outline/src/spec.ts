import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'outline',
  name: 'Outline',
  description:
    'Outline is a fast, collaborative knowledge base and wiki for teams. Manage documents, collections, users, groups, and comments.',
  metadata: {},
  config,
  auth
});
