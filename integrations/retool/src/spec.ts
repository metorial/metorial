import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'retool',
  name: 'Retool',
  description:
    'Read Retool organization, app, resource, and workflow metadata and manage supported users, groups, folders, Spaces, and permissions with a scoped API access token.',
  metadata: {},
  config,
  auth
});
